#!/usr/bin/env node
async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk.toString();
  return text;
}

const [resource, operation, argument] = process.argv.slice(2);
const verbs = {
  search: "GET",
  get: "GET",
  add: "POST",
  update: "PUT",
  delete: "DELETE",
};
if (
  !["recipes", "ingredients"].includes(resource) ||
  !Object.hasOwn(verbs, operation)
) {
  console.error(
    "Usage: recipe-api.mjs recipes|ingredients search [query] | get ID | add < json | update ID < json | delete ID [< json]",
  );
  process.exit(1);
}
const base = (process.env.PI_WEB_URL || "http://localhost:5000").replace(
  /\/$/,
  "",
);
let endpoint = `${base}/api/sous/${resource}`;
if (["get", "update", "delete"].includes(operation)) {
  if (!argument) {
    console.error("An ID is required. Search first.");
    process.exit(1);
  }
  endpoint += "/" + encodeURIComponent(argument);
} else if (operation === "search" && argument) {
  endpoint += "?" + new URLSearchParams(argument);
}
try {
  let body;
  if (operation === "add" || operation === "update") {
    body = await readStdin();
    JSON.parse(body);
  } else if (operation === "delete" && !process.stdin.isTTY) {
    body = (await readStdin()).trim() || undefined;
    if (body) JSON.parse(body);
  }
  const response = await fetch(endpoint, {
    method: verbs[operation],
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok || !result.ok) process.exitCode = 1;
} catch (error) {
  console.error(
    `Recipe API request failed: ${error.message}. Check PI_WEB_URL and whether pi-web is running; do not bypass the API.`,
  );
  process.exitCode = 1;
}
