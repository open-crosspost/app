export async function run(
  cmd: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
) {
  const proc = Bun.spawn({
    cmd: [cmd, ...args],
    cwd: options.cwd,
    env: options.env ? { ...(process.env as Record<string, string>), ...options.env } : process.env,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${exitCode}`);
  }
}
