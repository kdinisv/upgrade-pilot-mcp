import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We test the truncation function in isolation
import { truncateOutput } from "../src/lib/validation.js";

describe("truncateOutput", () => {
  it("should return short text unchanged", () => {
    const text = "short output";
    assert.strictEqual(truncateOutput(text, 100), text);
  });

  it("should return text at exact limit unchanged", () => {
    const text = "a".repeat(12000);
    assert.strictEqual(truncateOutput(text, 12000), text);
  });

  it("should preserve head and tail of long text", () => {
    const head = "ERROR_AT_START ".repeat(400); // ~6000 chars
    const middle = "x".repeat(10000);
    const tail = " RESULT_AT_END".repeat(400); // ~5600 chars
    const full = head + middle + tail;

    const result = truncateOutput(full, 12000);
    assert.ok(result.length <= 12000, `length ${result.length} exceeds 12000`);
    assert.ok(
      result.startsWith("ERROR_AT_START"),
      "should preserve start of output",
    );
    assert.ok(
      result.endsWith("RESULT_AT_END"),
      "should preserve end of output",
    );
    assert.ok(
      result.includes("[TRUNCATED]"),
      "should include truncation marker",
    );
  });

  it("should not include marker for non-truncated text", () => {
    const text = "hello world";
    const result = truncateOutput(text, 12000);
    assert.ok(!result.includes("[TRUNCATED]"));
  });
});
