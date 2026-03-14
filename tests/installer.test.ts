import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInstallCommand } from "../src/lib/installer.js";

describe("buildInstallCommand", () => {
  it("should build npm install command", () => {
    const cmd = buildInstallCommand("npm", [
      { name: "react", version: "19.0.0" },
      { name: "react-dom", version: "19.0.0" },
    ]);
    assert.equal(cmd.bin, "npm");
    assert.deepStrictEqual(cmd.args, [
      "install",
      "react@19.0.0",
      "react-dom@19.0.0",
    ]);
  });

  it("should build yarn add command", () => {
    const cmd = buildInstallCommand("yarn", [
      { name: "next", version: "15.0.0" },
    ]);
    assert.equal(cmd.bin, "yarn");
    assert.deepStrictEqual(cmd.args, ["add", "next@15.0.0"]);
  });

  it("should build pnpm add command", () => {
    const cmd = buildInstallCommand("pnpm", [
      { name: "vite", version: "6.0.0" },
    ]);
    assert.equal(cmd.bin, "pnpm");
    assert.deepStrictEqual(cmd.args, ["add", "vite@6.0.0"]);
  });

  it("should add --save-dev flag for dev dependencies", () => {
    const cmd = buildInstallCommand("npm", [
      { name: "eslint", version: "9.0.0", dev: true },
    ]);
    assert.deepStrictEqual(cmd.args, [
      "install",
      "--save-dev",
      "eslint@9.0.0",
    ]);
  });

  it("should separate prod and dev installs for yarn", () => {
    const cmd = buildInstallCommand("yarn", [
      { name: "eslint", version: "9.0.0", dev: true },
    ]);
    assert.deepStrictEqual(cmd.args, ["add", "--dev", "eslint@9.0.0"]);
  });
});
