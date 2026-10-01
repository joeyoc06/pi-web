/**
 * Server-side storage for recent projects (workspaces).
 *
 * Persisted to <repo>/.data/projects.json. The file stores up to
 * MAX_PROJECTS entries ordered by recency (newest first). When the cap is
 * reached, the oldest entry is evicted.
 *
 * NOTE: Runtime metadata in `.data/` must stay ignored; `.data/app.db` is
 * intentionally tracked and excluded from Vite's watcher in vite.config.ts.
 * The Tailwind Vite plugin can trigger a full page reload for non-ignored
 * project-root changes, so writing this file during the home action must not
 * reload `/` mid-redirect and bounce back to the home page.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "url";

export interface Project {
  name: string;
  path: string;
}

const MAX_PROJECTS = 10;
const DATA_DIR = fileURLToPath(new URL("../../.data", import.meta.url));
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

function readProjectsFile(): Project[] {
  try {
    const content = fs.readFileSync(PROJECTS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Project =>
        typeof p?.name === "string" &&
        typeof p?.path === "string" &&
        p.path.length > 0,
    );
  } catch {
    return [];
  }
}

function writeProjectsFile(projects: Project[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

/**
 * Get all recent projects ordered by recency (newest first).
 */
export function getProjects(): Project[] {
  return readProjectsFile();
}

/**
 * Add or bump a project to the top of the recency list.
 * If already present, moves it to the front. Evicts oldest if at cap.
 */
export function addProject(project: Project): void {
  const existing = readProjectsFile();

  // plain `===`: every path we store went through resolvePath() at the
  // boundary. See docs/adr/0001-paths-are-canonical-at-the-boundary.md
  const filtered = existing.filter((p) => p.path !== project.path);

  const updated = [
    { name: project.name, path: project.path },
    ...filtered,
  ].slice(0, MAX_PROJECTS);

  writeProjectsFile(updated);
}

/**
 * Add a project by path, deriving its name from the folder name.
 */
export function addProjectPath(projectPath: string): void {
  addProject({ name: path.basename(projectPath), path: projectPath });
}

/**
 * Remove a project by its path.
 */
export function removeProject(projectPath: string): void {
  const existing = readProjectsFile();
  const updated = existing.filter((p) => p.path !== projectPath);
  if (updated.length !== existing.length) {
    writeProjectsFile(updated);
  }
}
