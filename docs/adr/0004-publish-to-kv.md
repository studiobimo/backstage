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
  and locale to KV**. KV also holds the site settings and an index of published pages.
- The site worker reads the snapshot and **renders it with React on the server**
  (`renderToReadableStream`). A page ships no JavaScript unless one of its blocks needs some, in
  which case the block is loaded as an island.
- Responses are cached at the edge with a short `s-maxage` and stale-while-revalidate (PUB-4).
- A preview writes the same kind of snapshot under a random key that expires after an hour (PRV-1).

## Consequences

- KV's 1,000 free writes a day are spent only on publishing and previewing ([risk 1](../RISKS.md)).
- KV takes up to about 60 seconds to reach every location, and the cache adds to that. A publish
  is promised within two minutes.
- Server-side React counts against the Worker's size and CPU budget, so a spike in M0 measures it.
- The block components must render on the server. Anything that needs the browser goes in an
  island.
