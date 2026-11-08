import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@base-ui/react/input";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Bars3BottomLeftIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { groupBySection, tocItems } from "../lib/directory";
import type { Directory as DirectoryData, Section } from "../lib/parse";
import { createSearch } from "../lib/search";
import { SectionBlock } from "./SectionBlock";
import { Toc } from "./Toc";

type Props = DirectoryData & {
  contributeUrl: string;
  /** Static content rendered after the list, in the list column. Hidden while the empty state shows. */
  children?: ReactNode;
};

const ALL = "all";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The searchable list. Server-rendered in full so it works without JavaScript,
 * then hydrated for search, category filters and the table of contents.
 * The query and category live in the URL (?q=&category=) so results are shareable.
 */
export default function Directory({ categories, sections, entries, contributeUrl, children }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [tocOpen, setTocOpen] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const search = useMemo(() => createSearch(entries, sections), [entries, sections]);
  const deferredQuery = useDeferredValue(query.trim());
  const matches = useMemo(() => (deferredQuery ? search(deferredQuery) : null), [search, deferredQuery]);

  const queryMatched = matches ? entries.filter((e) => matches.has(e.id)) : entries;
  const visible = category === ALL ? queryMatched : queryMatched.filter((e) => e.categoryId === category);
  const categoryTitle = categories.find((c) => c.id === category)?.title;
  const groups = matches ? groupBySection(visible, sections, matches) : null;
  const toc = groups ? groups.map((g) => ({ section: g.section, count: g.entries.length })) : tocItems(sections, visible);
  const activeId = useActiveSection(toolbarRef, `${deferredQuery}|${category}`);

  // The list matches the URL state only once the deferred query has caught up.
  const settled = deferredQuery === query.trim();
  useUrlState({ query, setQuery, category, setCategory, categories, settled });
  useSearchShortcut(inputRef);

  // When the user's own filter change shrinks the list under a scrolled page,
  // bring the first result up to just below the toolbar. State restored from
  // the URL on load does not count; useUrlState restores the #section instead.
  const userChanged = useRef(false);
  const changeQuery = (value: string) => {
    if (value.trim() !== query.trim()) userChanged.current = true;
    setQuery(value);
  };
  const changeCategory = (value: string) => {
    if (value !== category) userChanged.current = true;
    setCategory(value);
  };
  useEffect(() => {
    if (!userChanged.current) return;
    userChanged.current = false;
    const bar = toolbarRef.current?.getBoundingClientRect().bottom ?? 0;
    const top = resultsRef.current?.getBoundingClientRect().top ?? bar;
    if (top < bar) window.scrollBy({ top: top - bar });
  }, [deferredQuery, category]);

  const status = matches
    ? `${plural(visible.length, "result")} for "${deferredQuery}"${categoryTitle ? ` in ${categoryTitle}` : ""}`
    : `${plural(visible.length, "resource")}${categoryTitle ? ` in ${categoryTitle}` : ""}`;

  const tocNav = <Toc items={toc} activeId={activeId} flat={groups !== null} onNavigate={() => setTocOpen(false)} />;

  return (
    <>
      <div ref={toolbarRef} className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
          <div className="relative flex flex-1 items-center">
            <label htmlFor={inputId} className="sr-only">
              Search resources
            </label>
            <MagnifyingGlassIcon aria-hidden className="pointer-events-none absolute left-3 size-4 text-faint" />
            <Input
              id={inputId}
              ref={inputRef}
              type="search"
              value={query}
              onValueChange={changeQuery}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                if (query) changeQuery("");
                else event.currentTarget.blur();
              }}
              placeholder={`Search ${entries.length} resources`}
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-base text-fg sm:pr-16 sm:text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent/60 focus:shadow-[0_0_0_3px_var(--mark)] [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  changeQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-line hover:text-fg"
              >
                <XMarkIcon className="size-4" />
              </button>
            ) : (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-2.5 hidden rounded border border-line px-1.5 font-sans text-[11px] leading-5 text-faint sm:block"
              >
                /
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ToggleGroup
              value={[category]}
              onValueChange={(value) => changeCategory(value[0] ?? ALL)}
              aria-label="Filter by category"
              className="flex flex-1 gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5 [scrollbar-width:none]"
            >
              {[{ id: ALL, title: "All" }, ...categories].map((c) => (
                <Toggle
                  key={c.id}
                  value={c.id}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted transition-colors hover:text-fg data-[pressed]:bg-elevated data-[pressed]:text-fg data-[pressed]:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--line)]"
                >
                  {c.title}
                  <span className="text-[11px] tabular-nums text-faint">
                    {c.id === ALL ? queryMatched.length : queryMatched.filter((e) => e.categoryId === c.id).length}
                  </span>
                </Toggle>
              ))}
            </ToggleGroup>

            <Dialog.Root open={tocOpen} onOpenChange={setTocOpen}>
              <Dialog.Trigger
                aria-label="Browse sections"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:text-fg lg:hidden"
              >
                <Bars3BottomLeftIcon className="size-4" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col border-r border-line bg-bg shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <Dialog.Title className="text-sm font-semibold">Jump to</Dialog.Title>
                    <Dialog.Close aria-label="Close" className="grid size-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-fg">
                      <XMarkIcon className="size-4" />
                    </Dialog.Close>
                  </div>
                  <div data-toc-scroll className="flex-1 overflow-y-auto px-3 py-4">
                    {tocNav}
                  </div>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          {/* ScrollArea.Root sets position: relative, so the sticky offset lives on a wrapper. */}
          <div className="sticky top-[5.5rem] h-[calc(100dvh-6.5rem)]">
            <ScrollArea.Root className="h-full">
              <ScrollArea.Viewport data-toc-scroll className="h-full overscroll-contain pb-8 pr-3">
                {tocNav}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="flex w-1 justify-center rounded opacity-0 transition-opacity data-[hovering]:opacity-100 data-[scrolling]:opacity-100">
                <ScrollArea.Thumb className="w-full rounded bg-line-strong" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </aside>

        <div ref={resultsRef} className="-mx-4 min-w-0 pb-16">
          {/* The one live region: a short status line, visible only while searching. */}
          <p aria-live="polite" className={matches ? "px-4 pb-6 text-sm text-muted" : "sr-only"}>
            {status}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              query={deferredQuery}
              categoryTitle={categoryTitle}
              elsewhere={queryMatched.length}
              contributeUrl={contributeUrl}
              onShowAll={() => changeCategory(ALL)}
              onReset={() => {
                changeQuery("");
                changeCategory(ALL);
              }}
            />
          ) : groups ? (
            groups.map(({ section, entries }) => (
              <SectionBlock key={section.id} section={section} entries={entries} matches={matches} showPath />
            ))
          ) : (
            categories
              .filter((c) => category === ALL || c.id === category)
              .map((c) => (
                <div key={c.id} id={c.id} data-section={c.id} className="scroll-mt-32 pb-6 lg:scroll-mt-20">
                  <h2 className="px-4 pb-6 text-2xl font-semibold tracking-[-0.025em]">{c.title}</h2>
                  {sections
                    .filter((s) => s.categoryId === c.id && s.depth > 2)
                    .map((section) => (
                      <SectionBlock
                        key={section.id}
                        section={section}
                        entries={visible.filter((e) => e.sectionId === section.id)}
                        matches={null}
                      />
                    ))}
                </div>
              ))
          )}
          {/* The empty state has its own submit link, so the closing content only follows real results.
              Search results lack the category wrapper's bottom padding, so add it back here. */}
          {visible.length > 0 && <div className={groups ? "pt-6" : undefined}>{children}</div>}
        </div>
      </div>
    </>
  );
}

type EmptyStateProps = {
  query: string;
  categoryTitle: string | undefined;
  /** Matches across all categories. Non-zero means the category filter hid them. */
  elsewhere: number;
  contributeUrl: string;
  onShowAll: () => void;
  onReset: () => void;
};

function EmptyState({ query, categoryTitle, elsewhere, contributeUrl, onShowAll, onReset }: EmptyStateProps) {
  const button =
    "mt-6 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-line-strong";

  if (categoryTitle && elsewhere > 0) {
    return (
      <div className="mx-4 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
        <p className="text-[15px] font-medium">No results in {categoryTitle}</p>
        <p className="mt-1.5 text-sm text-muted">{plural(elsewhere, "match", "matches")} in other categories.</p>
        <button type="button" onClick={onShowAll} className={button}>
          Search all categories
        </button>
      </div>
    );
  }

  return (
    <div className="mx-4 rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="text-[15px] font-medium">Nothing matches "{query}"</p>
      <p className="mt-1.5 text-sm text-muted">
        Try a broader term, or{" "}
        <a href={contributeUrl} className="text-fg underline decoration-line-strong underline-offset-[3px] hover:decoration-current">
          suggest a resource
        </a>{" "}
        for the list.
      </p>
      <button type="button" onClick={onReset} className={button}>
        Clear search
      </button>
    </div>
  );
}

/**
 * Tracks the last section whose top is within 24px of the sticky toolbar,
 * falling back to the first section. At the bottom of the page, sections can
 * no longer reach the toolbar, so a visible #hash target wins there.
 * `layoutKey` re-runs it when the list changes.
 */
function useActiveSection(toolbarRef: RefObject<HTMLElement | null>, layoutKey: string) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      const all = document.querySelectorAll<HTMLElement>("[data-section]");
      let current = all[0]?.dataset.section;
      for (const el of all) {
        if (el.getBoundingClientRect().top > line) break;
        current = el.dataset.section;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const hashed = atBottom ? document.getElementById(window.location.hash.slice(1)) : null;
      // Only a target whose heading is on screen but could not reach the line. One above
      // the line is already handled by the loop, and one off screen was scrolled past.
      const top = hashed?.getBoundingClientRect().top ?? 0;
      if (hashed?.dataset.section && top > line && top < window.innerHeight) current = hashed.dataset.section;
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [toolbarRef, layoutKey]);

  return activeId;
}

/** Focuses the search field on "/" or Cmd/Ctrl+K, unless the user is typing elsewhere. */
function useSearchShortcut(inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const slash = event.key === "/" && !typing;
      const modK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!slash && !modK) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inputRef]);
}

type UrlState = {
  query: string;
  setQuery: (q: string) => void;
  category: string;
  setCategory: (c: string) => void;
  categories: Section[];
  settled: boolean;
};

/**
 * Reads ?q= and ?category= once after hydration, then mirrors state back with
 * replaceState. The write effect skips its first run, which still sees the
 * pre-URL state and would otherwise strip the params before they apply.
 *
 * The browser scrolls to a #section in the full server-rendered list, before
 * the filter shortens it. So when the URL also filters, scroll to the hash
 * again once the filtered list has rendered.
 */
function useUrlState({ query, setQuery, category, setCategory, categories, settled }: UrlState) {
  const ready = useRef(false);
  const pendingHash = useRef<string | undefined>(undefined);

  // Declared before the read effect so the mount commit, which still shows the full list, skips it.
  useEffect(() => {
    if (!pendingHash.current || !settled) return;
    // Section ids are ASCII slugs, so the raw hash needs no decoding (which can throw).
    const target = document.getElementById(pendingHash.current);
    // A section the filter hides would leave the page clamped at the footer, so start over at the top.
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
    pendingHash.current = undefined;
  }, [settled, query, category]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    const fromUrl = params.get("category");
    const validCategory = fromUrl && categories.some((c) => c.id === fromUrl) ? fromUrl : undefined;
    setQuery(q);
    if (validCategory) setCategory(validCategory);
    if ((q.trim() || validCategory) && window.location.hash) pendingHash.current = window.location.hash.slice(1);
  }, []);

  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      return;
    }
    const url = new URL(window.location.href);
    const set = (key: string, value: string) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    set("q", query.trim());
    set("category", category === ALL ? "" : category);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [query, category]);
}
