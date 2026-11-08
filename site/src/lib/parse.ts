/** A run of inline text. Links carry an `href`. */
export type Segment = { text: string; href?: string };

export type Section = {
  /** URL-safe slug, unique across the list. Used as the DOM anchor. */
  id: string;
  title: string;
  /** 2 = category (##), 3 = section (###), 4 = subsection (####). */
  depth: 2 | 3 | 4;
  categoryId: string;
  /** The enclosing section, if any. Categories have none. */
  parentId?: string;
  /** Titles from the category down to this section. */
  path: string[];
};

export type Entry = {
  id: string;
  /** Title segments. Usually one link, sometimes several ("[A] and [B]"). */
  title: Segment[];
  description: Segment[];
  /** First link in the title, or in the description if the title has none. */
  url: string;
  /** Hostname of `url` without "www.". */
  host: string;
  sectionId: string;
  categoryId: string;
};

export type Directory = {
  categories: Section[];
  sections: Section[];
  entries: Entry[];
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

const decode = (text: string) => text.replace(/&(#?\w+);/g, (match, name: string) => ENTITIES[name] ?? match);

/** Lowercase, ASCII-only slug: "SDKs & Software Tools" -> "sdks-software-tools". */
export const slugify = (text: string) =>
  text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Joins segments into plain text, dropping link targets. */
export const plain = (segments: Segment[]) => segments.map((s) => s.text).join("");

/**
 * Splits inline markdown into text and link segments. Handles URLs with
 * balanced parentheses and strips `**bold**` and `` `code` `` markers.
 */
export function tokenize(markdown: string): Segment[] {
  const segments: Segment[] = [];
  let text = "";
  let i = 0;

  const flush = () => {
    if (text) segments.push({ text: decode(text.replace(/\*\*|`/g, "")) });
    text = "";
  };

  while (i < markdown.length) {
    const link = markdown[i] === "[" ? readLink(markdown, i) : undefined;
    if (link) {
      flush();
      segments.push({ text: decode(link.text), href: link.href });
      i = link.end;
    } else {
      text += markdown[i];
      i += 1;
    }
  }
  flush();
  return segments;
}

function readLink(source: string, start: number) {
  const close = source.indexOf("](", start);
  if (close === -1) return undefined;
  const text = source.slice(start + 1, close);
  if (text.includes("[")) return undefined;

  let depth = 1;
  let i = close + 2;
  for (; i < source.length && depth > 0; i += 1) {
    if (source[i] === "(") depth += 1;
    if (source[i] === ")") depth -= 1;
  }
  if (depth !== 0) return undefined;

  const href = source.slice(close + 2, i - 1).trim();
  return { text, href, end: i };
}

// The list separates titles from descriptions with a dash, en dash, em dash or colon.
const SEPARATOR = /\s+[-–—:]\s+/;

/**
 * Splits a bullet into title and description. The separator must sit in a
 * text segment, never inside link text. With no separator, the first link is
 * the title and the rest is the description, unless the rest holds another
 * link ("[A] and [B]"), in which case the whole bullet is the title.
 */
export function splitEntry(segments: Segment[]) {
  for (const [index, segment] of segments.entries()) {
    if (segment.href) continue;
    const match = SEPARATOR.exec(segment.text);
    if (!match || index === 0) continue;

    const before = segment.text.slice(0, match.index);
    const after = segment.text.slice(match.index + match[0].length);
    return {
      title: trimSegments([...segments.slice(0, index), { text: before }]),
      description: capitalize(trimSegments([{ text: after }, ...segments.slice(index + 1)])),
    };
  }

  const [first, ...rest] = segments;
  if (!first?.href || rest.some((s) => s.href)) {
    // "[A] and [B] (what they are)" reads better with the aside as the description.
    const last = segments.at(-1);
    const aside = last && !last.href ? /^(.*?)\s*\((.+)\)\s*$/.exec(last.text) : null;
    if (aside) {
      return {
        title: trimSegments([...segments.slice(0, -1), { text: aside[1] }]),
        description: capitalize([{ text: aside[2] }]),
      };
    }
    return { title: trimSegments(segments), description: [] };
  }
  return { title: [first], description: capitalize(trimSegments(rest)) };
}

function trimSegments(segments: Segment[]) {
  const out = segments.filter((s) => s.text !== "" || s.href);
  if (out[0] && !out[0].href) out[0] = { text: out[0].text.trimStart() };
  const last = out.length - 1;
  if (out[last] && !out[last].href) out[last] = { text: out[last].text.trimEnd() };
  return out.filter((s) => s.text !== "" || s.href);
}

function capitalize(segments: Segment[]) {
  const [first, ...rest] = segments;
  if (!first || first.href) return segments;
  return [{ text: first.text.charAt(0).toUpperCase() + first.text.slice(1) }, ...rest];
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const LINKS_START = "<!-- Start Links";
const LINKS_END = "<!-- End Links";

/**
 * Parses the Awesome Space README into categories, sections and entries.
 * Only reads the region between the "Start Links" and "End Links" markers.
 * Throws on anything it would otherwise drop or misfile: a bullet without a
 * link, a link outside a bullet, a heading outside ## to ####, and a bullet
 * directly under a ## category (the page renders entries by section).
 */
export function parseReadme(markdown: string): Directory {
  const startIndex = markdown.indexOf(LINKS_START);
  const endIndex = markdown.indexOf(LINKS_END);
  if (startIndex === -1 || endIndex === -1) throw new Error("README is missing the Links markers");

  const lines = markdown.slice(startIndex, endIndex).split("\n");
  const categories: Section[] = [];
  const sections: Section[] = [];
  const entries: Entry[] = [];
  const usedIds = new Set<string>();
  const trail: Section[] = [];
  let current: Section | undefined;

  const uniqueId = (base: string) => {
    const safe = base || "item";
    let id = safe;
    for (let n = 2; usedIds.has(id); n += 1) id = `${safe}-${n}`;
    usedIds.add(id);
    return id;
  };

  for (const line of lines) {
    const heading = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const depth = heading[1].length as Section["depth"];
      const title = decode(heading[2]);
      const id = uniqueId(slugify(title));
      trail.length = Math.min(trail.length, depth - 2);
      const parent = trail.at(-1);
      current = {
        id,
        title,
        depth,
        categoryId: trail[0]?.id ?? id,
        parentId: parent?.id,
        path: [...trail.map((s) => s.title), title],
      };
      trail.push(current);
      if (depth === 2) categories.push(current);
      sections.push(current);
      continue;
    }
    if (line.startsWith("#")) throw new Error(`Unsupported heading level: ${line}`);

    const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (!bullet) {
      if (line.includes("](")) throw new Error(`Link outside a bullet: ${line}`);
      continue;
    }
    if (!current || current.depth === 2) throw new Error(`Entry outside a ### or #### section: ${line}`);

    const { title, description } = splitEntry(tokenize(bullet[1]));
    const url = [...title, ...description].find((s) => s.href)?.href;
    if (!url) throw new Error(`Entry without a link: ${line}`);

    entries.push({
      id: uniqueId(`${current.id}--${slugify(plain(title))}`),
      title,
      description,
      url,
      host: hostOf(url),
      sectionId: current.id,
      categoryId: current.categoryId,
    });
  }

  return { categories, sections, entries };
}
