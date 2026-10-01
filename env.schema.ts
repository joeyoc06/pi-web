/**
 * Environment parsing. Import this once, as early as possible (see
 * `app/entry.server.tsx`), and read typed values from `process.env_parsed`.
 *
 * Loading rules:
 * - `react-router dev` already merges `.env` into `process.env` for us.
 * - `react-router-serve` (i.e. `pnpm start`) does not, so we load `.env`
 *   ourselves. Variables already present in the real environment win, which
 *   matches dotenv semantics and keeps `DB_URL=... pnpm start` working.
 */
import { z } from "zod";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const envSchema = z.object({
  /**
   * Absolute SQLite file URL, e.g. `file:/home/me/pi-web/.data/app.db`.
   *
   * It must be absolute: the Prisma CLI resolves relative `file:` URLs against
   * the schema directory while the runtime adapter resolves them against the
   * cwd, so a relative URL silently opens two different databases.
   */
  DB_URL: z
    .string({ error: "is required" })
    .min(1, "is required")
    .startsWith("file:", 'must be a SQLite file URL, e.g. "file:/abs/path/app.db"')
    .refine(isAbsoluteFileUrl, "must point at an absolute path"),
});

export type Env = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface Process {
      /** Validated, strongly typed environment. Populated by `env.schema.ts`. */
      env_parsed: Env;
    }
  }
}

function isAbsoluteFileUrl(value: string): boolean {
  const target = value.slice("file:".length);
  try {
    return isAbsolute(
      target.startsWith("//") ? fileURLToPath(value) : target,
    );
  } catch {
    return false;
  }
}

function loadDotenv(): void {
  const fromRealEnvironment = { ...process.env };
  try {
    process.loadEnvFile();
  } catch {
    // No .env file — everything may still come from the real environment.
  }
  Object.assign(process.env, fromRealEnvironment);
}

function parseEnv(): Env {
  loadDotenv();

  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"} ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment:\n${issues}\n\n` +
      `Create a .env file in the project root (or run \`pnpm env\`):\n` +
      `  DB_URL="file:/absolute/path/to/app.db"\n`,
  );
}

export const env: Env = (process.env_parsed ??= parseEnv());
