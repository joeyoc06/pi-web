import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { SousErrorBody } from "~/lib/sous/api";

export class SousError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: SousErrorBody["details"],
  ) {
    super(message);
  }
}
export function describeError(error: unknown): {
  status: number;
  body: SousErrorBody;
} {
  if (error instanceof SousError)
    return {
      status: error.status,
      body: {
        ok: false,
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      status: 400,
      body: {
        ok: false,
        code: "VALIDATION_ERROR",
        error: "Check the highlighted fields and try again.",
        details: { fieldErrors },
      },
    };
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "CONFLICT",
        error: "That value is already in use.",
      },
    };
  }
  console.error("[sous]", error);
  return {
    status: 500,
    body: {
      ok: false,
      code: "INTERNAL_ERROR",
      error:
        "Sous couldn't complete that request. Your changes were not saved. Please try again.",
    },
  };
}
