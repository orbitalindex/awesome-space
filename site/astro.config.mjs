// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Deployed to GitHub Pages under /awesome-space-index. Override both for a custom domain.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://stivenkn.github.io",
  base: process.env.BASE_PATH ?? "/awesome-space-index",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
