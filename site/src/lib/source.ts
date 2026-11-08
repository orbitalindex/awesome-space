import { readFile } from "node:fs/promises";
import { parseReadme } from "./parse";

export const UPSTREAM_REPO = "https://github.com/orbitalindex/awesome-space";
const UPSTREAM_README = "https://raw.githubusercontent.com/orbitalindex/awesome-space/master/README.md";

/**
 * Loads and parses the list at build time. Reads from the upstream README by
 * default. Set AWESOME_SPACE_README to a local file path to build offline.
 */
export async function loadDirectory() {
  const localPath = process.env.AWESOME_SPACE_README;
  const markdown = localPath ? await readFile(localPath, "utf8") : await fetchUpstream();
  return parseReadme(markdown);
}

async function fetchUpstream() {
  const response = await fetch(UPSTREAM_README);
  if (!response.ok) throw new Error(`Fetching ${UPSTREAM_README} failed with ${response.status}`);
  return response.text();
}
