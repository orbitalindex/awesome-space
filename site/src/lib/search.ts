import MiniSearch from "minisearch";
import { plain, type Entry, type Section } from "./parse";

export type Match = { score: number; terms: string[] };

/**
 * Builds a full-text index over the directory. The returned function maps a
 * query to matching entry ids, with scores and the document terms that matched
 * (used for highlighting). Titles weigh most, then section names.
 */
export function createSearch(entries: Entry[], sections: Section[]) {
  const pathOf = new Map(sections.map((s) => [s.id, s.path.join(" ")]));
  const index = new MiniSearch({
    fields: ["title", "section", "description", "host"],
    searchOptions: {
      boost: { title: 4, section: 2, host: 1.5 },
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
    },
  });
  index.addAll(
    entries.map((entry) => ({
      id: entry.id,
      title: plain(entry.title),
      section: pathOf.get(entry.sectionId) ?? "",
      description: plain(entry.description),
      host: entry.host,
    })),
  );

  return (query: string) =>
    new Map<string, Match>(index.search(query).map((r) => [String(r.id), { score: r.score, terms: r.terms }]));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` into runs, flagging matched terms that start at a word boundary. */
export function highlight(text: string, terms: string[]) {
  if (terms.length === 0) return [{ text, match: false }];
  const alternatives = terms.map(escape).sort((a, b) => b.length - a.length).join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})`, "giu");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: terms.some((t) => t.toLowerCase() === part.toLowerCase()) }));
}
