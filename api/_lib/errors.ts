// Thrown by handlers to signal an HTTP status back to the caller.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResult {
  status: number;
  json: unknown;
}

// Wrap a handler so thrown ApiErrors become clean responses and
// unexpected errors become a 500 without leaking internals.
export async function handle(fn: () => Promise<ApiResult>): Promise<ApiResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, json: { error: e.message } };
    console.error("[api] unhandled error:", e);
    return { status: 500, json: { error: "Something went wrong." } };
  }
}
