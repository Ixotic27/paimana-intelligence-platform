import test from "node:test";
import assert from "node:assert/strict";
import { requestJson, ApiError } from "../src/api.ts";

test("API validation errors become readable messages", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ detail: [{ msg: "Due date cannot be in the past" }] }),
        { status: 422 },
      ),
  );
  await assert.rejects(
    requestJson("/api/reviews"),
    (e) =>
      e instanceof ApiError &&
      e.status === 422 &&
      e.message === "Due date cannot be in the past",
  );
});
test("network failures retain uncertainty about a submitted write", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    requestJson("/api/reviews", { method: "POST" }),
    (e) => e.status === 0 && e.message.includes("may have reached the server"),
  );
});
test("an HTML fallback cannot masquerade as a successful API response", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>App fallback</html>", { status: 200 }),
  );
  await assert.rejects(requestJson("/api/health"), /invalid response/);
});
