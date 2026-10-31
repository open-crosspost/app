/**
 * FRAMEWORK-OWNED — reconciled from the parent template by `bos upgrade`.
 * Local edits are allowed: on the next upgrade the template version wins and your
 * copy is backed up under `.bos/sync-backup/`. To make a change permanent, file an
 * issue: https://github.com/NEARBuilders/everything-dev/issues
 *
 * Minimal local override of the core-UI build factory: delegates the shared-deps
 * spec, MF exposes, plugins, CSS handling, and ports to `createCoreUiRsbuildConfig`
 * (everything-dev#681 — a hand-rolled shared list here drifted from the platform
 * remotes and degraded plugin UI composition). The only child delta is the
 * X_CONNECTOR_PROJECT build define.
 */

import { defineConfig } from "@rsbuild/core";
import { createCoreUiRsbuildConfig } from "every-plugin/build/ui";
import { readAuthoredConfigInput } from "everything-dev/config";

const X_CONNECTOR_DEFAULT = "connectors.outlayer.near/x";

export default defineConfig(async () => {
  const config = createCoreUiRsbuildConfig((await readAuthoredConfigInput()) ?? undefined);
  const extraDefine = {
    "import.meta.env.X_CONNECTOR_PROJECT": JSON.stringify(
      process.env.X_CONNECTOR_PROJECT ?? X_CONNECTOR_DEFAULT,
    ),
  };
  for (const environment of Object.values(config.environments ?? {})) {
    environment.source ??= {};
    environment.source.define = { ...environment.source.define, ...extraDefine };
  }
  return config;
});
