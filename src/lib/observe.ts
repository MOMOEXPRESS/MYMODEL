// Tiny observability layer.
//
// We don't want to bundle the full Sentry SDK by default — it doubles the
// serverless bundle size. Instead we POST to Sentry's HTTP envelope endpoint
// directly when SENTRY_DSN is set, otherwise we log to the function console.
// Both server and edge runtime safe.

type Severity = "error" | "warning" | "info";

type Event = {
  message: string;
  level: Severity;
  context?: Record<string, unknown>;
  err?: unknown;
};

const DSN = process.env.SENTRY_DSN;

function parseDsn(dsn: string): { url: string; key: string; projectId: string } | null {
  // Format: https://<key>@oXXX.ingest.sentry.io/<project_id>
  const m = /^(https?):\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn);
  if (!m) return null;
  const [, scheme, key, host, projectId] = m;
  return {
    url: `${scheme}://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`,
    key: key!,
    projectId: projectId!,
  };
}

const parsed = DSN ? parseDsn(DSN) : null;

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  await capture({ message: messageFor(err), level: "error", err, context });
}

export async function captureMessage(message: string, context?: Record<string, unknown>): Promise<void> {
  await capture({ message, level: "info", context });
}

async function capture(event: Event): Promise<void> {
  // Always log locally so dev can see the event.
  // eslint-disable-next-line no-console
  (event.level === "error" ? console.error : console.log)(
    `[observe] ${event.level.toUpperCase()} ${event.message}`,
    event.context ?? "",
    event.err ?? "",
  );

  if (!parsed) return;

  const eventId = randomHex(16);
  const item = {
    event_id: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    platform: "javascript",
    level: event.level,
    message: event.message,
    extra: event.context ?? {},
    exception:
      event.err instanceof Error
        ? {
            values: [
              {
                type: event.err.name,
                value: event.err.message,
                stacktrace: { frames: parseStack(event.err.stack ?? "") },
              },
            ],
          }
        : undefined,
    server_name: process.env.VERCEL_REGION ?? "local",
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
    environment: process.env.NODE_ENV ?? "development",
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(item);

  try {
    await fetch(parsed.url, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
      // Don't block the request on sentry being slow.
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // never throw from observability
  }
}

function messageFor(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function parseStack(stack: string) {
  return stack
    .split("\n")
    .slice(1, 30)
    .map((line) => {
      const m = /at\s+(.+?)\s+\(([^:]+):(\d+):(\d+)\)/.exec(line) ?? /at\s+([^:]+):(\d+):(\d+)/.exec(line);
      if (!m) return { function: line.trim() };
      if (m.length === 5) {
        return {
          function: m[1],
          filename: m[2],
          lineno: Number(m[3]),
          colno: Number(m[4]),
        };
      }
      return { filename: m[1], lineno: Number(m[2]), colno: Number(m[3]) };
    });
}

function randomHex(bytes: number): string {
  // Avoid node:crypto so this works on the edge runtime.
  let s = "";
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  for (let i = 0; i < bytes; i++) s += buf[i]!.toString(16).padStart(2, "0");
  return s;
}
