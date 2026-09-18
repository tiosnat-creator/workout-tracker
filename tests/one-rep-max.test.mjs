import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadOneRepMax() {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/oneRepMax.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports },
  );
  return exports;
}

test("percentage weights are rounded to the nearest half kilogram", () => {
  const { weightFromPercentage } = loadOneRepMax();
  assert.equal(weightFromPercentage(137, 72.5), 99.5);
  assert.equal(weightFromPercentage(100, 80), 80);
});

test("percentage weights reject unusable inputs", () => {
  const { weightFromPercentage } = loadOneRepMax();
  assert.equal(weightFromPercentage(0, 80), 0);
  assert.equal(weightFromPercentage(100, 0), 0);
  assert.equal(weightFromPercentage(Number.NaN, 80), 0);
});
