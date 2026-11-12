import { describe, expect, it } from "vitest";
import { groupBySection, tocItems } from "./directory";
import { parseReadme } from "./parse";

const { sections, entries } = parseReadme(`<!-- Start Links -->
## Data
### Solar System Data
* [Horizons](https://ssd.jpl.nasa.gov/horizons) - Ephemerides.
#### Orbits
* [Celestrak](https://celestrak.org) - Element sets.
* [Space-Track](https://space-track.org) - Catalog.
## Community
### Learning
* [Course](https://course.dev) - A course.
<!-- End Links -->`);

const summarize = (items: ReturnType<typeof tocItems>) => items.map((i) => [i.section.id, i.count]);

describe("tocItems", () => {
  it("counts categories in total and sections by their own entries", () => {
    expect(summarize(tocItems(sections, entries))).toEqual([
      ["data", 3],
      ["solar-system-data", 1],
      ["orbits", 2],
      ["community", 1],
      ["learning", 1],
    ]);
  });

  it("hides sections with nothing visible below them", () => {
    const orbitsOnly = entries.filter((e) => e.sectionId === "orbits");
    expect(summarize(tocItems(sections, orbitsOnly))).toEqual([
      ["data", 2],
      ["solar-system-data", 0],
      ["orbits", 2],
    ]);
  });
});

describe("groupBySection", () => {
  it("orders groups and entries by score", () => {
    const scores = new Map([
      ["solar-system-data--horizons", { score: 1, terms: [] }],
      ["orbits--celestrak", { score: 2, terms: [] }],
      ["orbits--space-track", { score: 5, terms: [] }],
    ]);
    const groups = groupBySection(entries.slice(0, 3), sections, scores);
    expect(groups.map((g) => [g.section.id, g.entries.map((e) => e.id)])).toEqual([
      ["orbits", ["orbits--space-track", "orbits--celestrak"]],
      ["solar-system-data", ["solar-system-data--horizons"]],
    ]);
  });
});
