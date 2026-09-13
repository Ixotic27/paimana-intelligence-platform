export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the local API. A write may have reached the server; reconnect and check the review queue before retrying.",
      0,
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "The local API returned an invalid response. Check that the backend is running and refresh saved reviews before retrying a write.",
      response.status,
    );
  }
  if (!response.ok) {
    const detail = (body as { detail?: unknown })?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg ?? "Invalid review field").join("; ")
          : `API request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}
