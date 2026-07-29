# adamarie.ee

Ada Marie Tammiksaar — **AI teejuht naisettevõtjale**.
Praktiline 1:1 AI ja automatiseerimise abi. Live: https://adamarie.ee

## Tech
Static site — plain HTML, CSS and vanilla JS. No build step, no dependencies.

## Structure
- `index.html` — landing page
- `privaatsus.html` — privaatsustingimused
- `teenusetingimused.html` — teenusetingimused
- `ai-teejuht-koduleht.css` — styles
- `ai-teejuht-koduleht.js` — small interactions (nav, reveal-on-scroll)
- `assets/` — images (portrait, work photo, Nutikorv)
- `scripts/check-site.mjs` — dependency-free smoke check
- `og-ada-ai-teejuht.jpg` — social share preview (1200×630)
- `CNAME` — custom domain for GitHub Pages

## Local preview
Open `index.html` directly, or run a local server:

```sh
python3 -m http.server 8000   # → http://localhost:8000
```

## Verify

Check local file references, in-page anchors and JavaScript syntax:

```sh
node scripts/check-site.mjs
```

## Deploy
Hosted on GitHub Pages — every push to `main` redeploys.
Custom domain (`adamarie.ee`) via the `CNAME` file + DNS records at the registrar.
