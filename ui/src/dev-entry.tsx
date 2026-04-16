import "./styles.css";
import type { ClientRuntimeConfig } from "everything-dev/types";
import { hydrate } from "./hydrate";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showDevError(err: unknown) {
  const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
  document.body.innerHTML = `<main style="font-family:system-ui;padding:2rem;max-width:42rem;">
<h1>UI did not start</h1>
<pre style="white-space:pre-wrap;background:#f5f5f5;padding:1rem;">${escapeHtml(message)}</pre>
<p>If the browser shows <strong>connection refused</strong> for port 3002, the UI dev server is not running—start <code>bun run dev</code> from the repo root and keep it open. Prefer <code>http://localhost:3000</code> (host shell) instead of this port when possible.</p>
<p>For this page only, set <code>PUBLIC_DEV_HOST_URL</code> (build-time) to your host origin if it is not <code>http://localhost:3000</code>.</p>
</main>`;
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  if (!window.__RUNTIME_CONFIG__) {
    const hostUrl =
      (import.meta.env as { PUBLIC_DEV_HOST_URL?: string }).PUBLIC_DEV_HOST_URL?.trim() ||
      "http://localhost:3000";
    const account = "dev.everything.near";
    const cfg: ClientRuntimeConfig = {
      env: "development",
      account,
      networkId: account.endsWith(".testnet") ? "testnet" : "mainnet",
      hostUrl,
      assetsUrl: window.location.origin,
      apiBase: "/api",
      rpcBase: "/api/rpc",
      repository: "https://github.com/nearbuilders/everything-dev",
    };
    window.__RUNTIME_CONFIG__ = cfg;
  }
  void hydrate().catch(showDevError);
}
