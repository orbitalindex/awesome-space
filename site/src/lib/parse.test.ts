import { describe, expect, it } from "vitest";
import { parseReadme, plain, splitEntry, tokenize } from "./parse";

const readme = `# Awesome Space

* [Table of contents](#ignored)

<!-- Start Links (do not remove me) -->

## Astronomy

### SDKs &amp; Software Development Tools

* [AstroPy](https://www.astropy.org) - Collection of packages for \`astronomy\`.
* [SpaceEngine](https://spaceengine.org) : Realistic universe simulator.
* [Space Jargon](https://github.com/LunCoSim/lunco-space-jargon) – list of space terms

#### Visualization

* [Celestia](https://celestia.space/) - Free 3D space. (See also [Motherlode](http://www.celestiamotherlode.net/).)

## Spacecraft

### General Software

* [Hack-A-Sat Library](https://github.com/deptofdefense/hack-a-sat-library) has links and videos.
* [software.nasa.gov](https://software.nasa.gov/) and [code.nasa.gov](https://code.nasa.gov/)
* [MIT Tetra](https://github.com/brownj4/Tetra) and its fork, [ESA Tetra](https://github.com/esa/tetra3) - Star tracker
* OpenLST [hardware](https://github.com/OpenLST/openlst-hw) and [firmware](https://github.com/OpenLST/openlst) - Radio design.
* [Bracket](https://en.wikipedia.org/wiki/Orbit_(disambiguation)) - URL with parentheses.

<!-- End Links (do not remove me) -->

## License
`;

describe("parseReadme", () => {
  const { categories, sections, entries } = parseReadme(readme);

  it("reads every bullet inside the Links markers, and nothing outside", () => {
    expect(entries).toHaveLength(9);
    expect(categories.map((c) => c.title)).toEqual(["Astronomy", "Spacecraft"]);
  });

  it("builds section paths and decodes entities", () => {
    const viz = sections.find((s) => s.title === "Visualization");
    expect(viz?.path).toEqual(["Astronomy", "SDKs & Software Development Tools", "Visualization"]);
    expect(viz?.id).toBe("visualization");
    expect(viz?.parentId).toBe("sdks-software-development-tools");
    expect(sections[1].id).toBe("sdks-software-development-tools");
  });

  it("splits on dash, en dash and colon separators", () => {
    expect(entries.slice(0, 3).map((e) => [plain(e.title), plain(e.description)])).toEqual([
      ["AstroPy", "Collection of packages for astronomy."],
      ["SpaceEngine", "Realistic universe simulator."],
      ["Space Jargon", "List of space terms"],
    ]);
  });

  it("keeps inline links in descriptions", () => {
    const celestia = entries[3];
    expect(celestia.description.find((s) => s.href)).toEqual({
      text: "Motherlode",
      href: "http://www.celestiamotherlode.net/",
    });
    expect(celestia.sectionId).toBe("visualization");
    expect(celestia.categoryId).toBe("astronomy");
  });

  it("handles bullets without a separator", () => {
    const [hackASat, nasa] = entries.slice(4, 6);
    expect(plain(hackASat.title)).toBe("Hack-A-Sat Library");
    expect(plain(hackASat.description)).toBe("Has links and videos.");
    expect(plain(nasa.title)).toBe("software.nasa.gov and code.nasa.gov");
    expect(nasa.description).toEqual([]);
  });

  it("moves a trailing aside into the description", () => {
    const { title, description } = splitEntry(tokenize("[a](https://a.dev) and [b](https://b.dev) (binary protocol)"));
    expect(plain(title)).toBe("a and b");
    expect(plain(description)).toBe("Binary protocol");
  });

  it("uses the first link as the entry URL", () => {
    expect(plain(entries[6].title)).toBe("MIT Tetra and its fork, ESA Tetra");
    expect(entries[6].url).toBe("https://github.com/brownj4/Tetra");
    expect(entries[7].url).toBe("https://github.com/OpenLST/openlst-hw");
    expect(entries[0].host).toBe("astropy.org");
  });

  it("keeps balanced parentheses in URLs", () => {
    expect(entries[8].url).toBe("https://en.wikipedia.org/wiki/Orbit_(disambiguation)");
  });

  it("reads dash and indented bullets", () => {
    const withDash = readme.replace("* [SpaceEngine]", "- [SpaceEngine]").replace("* [Space Jargon]", "  * [Space Jargon]");
    expect(parseReadme(withDash).entries).toHaveLength(9);
  });

  it("fails loudly on a link it would otherwise drop", () => {
    const prose = readme.replace("* [AstroPy]", "See [AstroPy]");
    expect(() => parseReadme(prose)).toThrow(/outside a bullet/);
  });

  it("fails loudly on headings and bullets it cannot place", () => {
    expect(() => parseReadme(readme.replace("#### Visualization", "##### Visualization"))).toThrow(/heading level/);
    expect(() => parseReadme(readme.replace("### General Software", ""))).toThrow(/outside a ###/);
  });

  it("fails loudly on a bullet without a link", () => {
    const broken = readme.replace("* [AstroPy](https://www.astropy.org)", "* AstroPy");
    expect(() => parseReadme(broken)).toThrow(/without a link/);
  });
});

describe("tokenize", () => {
  it("leaves unmatched brackets as text", () => {
    expect(tokenize("a [b] c")).toEqual([{ text: "a [b] c" }]);
  });
});

describe("splitEntry", () => {
  it("ignores separators inside link text", () => {
    const { title } = splitEntry(tokenize("[A - B](https://x.dev) - desc"));
    expect(plain(title)).toBe("A - B");
  });
});
