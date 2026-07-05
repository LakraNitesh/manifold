# Manifold — an interactive ML intuition lab
By Nitesh Lakra

A static website. No build step, no backend, no dependencies —
every algorithm runs live in the visitor's browser.

## Deploy
Upload this folder anywhere that serves static files:
- Netlify / Vercel / Cloudflare Pages: drag & drop the folder
- GitHub Pages: push the contents to a repo, enable Pages
- Any web host: upload via FTP so index.html sits at the site root

## Structure
index.html            — home / learning path (progress saved in the browser via localStorage)
modules/01–10 .html   — the ten playgrounds
assets/style.css      — design system (light + dark, dark is default)
assets/ml.js          — all the machine learning math
assets/engine.js      — shared page engine (quests, missions, narration, code reveal)

## Notes
- Progress and theme are stored per-browser in localStorage.
- Fonts load from Google Fonts (the only external request).
