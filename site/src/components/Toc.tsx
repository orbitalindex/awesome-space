import { useEffect, useRef } from "react";
import type { TocItem } from "../lib/directory";

type Props = {
  items: TocItem[];
  activeId: string | undefined;
  /** Search mode: one flat list in result order, under a "Results" label, instead of the nested outline. */
  flat: boolean;
  onNavigate?: () => void;
};

const INDENT = { 2: "pl-2", 3: "pl-4", 4: "pl-7" } as const;

/** Table of contents. Every item links to a section rendered on the page. */
export function Toc({ items, activeId, flat, onNavigate }: Props) {
  const navRef = useRef<HTMLElement>(null);

  // Keep the active link inside its scroll container ([data-toc-scroll]) without moving the page.
  useEffect(() => {
    const link = navRef.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const scroller = link?.closest<HTMLElement>("[data-toc-scroll]");
    if (!link || !scroller) return;
    const top = link.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    if (top < scroller.scrollTop || top + link.offsetHeight > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTo({ top: top - scroller.clientHeight / 3 });
    }
  }, [activeId]);

  return (
    <nav ref={navRef} aria-label={flat ? "Result sections" : "Sections"}>
      {flat && <p className="pb-1 pl-2 text-[13px] font-semibold text-fg">Results</p>}
      <ul className="space-y-px text-[13px]">
        {items.map(({ section, count }) => {
          const isCategory = section.depth === 2;
          const active = section.id === activeId;
          return (
            <li key={section.id} className={isCategory ? "pt-4 first:pt-0" : undefined}>
              <a
                href={`#${section.id}`}
                onClick={onNavigate}
                aria-current={active ? "location" : undefined}
                className={[
                  "flex items-center justify-between gap-3 rounded-md py-1 pr-2 transition-colors",
                  flat ? "pl-4" : INDENT[section.depth],
                  isCategory ? "font-semibold text-fg" : "text-muted hover:text-fg",
                  active ? "bg-surface text-fg" : "",
                ].join(" ")}
              >
                <span className="truncate">{flat ? section.path.slice(1).join(" / ") : section.title}</span>
                {count > 0 && <span className="text-[11px] tabular-nums text-faint">{count}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
