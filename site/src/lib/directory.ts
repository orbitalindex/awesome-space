import type { Entry, Section } from "./parse";
import type { Match } from "./search";

export type Group = { section: Section; entries: Entry[] };

export type TocItem = {
  section: Section;
  /** Categories count every entry below them. Sections count their own entries, matching their heading. */
  count: number;
};

/** Builds the browse-mode table of contents, hiding sections with nothing visible below them. */
export function tocItems(sections: Section[], visible: Entry[]): TocItem[] {
  const parentOf = new Map(sections.map((s) => [s.id, s.parentId]));
  const direct = new Map<string, number>();
  const total = new Map<string, number>();
  for (const entry of visible) {
    direct.set(entry.sectionId, (direct.get(entry.sectionId) ?? 0) + 1);
    for (let id: string | undefined = entry.sectionId; id; id = parentOf.get(id)) {
      total.set(id, (total.get(id) ?? 0) + 1);
    }
  }

  return sections
    .filter((section) => total.has(section.id))
    .map((section) => ({
      section,
      count: (section.depth === 2 ? total : direct).get(section.id) ?? 0,
    }));
}

/** Groups matched entries by section, best-scoring section first, best entry first. */
export function groupBySection(entries: Entry[], sections: Section[], matches: Map<string, Match>): Group[] {
  const score = (e: Entry) => matches.get(e.id)?.score ?? 0;
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) groups.set(entry.sectionId, [...(groups.get(entry.sectionId) ?? []), entry]);

  return sections
    .flatMap((section) => {
      const list = groups.get(section.id);
      return list ? [{ section, entries: list.toSorted((a, b) => score(b) - score(a)) }] : [];
    })
    .toSorted((a, b) => score(b.entries[0]) - score(a.entries[0]));
}
