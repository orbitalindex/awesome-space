import type { Segment } from "../lib/parse";
import { highlight } from "../lib/search";

type Props = {
  segments: Segment[];
  terms: string[];
  /** Stretches the first link over the closest positioned ancestor, making the whole row clickable. */
  stretchFirstLink?: boolean;
};

/** Renders parsed inline markdown, wrapping matched search terms in <mark>. */
export function RichText({ segments, terms, stretchFirstLink = false }: Props) {
  const firstLink = stretchFirstLink ? segments.findIndex((s) => s.href) : -1;

  return segments.map((segment, index) => {
    const content = highlight(segment.text, terms).map((part, i) =>
      part.match ? (
        <mark key={i} className="rounded-[3px] bg-mark text-inherit">
          {part.text}
        </mark>
      ) : (
        part.text
      ),
    );
    if (!segment.href) return <span key={index}>{content}</span>;

    const stretched = index === firstLink;
    return (
      <a
        key={index}
        href={segment.href}
        className={
          stretched
            ? "after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
            : "relative z-10 underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-fg hover:decoration-current"
        }
      >
        {content}
      </a>
    );
  });
}
