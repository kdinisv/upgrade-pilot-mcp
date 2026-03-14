import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ValidationCommandResult } from "../src/types.js";
import { quietValidation } from "../src/lib/compact.js";

const allPassed: ValidationCommandResult[] = [
  {
    kind: "types",
    command: "npx tsc --noEmit",
    exitCode: 0,
    status: "passed",
    stdout: "lots of output...",
    stderr: "",
  },
  {
    kind: "lint",
    command: "npm run lint",
    exitCode: 0,
    status: "passed",
    stdout: "even more output...",
    stderr: "",
  },
  {
    kind: "test",
    command: "npm test",
    exitCode: null,
    status: "skipped",
    stdout: "",
    stderr: "",
    reason: "No test script.",
  },
];

const hasFail: ValidationCommandResult[] = [
  {
    kind: "types",
    command: "npx tsc --noEmit",
    exitCode: 1,
    status: "failed",
    stdout: "",
    stderr: "src/index.ts(5,3): error TS2322",
  },
  {
    kind: "lint",
    command: "npm run lint",
    exitCode: 0,
    status: "passed",
    stdout: "ok",
    stderr: "",
  },
];

describe("quietValidation", () => {
  it("should return summary string when all passed/skipped", () => {
    const result = quietValidation(allPassed);
    assert.equal(typeof result, "object");
    assert.equal((result as any).allPassed, true);
    assert.ok((result as any).summary.includes("types"));
    assert.ok((result as any).summary.includes("lint"));
    assert.ok((result as any).summary.includes("test"));
  });

  it("should return full compact array when any check failed", () => {
    const result = quietValidation(hasFail);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 2);
    assert.equal((result as any[])[0].status, "failed");
  });
});
