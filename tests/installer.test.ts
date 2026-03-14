import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInstallCommand } from "../src/lib/installer.js";

describe("buildInstallCommand", () => {
  it("should build npm install command", () => {
    const cmds = buildInstallCommand("npm", [
      { name: "react", version: "19.0.0" },
      { name: "react-dom", version: "19.0.0" },
    ]);
    assert.equal(cmds.length, 1);
    assert.equal(cmds[0]!.bin, "npm");
    assert.deepStrictEqual(cmds[0]!.args, [
      "install",
      "react@19.0.0",
      "react-dom@19.0.0",
    ]);
  });

  it("should build yarn add command", () => {
    const cmds = buildInstallCommand("yarn", [
      { name: "next", version: "15.0.0" },
    ]);
    assert.equal(cmds.length, 1);
    assert.equal(cmds[0]!.bin, "yarn");
    assert.deepStrictEqual(cmds[0]!.args, ["add", "next@15.0.0"]);
  });

  it("should build pnpm add command", () => {
    const cmds = buildInstallCommand("pnpm", [
      { name: "vite", version: "6.0.0" },
    ]);
    assert.equal(cmds.length, 1);
    assert.equal(cmds[0]!.bin, "pnpm");
    assert.deepStrictEqual(cmds[0]!.args, ["add", "vite@6.0.0"]);
  });

  it("should add --save-dev flag for dev dependencies", () => {
    const cmds = buildInstallCommand("npm", [
      { name: "eslint", version: "9.0.0", dev: true },
    ]);
    assert.equal(cmds.length, 1);
    assert.deepStrictEqual(cmds[0]!.args, [
      "install",
      "--save-dev",
      "eslint@9.0.0",
    ]);
  });

  it("should split mixed dev and prod into separate commands", () => {
    const cmds = buildInstallCommand("yarn", [
      { name: "react", version: "19.0.0" },
      { name: "eslint", version: "9.0.0", dev: true },
    ]);
    assert.equal(cmds.length, 2);
    assert.deepStrictEqual(cmds[0]!.args, ["add", "react@19.0.0"]);
    assert.deepStrictEqual(cmds[1]!.args, ["add", "--dev", "eslint@9.0.0"]);
  });
});
