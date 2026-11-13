# ADR-0004: Publishing writes a snapshot to KV, and the site renders it on the Worker

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

A marketing site needs good SEO, fast pages and publishing without a deploy. There were three
options:

- **A static rebuild on publish:** fast pages, but a publish takes minutes and needs CI
  credentials.
- **Astro:** a second framework next to the studio's React stack.
- **Rendering on the Worker from stored content:** keeps one framework and publishes at once.

## Decision

- Publishing validates the page, resolves its references and writes **one JSON snapshot per page
  and locale to KV**. KV also holds an index of published pages.
- Publishing the site is a separate action that writes **one site snapshot per locale**,
  `site:<locale>`, with the header, the footer, the site name and the SEO defaults
  ([ADR-0010](0010-global-slots.md)). The site reads it beside each page, through the same cache.
- The site worker reads the snapshot and **renders it with React on the server**
  (`renderToReadableStream`), through Hono. The starter ships no client JavaScript, and there are
  **no islands** in this repository: a custom client build, manifest and props serialization would
  be thrown away when a site moves to a full framework.
- A site that needs interactivity uses **TanStack Start in its own repository**, and the starter is
  revisited once two consumers are on Start. A consumer that hydrates may need a looser
  Content-Security-Policy, which is that consumer's decision ([risk 11](../RISKS.md)).
- Publishing also writes one **route key** per locale, `route:<locale>:<slug>` (the home page's slug
  is empty), whose value is the page id. The site reads the route, then the snapshot, and answers
  404 when the snapshot's slug no longer matches, so a renamed slug never serves the old page.
- Responses are cached at the edge with a short `s-maxage` and stale-while-revalidate (PUB-4):
  `s-maxage=30, stale-while-revalidate=15`. A request the cache holds reads nothing from KV. KV's
  60 seconds and the cache's 45 add up to 105, inside the two minutes promised.
- A preview writes the same kind of snapshot under a random key that expires after an hour (PRV-1).

## Consequences

- KV's 1,000 free writes a day are spent only on publishing, unpublishing, deleting a published page
  and, from M4, previewing ([risk 1](../RISKS.md)).
- KV takes up to about 60 seconds to reach every location, and the cache adds to that. A publish
  is promised within two minutes.
- Server-side React counts against the Worker's size and CPU budget, so a spike in M0 measures it.
- The block components must render on the server in the starter. Anything that needs the browser
  is a site's own concern, in its own repository.
