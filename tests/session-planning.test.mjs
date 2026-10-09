import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadActions(prisma, revalidated = []) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/actions.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      Date,
      Set,
      require: (name) => {
        const mocks = {
          "next/cache": { revalidatePath: (path) => revalidated.push(path) },
          "next/navigation": { redirect: (path) => { throw new Error(path); } },
          "@/lib/roles": { requireUserId: async () => "signed-in-user" },
          "@/lib/prisma": { prisma },
          "@prisma/client": { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
          "@/lib/action-errors": {},
        };
        if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
        return mocks[name];
      },
    },
  );
  return exports;
}

const form = (values) => ({ get: (name) => values[name] ?? null });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("new sessions are created as plans without overwriting workout notes", async () => {
  let created;
  const actions = loadActions({
    session: {
      create: async ({ data }) => {
        created = data;
        return { id: "session-1" };
      },
    },
  });

  await assert.rejects(
    actions.createSession(form({ date: "2026-09-20", planNotes: "Heavy pulls" })),
    /\/sessions\/session-1/,
  );
  assert.deepEqual(plain(created), {
    userId: "signed-in-user",
    date: "2026-09-20T00:00:00.000Z",
    planNotes: "Heavy pulls",
    type: "OLYMPIC_LIFTING",
    workout: null,
    results: null,
    status: "PLANNED",
  });
});

test("planned exercises validate session and lift ownership before writing", async () => {
  let created;
  const actions = loadActions({
    session: {
      findFirst: async ({ where }) => {
        assert.deepEqual(plain(where), {
          id: "session-1",
          userId: "signed-in-user",
          type: "OLYMPIC_LIFTING",
          status: "PLANNED",
        });
        return { id: "session-1" };
      },
    },
    lift: {
      findFirst: async ({ where }) => {
        assert.deepEqual(plain(where), { id: "lift-1", userId: "signed-in-user" });
        return { id: "lift-1" };
      },
    },
    plannedExercise: {
      count: async () => 2,
      create: async ({ data }) => { created = data; },
    },
  });

  await assert.rejects(
    actions.addPlannedExercise(
      "session-1",
      form({ liftId: "lift-1", sets: "4", reps: "3", weight: "90", notes: "Pause" }),
    ),
    /\/sessions\/session-1\?planned=/,
  );
  assert.deepEqual(plain(created), {
    sessionId: "session-1",
    liftId: "lift-1",
    sets: 4,
    reps: 3,
    weight: 90,
    notes: "Pause",
    order: 2,
  });
});

test("actual sets link to their plan while allowing a different lift and load", async () => {
  let created;
  const actions = loadActions({
    session: { findFirst: async () => ({ id: "session-1", status: "IN_PROGRESS" }) },
    lift: { findFirst: async () => ({ id: "variation-lift" }) },
    plannedExercise: {
      findFirst: async ({ where }) => {
        assert.deepEqual(plain(where), {
          id: "plan-1",
          sessionId: "session-1",
          session: { userId: "signed-in-user" },
        });
        return { id: "plan-1" };
      },
    },
    setEntry: {
      count: async () => 1,
      create: async ({ data }) => { created = data; },
    },
  });

  await actions.addSetEntry(
    "session-1",
    form({
      plannedExerciseId: "plan-1",
      liftId: "variation-lift",
      weight: "87.5",
      reps: "2",
      rpe: "9",
      notes: "Changed to hang variation",
    }),
  );
  assert.deepEqual(plain(created), {
    sessionId: "session-1",
    plannedExerciseId: "plan-1",
    liftId: "variation-lift",
    weight: 87.5,
    reps: 2,
    rpe: 9,
    notes: "Changed to hang variation",
    order: 1,
  });
});

test("actual work can only be logged while the session is in progress", async () => {
  let writes = 0;
  let status = "PLANNED";
  const actions = loadActions({
    session: { findFirst: async () => ({ id: "session-1", status }) },
    setEntry: { create: async () => writes++ },
  });

  await assert.rejects(
    actions.addSetEntry(
      "session-1",
      form({ liftId: "lift-1", weight: "50", reps: "3" }),
    ),
    /Start or reopen the workout/,
  );
  status = "COMPLETED";
  await assert.rejects(
    actions.addSetEntry(
      "session-1",
      form({ liftId: "lift-1", weight: "50", reps: "3" }),
    ),
    /Start or reopen the workout/,
  );
  assert.equal(writes, 0);
});

test("session lifecycle transitions are atomic and scoped to the signed-in user", async () => {
  let transition;
  const actions = loadActions({
    session: {
      updateMany: async ({ where, data }) => {
        transition = { where, data };
        return { count: 1 };
      },
    },
  });

  await assert.rejects(actions.startSession("session-1"), /\/sessions\/session-1\?started=/);
  assert.deepEqual(plain(transition.where), {
    id: "session-1",
    userId: "signed-in-user",
    status: "PLANNED",
  });
  assert.equal(transition.data.status, "IN_PROGRESS");
  assert.equal(transition.data.completedAt, null);
  assert.ok(transition.data.startedAt instanceof Date);
});

test("WOD creation preserves multiline text and permits results later", async () => {
  let created;
  const actions = loadActions({ session: { create: async ({ data }) => { created = data; return { id: "wod" }; } } });
  await assert.rejects(actions.createSession(form({ date: "2026-10-09", type: "WOD", workout: "3 rounds\n400 m run" })), /\/sessions\/wod/);
  assert.equal(created.type, "WOD");
  assert.equal(created.workout, "3 rounds\n400 m run");
  assert.equal(created.results, null);
  assert.equal(created.status, "PLANNED");
});

test("invalid types and empty WODs are rejected before writing", async () => {
  const actions = loadActions({});
  await assert.rejects(actions.createSession(form({ type: "OTHER" })), /Invalid session type/);
  await assert.rejects(actions.createSession(form({ type: "WOD", workout: "  " })), /workout is required/);
  await assert.rejects(actions.updateWodSession("wod", form({ workout: "\n" })), /workout is required/);
});

test("WOD results and lifecycle changes are saved together and scoped to owner and type", async () => {
  let change;
  const actions = loadActions({ session: { updateMany: async (args) => { change = args; return { count: 1 }; } } });
  await assert.rejects(actions.updateWodSession("wod", form({ workout: "Run\nRow", results: "12:30\nScaled", intent: "complete" })), /\/sessions\/wod\?saved=/);
  assert.deepEqual(plain(change.where), { id: "wod", userId: "signed-in-user", type: "WOD", status: "IN_PROGRESS" });
  assert.equal(change.data.results, "12:30\nScaled");
  assert.equal(change.data.status, "COMPLETED");
  assert.ok(change.data.completedAt instanceof Date);
});

test("missing or other-user WODs cannot be updated", async () => {
  const actions = loadActions({ session: { updateMany: async () => ({ count: 0 }) } });
  await assert.rejects(actions.updateWodSession("other-user-session", form({ workout: "Run" })), /WOD session not found/);
});

test("WOD sessions cannot receive structured lift sets", async () => {
  const actions = loadActions({ session: { findFirst: async () => ({ type: "WOD", status: "IN_PROGRESS" }) } });
  await assert.rejects(actions.addSetEntry("wod", form({ liftId: "lift", weight: "50", reps: "3" })), /free-text results/);
});
