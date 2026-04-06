import { commandCatalog } from "./catalog";

export function printHelp() {
  process.stdout.write(`everything-dev commands\n\n`);

  for (const command of commandCatalog) {
    process.stdout.write(`  everything-dev ${command.commandPath.join(" ")}`);
    process.stdout.write(command.meta.longRunning ? " (long running)" : "");
    process.stdout.write(`\n    ${command.summary}\n`);
  }

  process.stdout.write(`\n'bos' is an alias for 'everything-dev'.\n`);
}
