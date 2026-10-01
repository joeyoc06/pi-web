#!/usr/bin/env node
/**
 * PM2 entry point for the pi-web dev server.
 *
 * PM2 runs this file with Node directly.
 * This script spawns pnpm as a child process so stdout/stderr
 * flow through to PM2's log capture.
 *
 * Works on both Windows and Linux/macOS.
 * cwd is derived from __dirname to avoid path conversion issues.
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Start the dev server
const devServer = spawn("pnpm", ["start", "--host"], {
  cwd: PROJECT_DIR,
  stdio: "inherit",
  shell: false,
});

// Forward HTTPS 443 -> HTTP localhost:5000 via Tailscale
const tailscaleServe = spawn("tailscale", ["serve", "--https", "443", "http://localhost:5000"], {
  stdio: "inherit",
  shell: false,
});

devServer.on("exit", (code) => {
  tailscaleServe.kill();
  process.exit(code ?? 0);
});

tailscaleServe.on("exit", (code) => {
  if (code !== 0) {
    console.error("Tailscale serve exited with code", code);
  }
});
