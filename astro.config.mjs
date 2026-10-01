// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jlawcordova.com',
  // Static assets live in static/ so that static/public/* keeps its existing
  // /public/* URLs (images are linked from posts and social cards).
  publicDir: './static',
  // HTML-aware whitespace compression; Astro 7's default 'jsx' mode would drop
  // spaces between inline elements that span lines in these templates.
  compressHTML: true,
  markdown: {
    // Prism emits CSS classes, so the code colours live in src/styles/syntax.css.
    syntaxHighlight: 'prism',
  },
});
