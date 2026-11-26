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

GA4 uses basic Consent Mode v2 and loads only after a saved analytics grant, on HTTPS production hostnames only. Local previews show the consent UI without sending data to Google. Consent and GA cookies have a maximum lifetime of 60 days, without automatic cookie renewal. Advertising consent is always denied.

Keep enhanced measurement, Google Signals, user-provided data, ads personalization, granular location/device data and optional account sharing off; do not link Ads. User and event data retention: 2 months, reset on new activity off. Confirm account settings and data processing terms before deployment.

Before merging:
- Run `node scripts/check-site.mjs` and `node scripts/check-analytics-consent.mjs`.
- In a clean browser, test all three pages, consent and withdrawal, expiry, cookie deletion, multiple tabs, keyboard/mobile layout, storage errors and network requests. Before deployment, intercept Google requests rather than transmit test data. After approved deployment, verify an opted-in page_view in GA4 Realtime.
- Check the privacy policy effective date against the actual publication date.
