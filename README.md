# adamarie.ee

Ada Marie Tammiksaar — **töövoogude automatiseerimine**.
Praktiline 1:1 töövoogude automatiseerimine ja tehniline nõustamine. Live: https://adamarie.ee

## Tech
Static site — plain HTML, CSS and vanilla JS. No build step, no dependencies.

## Structure
- `index.html` — landing page
- `privaatsus.html` — privaatsustingimused
- `teenusetingimused.html` — teenusetingimused
- `toovoogude-automatiseerimine.css` — styles
- `toovoogude-automatiseerimine.js` — small interactions (navigation, email copying, current year)
- `assets/` — images (portrait, work photo, Nutikorv)
- `scripts/check-site.mjs` — dependency-free smoke check
- `og-ada-toovoogude-automatiseerimine.jpg` — social share preview (1200×630)
- `robots.txt` — allows search-engine crawling and points to the sitemap
- `sitemap.xml` — canonical URLs submitted to search engines
- `CNAME` — custom domain for GitHub Pages

## SEO

The landing page includes:

- a search-focused title and meta description
- a canonical URL and explicit indexing directives
- Open Graph and Twitter sharing metadata
- JSON-LD structured data for the website, OÜ Adagio, Ada Marie Tammiksaar and the workflow-automation service

The structured data intentionally excludes the company's postal address. Keep its
public contact and offer details aligned with the visible website content whenever
the email address, phone number, price or service changes.

## Positioning decision

Small-business owners remain the primary audience, but being an entrepreneur is not
an entry condition. Women-focused belonging remains implicit until named client
references are ready.

After deploying SEO changes:

1. Verify the `adamarie.ee` domain property in [Google Search Console](https://search.google.com/search-console/) using a DNS TXT record in Zone.
2. Submit `https://adamarie.ee/sitemap.xml`.
3. Inspect `https://adamarie.ee/`, run the live URL test and request indexing.
4. Test structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results).
5. Request a fresh share preview scrape in [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
6. Request a fresh share preview scrape in [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).

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

## GA4 and analytics consent

Before merging/deploying this change:
- Set the actual GA4 web stream Measurement ID in `analytics-consent.js` (empty means analytics and the banner remain disabled). Only the production hostnames load GA4.
- In GA4 Admin, verify the Google tag has no Ads destinations or Ads links, disable Google Signals and enhanced measurement events that are not needed, disable unnecessary granular data, and select 2 months of event/user data retention. Confirm Google's data processing terms and applicable transfer safeguards. Update privacy section 3 with the verified retention setting and the policy effective date before going live.
- Test in a clean browser on the production hostname: no Google Analytics or Tag Manager requests or GA cookies before a choice or after rejection; accept and verify a GA4 page_view in Realtime; reload and navigate between all three pages; reopen settings and reject to verify cookies are removed and tracking stays off after reload and in other tabs. Check mobile layout, keyboard focus and storage-disabled behavior.
- Consent uses basic Consent Mode v2; the Google tag is injected only after a stored grant. Consent and GA cookies have a configured lifetime of 180 days. Local previews intentionally do not send data.
