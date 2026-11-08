# Awesome Space Index

A searchable website for [Awesome Space](https://github.com/orbitalindex/awesome-space), the list of space-related code, APIs and data curated by [The Orbital Index](https://orbitalindex.com). Started from [orbitalindex/awesome-space#31](https://github.com/orbitalindex/awesome-space/issues/31).

The upstream README is the only source of content. Every build fetches it, parses it into categories, sections and entries, and renders one static page. A daily GitHub Actions run rebuilds and redeploys, so entries merged upstream show up after the next run. To add or change a resource, open a PR on [orbitalindex/awesome-space](https://github.com/orbitalindex/awesome-space/blob/master/contributing.md), not here.

## How it works

- `src/lib/parse.ts` turns the README into typed data. It reads only the region between the `Start Links` and `End Links` markers, and it throws on any line it cannot place (a bullet without a link, a link outside a bullet, an unexpected heading), so a format change fails the build instead of deploying a page with missing entries.
- `src/lib/search.ts` indexes titles, section names, descriptions and hostnames with [MiniSearch](https://github.com/lucaong/minisearch). Prefix matching is on, and terms longer than four characters tolerate typos.
- `src/components/Directory.tsx` is the one React island. Astro renders the full list to HTML, so the page works without JavaScript. Hydration adds search, category filters and the section navigation. The query and category sync to `?q=` and `?category=`, so a search can be shared as a link.

Built with Astro, Tailwind CSS, [Base UI](https://base-ui.com) and [Heroicons](https://heroicons.com).

## Development

```sh
pnpm install
pnpm dev          # fetches the upstream README on each build
pnpm test         # parser and search tests
pnpm check        # astro check (types)
pnpm build
```

To work offline, save the README locally and point the build at it:

```sh
mkdir -p .cache && curl -sL https://raw.githubusercontent.com/orbitalindex/awesome-space/master/README.md -o .cache/README.md
AWESOME_SPACE_README=.cache/README.md pnpm dev
```

## Deploy

`.github/workflows/site.yml` deploys to GitHub Pages at `/awesome-space-index`. Set the repository's Pages source to "GitHub Actions". For a custom domain, set `SITE_URL` and `BASE_PATH=/` in the workflow.

GitHub turns off scheduled workflows after 60 days with no commits to the repository. If the site stops picking up upstream changes, re-enable the workflow in the Actions tab or run it by hand.

## License

The list content is [CC0](https://creativecommons.org/publicdomain/zero/1.0/) from The Orbital Index. The site code is MIT.
