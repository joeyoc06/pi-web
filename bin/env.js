#!/usr/bin/env node
/**
 * Prepares the environment for everything downstream (`prisma generate`,
 * `prisma migrate deploy`, the dev server and the built server).
 *
 * - Creates `.env` with an absolute `DB_URL` when it is missing.
 * - Adds `DB_URL` to an existing `.env` when that key is absent, never
 *   overwriting a value you already set.
 * - Creates the directory the database file lives in, since node:sqlite will
 *   not create it for us.
 *
 * `DB_URL` must be absolute: the Prisma CLI resolves relative `file:` URLs
 * against `prisma/` while the runtime adapter resolves them against the cwd.
 */
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const envFile = path.join(root, ".env");
const defaultUrl = `file:${path.resolve(root, ".data", "app.db")}`;

function readEnvFile() {
  if (!existsSync(envFile)) return null;
  return readFileSync(envFile, "utf8");
}

function hasKey(contents, key) {
  return new RegExp(`^\\s*${key}\\s*=`, "m").test(contents);
}

function readKey(contents, key) {
  const match = contents.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const existing = readEnvFile();

if (existing === null) {
  writeFileSync(envFile, `DB_URL="${defaultUrl}"\n`);
  console.log(`Created .env with DB_URL="${defaultUrl}"`);
} else if (!hasKey(existing, "DB_URL")) {
  appendFileSync(
    envFile,
    `${existing.endsWith("\n") || existing === "" ? "" : "\n"}DB_URL="${defaultUrl}"\n`,
  );
  console.log(`Added DB_URL="${defaultUrl}" to .env`);
}

const url =
  process.env.DB_URL || readKey(readEnvFile() ?? "", "DB_URL") || defaultUrl;

if (!url.startsWith("file:")) {
  console.error(`DB_URL must be a SQLite file URL, got: ${url}`);
  process.exit(1);
}

const file = url.startsWith("file://")
  ? fileURLToPath(url)
  : url.slice("file:".length);

mkdirSync(path.dirname(file), { recursive: true });
