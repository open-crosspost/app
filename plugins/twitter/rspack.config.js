import {
  EmitPluginManifest,
  EveryPluginBuild,
  FixMfDataUriPlugin,
} from "every-plugin/build/rspack";

const shouldDeploy = process.env.DEPLOY === "true";

const baseConfig = {
  devtool: shouldDeploy ? false : "source-map",
  plugins: [
    new EmitPluginManifest(),
    new EveryPluginBuild({ dts: false }),
    new FixMfDataUriPlugin(),
  ],
  infrastructureLogging: {
    level: "error",
  },
  stats: "errors-warnings",
};

export default baseConfig;
