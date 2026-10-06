import assert from "node:assert/strict";
import test from "node:test";
import { rotateValues } from "./scan-utils";

test("rotateValues changes the first scanned value without losing entries", () => {
  assert.deepEqual(rotateValues(["a", "b", "c"], 1), ["b", "c", "a"]);
  assert.deepEqual(rotateValues(["a", "b", "c"], 4), ["b", "c", "a"]);
});

test("rotateValues handles empty and negative offsets", () => {
  assert.deepEqual(rotateValues([], 3), []);
  assert.deepEqual(rotateValues(["a", "b", "c"], -1), ["c", "a", "b"]);
});
