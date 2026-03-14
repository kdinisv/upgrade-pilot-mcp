import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterGuidesByVersion } from "../src/lib/breaking-changes.js";

describe("filterGuidesByVersion", () => {
  const guides = [
    {
      title: "Migrate 7→8",
      url: "https://example.com/7-8",
      fromMajor: 7,
      toMajor: 8,
    },
    {
      title: "Migrate 8→9",
      url: "https://example.com/8-9",
      fromMajor: 8,
      toMajor: 9,
    },
    { title: "General guide", url: "https://example.com/general" },
  ];

  it("should return only relevant guides for 8→9 transition", () => {
    const filtered = filterGuidesByVersion(guides, 8, 9);
    assert.equal(filtered.length, 2); // 8→9 + general (no fromMajor)
    assert.ok(filtered.some((g) => g.title === "Migrate 8→9"));
    assert.ok(filtered.some((g) => g.title === "General guide"));
    assert.ok(!filtered.some((g) => g.title === "Migrate 7→8"));
  });

  it("should return all guides for multi-major transition 7→9", () => {
    const filtered = filterGuidesByVersion(guides, 7, 9);
    assert.equal(filtered.length, 3);
  });

  it("should return all guides when versions are null", () => {
    const filtered = filterGuidesByVersion(guides, null, null);
    assert.equal(filtered.length, 3);
  });

  it("should return all guides when toMajor is null", () => {
    const filtered = filterGuidesByVersion(guides, 8, null);
    assert.equal(filtered.length, 3);
  });
});
