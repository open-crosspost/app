import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface MockFastKvRecord {
  current_account_id: string;
  predecessor_id: string;
  key: string;
  value: unknown;
}

export async function startMockFastKvServer(records: MockFastKvRecord[]) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST" || !req.url) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const url = new URL(req.url, "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] !== "v0" || parts[1] !== "latest") {
      res.statusCode = 404;
      res.end();
      return;
    }

    const body = await readJsonBody(req);
    const currentAccountId = parts[2];
    const predecessorId = parts[3];
    let entries = records.filter((entry) => entry.current_account_id === currentAccountId);

    if (predecessorId) {
      entries = entries.filter((entry) => entry.predecessor_id === predecessorId);
    }

    if (typeof body?.key === "string") {
      entries = entries.filter((entry) => entry.key === body.key);
    }

    if (typeof body?.key_prefix === "string") {
      const keyPrefix = body.key_prefix;
      entries = entries.filter((entry) => entry.key.startsWith(keyPrefix));
    }

    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ entries }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start mock FastKV server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}
