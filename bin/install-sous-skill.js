#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const source = fileURLToPath(new URL("../skills/sous", import.meta.url));
const target = path.join(
  process.env.PI_AGENT_DIR || path.join(os.homedir(), ".pi", "agent"),
  "skills",
  "sous",
);
fs.mkdirSync(path.dirname(target), { recursive: true });
try {
  const stat = fs.lstatSync(target);
  if (
    !stat.isSymbolicLink() ||
    fs.realpathSync(target) !== fs.realpathSync(source)
  )
    throw new Error(
      `Refusing to replace an existing skill at ${target}. Move it aside or merge it manually.`,
    );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  fs.symlinkSync(
    source,
    target,
    process.platform === "win32" ? "junction" : "dir",
  );
}
console.log(
  `Sous skill installed: ${target}\nNew Pi sessions discover it automatically. Reload existing sessions to refresh their skills.`,
);
