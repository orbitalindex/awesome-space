# Awesome Space website

The searchable website for this list, deployed to https://orbitalindex.github.io/awesome-space/. Started from [#31](https://github.com/orbitalindex/awesome-space/issues/31).

The `README.md` one folder up is the only source of content. Every build parses it into categories, sections and entries and renders one static page. To add or change a resource, edit that README as described in [contributing.md](../contributing.md). Nothing in this folder needs to change.

## How it works

- `src/lib/parse.ts` turns the README into typed data. It reads only the region between the `Start Links` and `End Links` markers. It throws on any line it cannot place (a bullet without a link, a link outside a bullet, an unexpected heading), so a format change fails the build instead of deploying a page with missing entries.
- `src/lib/search.ts` indexes titles, section names, descriptions and hostnames with [MiniSearch](https://github.com/lucaong/minisearch). Prefix matching is on, and terms longer than four characters tolerate typos.
- `src/components/Directory.tsx` is the one React island. Astro renders the full list to HTML, so the page works without JavaScript. Hydration adds search, category filters and the section navigation. The query and category sync to `?q=` and `?category=`, so a search can be shared as a link.

Built with Astro, Tailwind CSS, [Base UI](https://base-ui.com) and [Heroicons](https://heroicons.com).

## Development

Run these from this folder:

```sh
pnpm install
pnpm dev          # reads ../README.md
pnpm test         # parser and search tests
pnpm check        # astro check (types)
pnpm build
```

Set `AWESOME_SPACE_README=<path>` to build from a different copy of the list.

## Deploy

`.github/workflows/site.yml` at the repo root builds the site on every pull request. A README change the parser cannot read fails that check. Each push to `master` also deploys to GitHub Pages at `/awesome-space`, so a merged entry is live a few minutes later. The repository's Pages source must be set to "GitHub Actions". For a custom domain, set `SITE_URL` and `BASE_PATH=/` in the workflow.

## License

The list content is [CC0](https://creativecommons.org/publicdomain/zero/1.0/). The site code is MIT, see [LICENSE](LICENSE).
