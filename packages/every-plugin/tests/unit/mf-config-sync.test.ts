import { describe, expect, it } from "vitest";
import { MF_SHARED_DEPS, PLUGIN_VERSION } from "../../src/runtime/mf-config";

describe("mf-config sync", () => {
  let pkg: typeof import("../../package.json");
  try {
    pkg = require("../../package.json");
  } catch {
    throw new Error("Could not load package.json — version sync cannot be verified");
  }

  it("versions match package.json", () => {
    expect(PLUGIN_VERSION).toBe(pkg.version);
    expect(MF_SHARED_DEPS["every-plugin"].version).toBe(pkg.version);
    expect(MF_SHARED_DEPS.effect.version).toBe(pkg.peerDependencies.effect);
    expect(MF_SHARED_DEPS.zod.version).toBe(pkg.peerDependencies.zod);
  });

  it("all deps share identical config", () => {
    const expected = {
      singleton: true,
      requiredVersion: false,
      strictVersion: false,
      eager: false,
    };
    for (const dep of Object.values(MF_SHARED_DEPS)) {
      expect(dep.shareConfig).toEqual(expected);
    }
  });
});
