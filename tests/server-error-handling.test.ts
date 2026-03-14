import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We test the error-wrapping logic that server.ts uses for tool handlers.
// The function should catch thrown errors and return MCP-compliant error results.

interface CallToolResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

// Simulates the safeTool wrapper pattern
function safeTool(
  fn: () => Promise<unknown>,
): Promise<CallToolResult> {
  return fn()
    .then((payload) => ({
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: { result: payload },
    }))
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true as const,
      };
    });
}

describe("tool handler error wrapping", () => {
  it("should return normal result on success", async () => {
    const result = await safeTool(async () => ({ ok: true }));
    assert.strictEqual(result.isError, undefined);
    assert.strictEqual(result.content[0]!.type, "text");
    assert.ok(result.content[0]!.text.includes('"ok": true'));
  });

  it("should catch thrown Error and return isError: true", async () => {
    const result = await safeTool(async () => {
      throw new Error("file not found");
    });
    assert.strictEqual(result.isError, true);
    assert.strictEqual(result.content[0]!.text, "file not found");
  });

  it("should catch non-Error throws and return isError: true", async () => {
    const result = await safeTool(async () => {
      throw "string error";
    });
    assert.strictEqual(result.isError, true);
    assert.strictEqual(result.content[0]!.text, "string error");
  });

  it("should not expose stack traces in error result", async () => {
    const result = await safeTool(async () => {
      throw new Error("ENOENT: no such file");
    });
    assert.strictEqual(result.isError, true);
    assert.ok(!result.content[0]!.text.includes("at "));
    assert.strictEqual(result.content[0]!.text, "ENOENT: no such file");
  });
});
