# Effect.TS Workflow Patterns

Reference for using Effect-TS in frontend workflows.

## When to Use Effect

**Use Effect for:**
- Multi-step workflows with dependencies
- Progress tracking across steps
- Cancellation and timeouts
- Retry logic with backoff
- Error handling and recovery
- Parallel execution with coordination

**Don't use Effect for:**
- Simple one-shot data fetching (use TanStack Query)
- Rendering logic
- Event handlers that just trigger queries

## Workflow: Multi-Target Publish

```typescript
// ui/src/features/publish/use-publish-flow.ts
import { Effect, Option } from "effect";

interface PublishTarget {
  spaceId: string;
  slug: string;
  featuredRank?: number;
  attrs?: object;
}

interface PublishResult {
  target: PublishTarget;
  success: boolean;
  error?: string;
}

function createPublishProgram(
  thingId: string,
  targets: PublishTarget[],
  api: ApiClient
) {
  return Effect.gen(function* () {
    // Stage 1: Validate permissions for all targets
    const permissionChecks = yield* Effect.all(
      targets.map((target) =>
        Effect.tryPromise(() =>
          api["permissions.check"]({
            resource: { kind: "space", id: target.spaceId },
            action: "publish",
          })
        ).pipe(
          Effect.map((result) => ({ target, allowed: result.allowed })),
          Effect.catchAll((error) =>
            Effect.succeed({ target, allowed: false, error: String(error) })
          )
        )
      ),
      { concurrency: 3 } // Check up to 3 in parallel
    );

    const rejected = permissionChecks.filter((c) => !c.allowed);
    if (rejected.length > 0) {
      yield* Effect.logWarning(`Permission denied for ${rejected.length} targets`);
    }

    const allowed = permissionChecks.filter((c) => c.allowed).map((c) => c.target);

    // Stage 2: Publish to allowed targets sequentially (to avoid conflicts)
    const results: PublishResult[] = [];
    for (const target of allowed) {
      const result = yield* Effect.tryPromise(() =>
        api["publications.publish"]({
          thingId,
          targets: [target],
        })
      ).pipe(
        Effect.map(() => ({ target, success: true })),
        Effect.catchAll((error) =>
          Effect.succeed({
            target,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        ),
        Effect.tap((result) =>
          Effect.sync(() => {
            // Report progress to UI
            console.log(`Published to ${target.spaceId}: ${result.success}`);
          })
        )
      );
      results.push(result);
    }

    // Stage 3: Return aggregate result
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return {
      total: targets.length,
      allowed: allowed.length,
      rejected: rejected.length,
      success: successCount,
      failed: failCount,
      results,
    };
  }).pipe(
    Effect.timeout("30 seconds"),
    Effect.catchAll((error) =>
      Effect.succeed({
        total: targets.length,
        allowed: 0,
        rejected: 0,
        success: 0,
        failed: targets.length,
        results: targets.map((t) => ({
          target: t,
          success: false,
          error: `Workflow failed: ${String(error)}`,
        })),
      })
    )
  );
}

// React hook wrapper
export function usePublishFlow() {
  const [progress, setProgress] = useState<PublishResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const publish = useCallback(
    async (thingId: string, targets: PublishTarget[]) => {
      setIsRunning(true);
      setProgress([]);

      const program = createPublishProgram(thingId, targets, apiClient);

      try {
        const result = await Effect.runPromise(program);
        setProgress(result.results);
        return result;
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return { publish, progress, isRunning };
}
```

## Workflow: Asset Upload

```typescript
// ui/src/features/assets/use-upload-flow.ts
import { Effect } from "effect";

interface UploadState {
  status: "idle" | "creating" | "uploading" | "completing" | "attaching" | "done" | "error";
  progress: number;
  error?: string;
}

function createUploadProgram(
  file: File,
  workspaceId: string,
  thingId: string,
  role: string,
  api: ApiClient,
  onProgress: (progress: number) => void
) {
  return Effect.gen(function* () {
    // Stage 1: Create upload intent
    yield* Effect.sync(() => onProgress(10));

    const { assetId, uploadUrl, storageKey } = yield* Effect.tryPromise(() =>
      api["assets.createUpload"]({
        workspaceId,
        fileName: file.name,
        mimeType: file.type,
        bytes: file.size,
        kind: inferAssetKind(file.type),
      })
    );

    // Stage 2: Upload file
    yield* Effect.sync(() => onProgress(30));

    yield* Effect.tryPromise(async () => {
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = 30 + Math.round((e.loaded / e.total) * 50);
            onProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload error")));
      });

      xhr.open("PUT", uploadUrl);
      xhr.send(file);

      await uploadPromise;
    });

    // Stage 3: Complete upload
    yield* Effect.sync(() => onProgress(80));

    yield* Effect.tryPromise(() =>
      api["assets.completeUpload"]({
        assetId,
        storageKey,
        mimeType: file.type,
        bytes: file.size,
      })
    );

    // Stage 4: Attach to thing
    yield* Effect.sync(() => onProgress(90));

    yield* Effect.tryPromise(() =>
      api["assets.attachToThing"]({
        thingId,
        assetId,
        role,
        position: 0,
      })
    );

    yield* Effect.sync(() => onProgress(100));

    return { assetId, success: true };
  }).pipe(
    Effect.timeout("5 minutes"), // Long timeout for large files
    Effect.retry({
      times: 2,
      schedule: Effect.sleep("1 second"),
    }),
    Effect.catchAll((error) =>
      Effect.succeed({
        assetId: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    )
  );
}

// React hook wrapper
export function useUploadFlow() {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });

  const upload = useCallback(
    async (params: {
      file: File;
      workspaceId: string;
      thingId: string;
      role: string;
    }) => {
      setState({ status: "creating", progress: 0 });

      const onProgress = (progress: number) => {
        const status =
          progress < 30
            ? "creating"
            : progress < 80
            ? "uploading"
            : progress < 90
            ? "completing"
            : progress < 100
            ? "attaching"
            : "done";
        setState({ status, progress });
      };

      const program = createUploadProgram(
        params.file,
        params.workspaceId,
        params.thingId,
        params.role,
        apiClient,
        onProgress
      );

      const result = await Effect.runPromise(program);

      if (!result.success) {
        setState({ status: "error", progress: 0, error: result.error });
      }

      return result;
    },
    []
  );

  return { upload, state };
}
```

## Workflow: Graph Generator

```typescript
// ui/src/features/generator/use-generator-flow.ts
import { Effect } from "effect";

interface SeedConfig {
  workspaceId: string;
  count: number;
  typeKey?: string;
  connectDensity: number; // 0-1 probability
  publishToSpaces?: string[];
}

interface SeedResult {
  createdThings: string[];
  createdEdges: string[];
  publishedCount: number;
  log: string[];
}

function createSeedProgram(config: SeedConfig, api: ApiClient) {
  return Effect.gen(function* () {
    const log: string[] = [];
    const createdThings: string[] = [];
    const createdEdges: string[] = [];
    let publishedCount = 0;

    // Stage 1: Load prerequisites
    yield* Effect.sync(() => log.push("Loading types and workspaces..."));

    const [types, existingThings] = yield* Effect.all([
      Effect.tryPromise(() => api["types.list"]()),
      Effect.tryPromise(() =>
        api["things.list"]({
          filter: { workspaceId: config.workspaceId },
          limit: 100,
        })
      ),
    ]);

    const targetType =
      config.typeKey
        ? types.find((t) => t.key === config.typeKey)
        : types[Math.floor(Math.random() * types.length)];

    if (!targetType) {
      yield* Effect.fail(new Error("No type available"));
      return;
    }

    yield* Effect.sync(() => log.push(`Selected type: ${targetType.key}`));

    // Stage 2: Create things
    yield* Effect.sync(() => log.push(`Creating ${config.count} things...`));

    for (let i = 0; i < config.count; i++) {
      const input = generateRandomThing(targetType.key, {
        workspaceId: config.workspaceId,
      });

      const thing = yield* Effect.tryPromise(() =>
        api["things.create"](input)
      );

      createdThings.push(thing.id);

      yield* Effect.sync(() =>
        log.push(`Created thing ${i + 1}/${config.count}: ${thing.id}`)
      );
    }

    // Stage 3: Create edges (connect things)
    if (config.connectDensity > 0 && createdThings.length > 1) {
      yield* Effect.sync(() => log.push("Creating connections..."));

      const edgePromises: Effect.Effect<void, Error, never>[] = [];

      for (let i = 0; i < createdThings.length; i++) {
        if (Math.random() < config.connectDensity && i > 0) {
          // Connect to a random earlier thing
          const targetIndex = Math.floor(Math.random() * i);
          const fromId = createdThings[i];
          const toId = createdThings[targetIndex];

          edgePromises.push(
            Effect.tryPromise(() =>
              api["edges.upsert"]({
                fromThingId: fromId,
                relation: "connected_to",
                toThingId: toId,
                attrs: {},
              })
            ).pipe(
              Effect.tap((edge) => {
                createdEdges.push(edge.id);
                log.push(`Connected ${fromId} → ${toId}`);
              }),
              Effect.catchAll((error) => {
                log.push(`Failed to connect: ${error}`);
                return Effect.succeed(undefined);
              })
            )
          );
        }
      }

      // Run edge creation with limited concurrency
      yield* Effect.all(edgePromises, { concurrency: 5 });
    }

    // Stage 4: Publish to spaces
    if (config.publishToSpaces && config.publishToSpaces.length > 0) {
      yield* Effect.sync(() => log.push("Publishing to spaces..."));

      for (const spaceId of config.publishToSpaces!) {
        const publishResults = yield* Effect.all(
          createdThings.map((thingId) =>
            Effect.tryPromise(() =>
              api["publications.publish"]({
                thingId,
                targets: [
                  {
                    spaceId,
                    slug: generateRandomSlug(),
                  },
                ],
              })
            ).pipe(
              Effect.tap(() => {
                publishedCount++;
              }),
              Effect.catchAll((error) => {
                log.push(`Failed to publish ${thingId} to ${spaceId}`);
                return Effect.succeed(undefined);
              })
            )
          ),
          { concurrency: 3 }
        );
      }
    }

    yield* Effect.sync(() => log.push("Seeding complete!"));

    return {
      createdThings,
      createdEdges,
      publishedCount,
      log,
    };
  }).pipe(
    Effect.timeout("5 minutes"),
    Effect.catchAll((error) =>
      Effect.succeed({
        createdThings: [],
        createdEdges: [],
        publishedCount: 0,
        log: [`Failed: ${error}`],
      })
    )
  );
}

// React hook wrapper with incremental log updates
export function useGeneratorFlow() {
  const [log, setLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const appendToLog = useCallback((entry: string) => {
    setLog((prev) => [...prev, entry]);
  }, []);

  const seed = useCallback(
    async (config: SeedConfig) => {
      setIsRunning(true);
      setLog([]);
      setResult(null);

      // Use a custom Effect runtime that can report progress
      const program = createSeedProgram(config, apiClient).pipe(
        Effect.tap((result) => {
          setResult(result);
        })
      );

      // For now, run without live log updates
      // TODO: Use Stream or Queue for live log updates
      const result = await Effect.runPromise(program);
      setLog(result.log);
      setResult(result);
      setIsRunning(false);

      return result;
    },
    []
  );

  const spawnOne = useCallback(
    async (workspaceId: string, typeKey?: string) => {
      return seed({
        workspaceId,
        count: 1,
        typeKey,
        connectDensity: 0,
      });
    },
    [seed]
  );

  return { seed, spawnOne, log, result, isRunning };
}
```

## Effect Runtime Setup

```typescript
// ui/src/lib/effect-runtime.ts
import { Effect, Layer } from "effect";
import { ApiClient } from "@/remote/orpc";

// Service for API client
const ApiClientService = Effect.tag<ApiClient>("ApiClient");

// Layer that provides API client
const ApiClientLive = Layer.effect(
  ApiClientService,
  Effect.sync(() => apiClient)
);

// Runtime for use in components
export const appRuntime = Effect.runSync(
  Effect.scoped(Layer.toRuntime(ApiClientLive))
);

// Helper to run effects
export function runEffect<E, A>(effect: Effect.Effect<A, E, ApiClient>): Promise<A> {
  return Effect.runPromise(effect);
}
```

## Testing Effects

```typescript
// Test with TestContext
import { Effect, TestContext } from "effect";

describe("publish workflow", () => {
  it("should publish to allowed spaces", async () => {
    const mockApi = {
      "permissions.check": vi.fn().mockResolvedValue({ allowed: true }),
      "publications.publish": vi.fn().mockResolvedValue([{ id: "pub-1" }]),
    };

    const program = createPublishProgram("thing-1", [
      { spaceId: "space-1", slug: "test" },
    ], mockApi as any);

    const result = await Effect.runPromise(program);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
  });
});
```

## Common Effect Patterns

### Retry with backoff

```typescript
Effect.retry(
  operation,
  Schedule.exponential("100 millis").pipe(
    Schedule.intersect(Schedule.recurs(3))
  )
)
```

### Timeout

```typescript
Effect.timeout(operation, "30 seconds")
```

### Parallel with concurrency limit

```typescript
Effect.all(operations, { concurrency: 5 })
```

### Error recovery

```typescript
operation.pipe(
  Effect.catchAll((error) =>
    Effect.succeed({ success: false, error: String(error) })
  )
)
```

### Tap for side effects

```typescript
operation.pipe(
  Effect.tap((result) =>
    Effect.sync(() => console.log("Got result:", result))
  )
)
```

## Related Files

- `ui/src/features/publish/use-publish-flow.ts`
- `ui/src/features/assets/use-upload-flow.ts`
- `ui/src/features/generator/use-generator-flow.ts`
- `ui/src/lib/effect-runtime.ts`
