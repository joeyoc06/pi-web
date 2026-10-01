import { data } from "react-router";
import { describeError, SousError } from "./errors.server";
import type { SousResult } from "~/lib/sous/api";

export function ok<T>(value: T, status = 200, meta?: { created: boolean }) {
  return Response.json(
    {
      ok: true,
      data: value,
      ...(meta ? { meta } : {}),
    } satisfies SousResult<T>,
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function api(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    const { body, status } = describeError(error);
    return Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
export function methodNotAllowed(allow: string) {
  return Response.json(
    { ok: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: allow } },
  );
}
export function query(request: Request) {
  return Object.fromEntries(
    [...new URL(request.url).searchParams].filter(([, value]) => value !== ""),
  );
}
export async function readJson(
  request: Request,
  allowEmpty = false,
): Promise<unknown> {
  const body = await request.text();
  if (!body && allowEmpty) return {};
  if (Buffer.byteLength(body) > 1024 * 1024)
    throw new SousError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Recipe payloads must be smaller than 1 MB.",
    );
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new SousError(
      415,
      "JSON_REQUIRED",
      "Send Content-Type: application/json.",
    );
  try {
    return JSON.parse(body);
  } catch {
    throw new SousError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}
// UI actions reuse the service functions, but return route action data so a
// failed save retains the editor and its errors instead of throwing it away.
export function formError(error: unknown) {
  const { body, status } = describeError(error);
  return data(body, { status });
}
export async function pageLoad<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const { body, status } = describeError(error);
    throw data(body, { status });
  }
}
export async function formPayload(request: Request): Promise<unknown> {
  const form = await request.formData();
  const payload = form.get("payload");
  if (typeof payload !== "string" || Buffer.byteLength(payload) > 1024 * 1024)
    throw new SousError(400, "INVALID_FORM", "Invalid recipe form.");
  try {
    return JSON.parse(payload);
  } catch {
    throw new SousError(400, "INVALID_FORM", "Invalid recipe form.");
  }
}
