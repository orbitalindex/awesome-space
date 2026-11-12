// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Deployed to GitHub Pages under /awesome-space. Override both for a custom domain.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://orbitalindex.github.io",
  base: process.env.BASE_PATH ?? "/awesome-space",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
