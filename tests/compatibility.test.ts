import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkPeerCompatibility,
  type PeerCheckResult,
} from "../src/lib/compatibility.js";

describe("checkPeerCompatibility", () => {
  it("should detect no conflicts when peers are satisfied", async () => {
    const result = await checkPeerCompatibility([
      { name: "react", version: "19.0.0" },
      { name: "react-dom", version: "19.0.0" },
    ]);
    // react-dom@19 requires react@19 — should be compatible
    assert.ok(Array.isArray(result));
    const reactDom = result.find((r) => r.package === "react-dom");
    if (reactDom) {
      assert.equal(reactDom.compatible, true);
    }
  });

  it("should return peer info for each package", async () => {
    const result = await checkPeerCompatibility([
      { name: "react-dom", version: "19.0.0" },
    ]);
    assert.ok(result.length >= 1);
    assert.equal(result[0].package, "react-dom");
    assert.ok("peers" in result[0]);
  });

  it("should handle packages with no peers", async () => {
    const result = await checkPeerCompatibility([
      { name: "semver", version: "7.7.2" },
    ]);
    assert.ok(result.length >= 1);
    const sem = result.find((r) => r.package === "semver");
    assert.ok(sem);
    assert.equal(sem.compatible, true);
    assert.deepStrictEqual(sem.peers, {});
  });
});
