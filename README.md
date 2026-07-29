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
- `robots.txt` — allows search-engine crawling and points to the sitemap
- `sitemap.xml` — canonical URLs submitted to search engines
- `CNAME` — custom domain for GitHub Pages

## SEO

The landing page includes:

- a search-focused title and meta description
- a canonical URL and explicit indexing directives
- Open Graph and Twitter sharing metadata
- JSON-LD structured data for the website, OÜ Adagio, Ada Marie Tammiksaar and the AI consulting service

The structured data intentionally excludes the company's postal address. Keep its
public contact and offer details aligned with the visible website content whenever
the email address, phone number, price or service changes.

After deploying SEO changes:

1. Verify the `adamarie.ee` domain property in [Google Search Console](https://search.google.com/search-console/) using a DNS TXT record in Zone.
2. Submit `https://adamarie.ee/sitemap.xml`.
3. Inspect `https://adamarie.ee/`, run the live URL test and request indexing.
4. Test structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results).

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
