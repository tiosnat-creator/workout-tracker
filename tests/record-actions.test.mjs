import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadActions(prisma, revalidated = []) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/actions.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Date,
      Set,
      require: (name) => {
        const mocks = {
          "next/cache": {
            revalidatePath: (path) => revalidated.push(path),
          },
          "next/navigation": {
            redirect: (path) => {
              throw new Error(path);
            },
          },
          "@/lib/roles": { requireUserId: async () => "signed-in-user" },
          "@/lib/prisma": { prisma },
          "@prisma/client": {
            Prisma: { PrismaClientKnownRequestError: class extends Error {} },
          },
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

test("set edits are scoped to the signed-in user's session and refresh both lifts", async () => {
  let updated;
  const revalidated = [];
  const actions = loadActions(
    {
      setEntry: {
        findFirst: async ({ where }) => {
          assert.deepEqual(plain(where), {
            id: "set-1",
            sessionId: "session-1",
            session: { userId: "signed-in-user" },
          });
          return { id: "set-1", sessionId: "session-1", liftId: "old-lift" };
        },
        update: async ({ where, data }) => {
          assert.deepEqual(plain(where), { id: "set-1" });
          updated = data;
        },
      },
      lift: {
        findFirst: async ({ where }) => {
          assert.deepEqual(plain(where), { id: "new-lift", userId: "signed-in-user" });
          return { id: "new-lift" };
        },
      },
    },
    revalidated,
  );

  await assert.rejects(
    actions.updateSetEntry(
      "set-1",
      "session-1",
      form({ liftId: "new-lift", weight: "82.5", reps: "3", rpe: "8.5", notes: "Strong" }),
    ),
    /\/sessions\/session-1\?saved=/,
  );
  assert.deepEqual(plain(updated), {
    liftId: "new-lift",
    weight: 82.5,
    reps: 3,
    rpe: 8.5,
    notes: "Strong",
  });
  assert.deepEqual(revalidated, [
    "/sessions/session-1",
    "/lifts/old-lift",
    "/lifts/new-lift",
    "/",
  ]);
});

test("record edits stop before writing when the record is not owned by the user", async () => {
  let writes = 0;
  const actions = loadActions({
    bodyWeightEntry: {
      findFirst: async ({ where }) => {
        assert.deepEqual(plain(where), { id: "entry-1", userId: "signed-in-user" });
        return null;
      },
      update: async () => writes++,
    },
  });

  await assert.rejects(
    actions.updateBodyWeightEntry(
      "entry-1",
      form({ weight: "75.2", date: "2026-09-18", notes: "" }),
    ),
    /Entry not found/,
  );
  assert.equal(writes, 0);
});

test("manual 1RM edits validate ownership and update all editable fields", async () => {
  let updated;
  const actions = loadActions({
    oneRepMaxEntry: {
      findFirst: async ({ where }) => {
        assert.deepEqual(plain(where), {
          id: "max-1",
          liftId: "lift-1",
          userId: "signed-in-user",
        });
        return { id: "max-1" };
      },
      update: async ({ data }) => {
        updated = data;
      },
    },
  });

  await assert.rejects(
    actions.updateManualOneRepMax(
      "max-1",
      "lift-1",
      form({ weight: "110", date: "2026-09-17", notes: "Meet" }),
    ),
    /\/lifts\/lift-1\?saved=/,
  );
  assert.equal(updated.weight, 110);
  assert.equal(updated.date.toISOString(), "2026-09-17T00:00:00.000Z");
  assert.equal(updated.notes, "Meet");
});
