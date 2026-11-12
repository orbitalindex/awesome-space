import { describe, expect, it } from "vitest";
import { parseReadme } from "./parse";
import { createSearch, highlight } from "./search";

const { entries, sections } = parseReadme(`<!-- Start Links -->
## Data
### Orbits
* [Celestrak](https://celestrak.org) - Two-line element sets for every tracked object.
### Earth
* [Landsat](https://landsat.gsfc.nasa.gov) - Satellite imagery of Earth.
* [Orbital Debris Sim](https://debris.dev) - Simulates debris.
<!-- End Links -->`);

const search = createSearch(entries, sections);

describe("createSearch", () => {
  it("matches prefixes and ranks title hits first", () => {
    const ids = [...search("orbit").entries()].sort((a, b) => b[1].score - a[1].score).map(([id]) => id);
    expect(ids[0]).toBe("earth--orbital-debris-sim");
    expect(ids).toContain("orbits--celestrak");
  });

  it("tolerates typos in longer words", () => {
    expect(search("imagry").has("earth--landsat")).toBe(true);
  });

  it("requires every term to match", () => {
    expect([...search("satellite debris").keys()]).toEqual([]);
  });
});

describe("highlight", () => {
  it("flags matched terms case-insensitively", () => {
    expect(highlight("Orbital orbits", ["orbital"])).toEqual([
      { text: "Orbital", match: true },
      { text: " orbits", match: false },
    ]);
  });

  it("skips matches in the middle of a word", () => {
    expect(highlight("suborbital orbital", ["orbital"])).toEqual([
      { text: "suborbital ", match: false },
      { text: "orbital", match: true },
    ]);
  });
});
