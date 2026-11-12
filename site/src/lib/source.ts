import { readFile } from "node:fs/promises";
import { parseReadme } from "./parse";

export const UPSTREAM_REPO = "https://github.com/orbitalindex/awesome-space";

/**
 * Loads and parses the list at build time. Reads the README at the repo root,
 * one folder up from `site/`, where the build runs. Set AWESOME_SPACE_README to
 * another file path to build from that file instead.
 */
export async function loadDirectory() {
  return parseReadme(await readFile(process.env.AWESOME_SPACE_README ?? "../README.md", "utf8"));
}
