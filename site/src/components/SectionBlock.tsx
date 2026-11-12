import { ArrowUpRightIcon, CodeBracketIcon } from "@heroicons/react/16/solid";
import type { Entry, Section } from "../lib/parse";
import type { Match } from "../lib/search";
import { RichText } from "./RichText";

const CODE_HOSTS = new Set(["github.com", "gitlab.com", "codeberg.org", "bitbucket.org"]);

type Props = {
  section: Section;
  entries: Entry[];
  matches: Map<string, Match> | null;
  /** Show the full path ("Data / Earth") instead of the title. Used for search results. */
  showPath?: boolean;
};

/** One section heading with its entries. Sections with no entries render only the heading. */
export function SectionBlock({ section, entries, matches, showPath = false }: Props) {
  // Search results drop the category h2s, so their headings move up a level.
  const Heading = showPath ? "h2" : section.depth === 4 ? "h4" : "h3";
  const labels = showPath ? section.path : [section.title];

  return (
    <section id={section.id} data-section={section.id} className="scroll-mt-32 lg:scroll-mt-20">
      <div className="flex items-baseline gap-2 px-4 pb-2 pt-1">
        <Heading
          aria-label={labels.length > 1 ? labels.join(", ") : undefined}
          className={`text-xs font-semibold uppercase tracking-[0.07em] ${section.depth === 4 && !showPath ? "text-faint" : "text-muted"}`}
        >
          {labels.map((label, i) => (
            <span key={label} className={i < labels.length - 1 ? "text-faint" : undefined}>
              {label}
              {i < labels.length - 1 && (
                <span aria-hidden className="px-1.5 opacity-60">
                  /
                </span>
              )}
            </span>
          ))}
        </Heading>
        {entries.length > 0 && <span className="text-xs tabular-nums text-faint">{entries.length}</span>}
      </div>

      {entries.length > 0 && (
        <ul className="mb-10">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} terms={matches?.get(entry.id)?.terms ?? []} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryRow({ entry, terms }: { entry: Entry; terms: string[] }) {
  const isCode = CODE_HOSTS.has(entry.host);

  return (
    <li className="group relative rounded-xl px-4 py-3 transition-colors hover:bg-surface">
      <div className="flex items-baseline gap-x-3">
        <p className="min-w-0 text-[15px] font-medium leading-6 tracking-[-0.005em] text-fg">
          <RichText segments={entry.title} terms={terms} stretchFirstLink />
        </p>
        <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px] text-faint">
          {isCode && <CodeBracketIcon aria-hidden className="size-3" />}
          <span className="hidden sm:inline">{entry.host}</span>
          <ArrowUpRightIcon aria-hidden className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </div>
      {entry.description.length > 0 && (
        <p className="mt-0.5 max-w-[68ch] text-sm leading-6 text-muted text-pretty">
          <RichText segments={entry.description} terms={terms} />
        </p>
      )}
    </li>
  );
}
