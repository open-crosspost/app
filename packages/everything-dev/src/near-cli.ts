import { spawn } from "node:child_process";
import { Effect } from "effect";

export interface NearTransactionConfig {
  account: string;
  contract: string;
  method: string;
  argsBase64: string;
  network?: "mainnet" | "testnet";
  privateKey?: string;
  gas?: string;
  deposit?: string;
}

export interface NearTransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

const NEAR_CLI_VERSION = "0.23.5";
const INSTALLER_URL = `https://github.com/near/near-cli-rs/releases/download/v${NEAR_CLI_VERSION}/near-cli-rs-installer.sh`;

export class NearCliNotFoundError extends Error {
  readonly _tag = "NearCliNotFoundError";
  constructor() {
    super("NEAR CLI not found");
  }
}

export class NearCliInstallError extends Error {
  readonly _tag = "NearCliInstallError";
  constructor(message: string) {
    super(`Failed to install NEAR CLI: ${message}`);
  }
}

export class NearTransactionError extends Error {
  readonly _tag = "NearTransactionError";
  constructor(message: string) {
    super(message);
  }
}

const checkNearCliInstalled = Effect.tryPromise({
  try: async () => {
    return await new Promise<boolean>((resolve) => {
      const proc = spawn("near", ["--version"], { shell: true, stdio: "pipe" });
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  },
  catch: () => new Error("Failed to check NEAR CLI"),
});

const installNearCli = Effect.tryPromise({
  try: async () => {
    return await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "sh",
        ["-c", `curl --proto '=https' --tlsv1.2 -LsSf ${INSTALLER_URL} | sh`],
        {
          stdio: "inherit",
          shell: true,
        },
      );

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new NearCliInstallError(`Installer exited with code ${code}`));
      });
      proc.on("error", (err) => reject(new NearCliInstallError(err.message)));
    });
  },
  catch: (error) => error as Error,
});

export const ensureNearCli = Effect.gen(function* () {
  const isInstalled = yield* checkNearCliInstalled;
  if (isInstalled) return;

  if (process.env.BOS_INSTALL_NEAR_CLI === "true") {
    yield* installNearCli;
    return;
  }

  console.log();
  console.log("  NEAR CLI not found");

  console.log();
  console.log(`  To install manually: curl --proto '=https' --tlsv1.2 -LsSf ${INSTALLER_URL} | sh`);
  console.log();
  yield* Effect.fail(new NearCliNotFoundError());
});

export const executeTransaction = (
  config: NearTransactionConfig,
): Effect.Effect<NearTransactionResult, Error> =>
  Effect.gen(function* () {
    const gas = (config.gas || "300Tgas").replace(/\s+/g, "");
    const deposit = (config.deposit || "0NEAR").replace(/\s+/g, "");
    const network = config.network || (config.account.endsWith(".testnet") ? "testnet" : "mainnet");

    const args = [
      "contract",
      "call-function",
      "as-transaction",
      config.contract,
      config.method,
      "base64-args",
      config.argsBase64,
      "prepaid-gas",
      gas,
      "attached-deposit",
      deposit,
      "sign-as",
      config.account,
      "network-config",
      network,
    ];

    if (config.privateKey) {
      args.push("sign-with-plaintext-private-key", config.privateKey, "send");
    }

    const output = yield* Effect.tryPromise({
      try: async () => {
        return await new Promise<string>((resolve, reject) => {
          const proc = spawn("near", args, {
            shell: true,
            stdio: ["inherit", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";

          proc.stdout?.on("data", (data) => {
            const text = data.toString();
            stdout += text;
            process.stdout.write(text);
          });

          proc.stderr?.on("data", (data) => {
            const text = data.toString();
            stderr += text;
          });

          proc.on("close", (code) => {
            const combined = `${stdout}\n${stderr}`;
            const txHashMatch =
              combined.match(/Transaction ID:\s*([A-Za-z0-9]+)/i) ||
              combined.match(/([A-HJ-NP-Za-km-z1-9]{43,44})/);
            const softSuccess =
              Boolean(txHashMatch?.[1]) &&
              /CodeDoesNotExist/i.test(combined) &&
              /Transaction failed/i.test(combined);

            if (code === 0 || softSuccess) resolve(combined);
            else reject(new NearTransactionError(stderr || `Transaction failed with code ${code}`));
          });

          proc.on("error", (err) => reject(new NearTransactionError(err.message)));
        });
      },
      catch: (error) => error as Error,
    });

    const txHashMatch =
      output.match(/Transaction ID:\s*([A-Za-z0-9]+)/i) ||
      output.match(/([A-HJ-NP-Za-km-z1-9]{43,44})/);

    return {
      success: true,
      txHash: txHashMatch?.[1] || "unknown",
    };
  });
