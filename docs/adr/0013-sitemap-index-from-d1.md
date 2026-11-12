# ADR-0013: The sitemap index is rebuilt from D1 on every publish, unpublish and delete

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

The sitemap index (`index:pages` in the site KV, [ADR-0004](0004-publish-to-kv.md)) used to be
patched on each publish: read it, change one entry, write it back. KV has no compare-and-set, so
two publishes close together lost an entry. KV also allows about one write per second per key, so
a burst of publishes made the index write fail with a 500 after the page was already live.

## Decision

Publishing runs these steps, in this order:

1. Write the page's snapshots and route keys to KV.
2. Record `published_at` and `published_by` in D1.
3. Rebuild the whole index from one D1 query of the published pages, and write it in one KV put.

Unpublish removes the snapshots, clears the D1 record, then rebuilds. Delete removes the
snapshots, deletes the row, then rebuilds.

- **D1 is the source of truth for which pages are published.** The index is derived from it, so no
  step reads the previous index and there is no read-modify-write to lose an update from.
- **A retry repairs any partial failure.** A crash after step 1 leaves a live snapshot D1 does not
  list; republishing writes the snapshots again and records the page. A crash after step 2 leaves
  an index that lacks the page; the retry, or any later publish, unpublish or delete, rebuilds it.
- **A failing index write does not fail the publish.** The page is live by step 1, so the error is
  logged (`sitemap index rebuild failed`) and the response is still a success. The next rebuild
  repairs the index. The API has no warnings channel today, so nothing is added to the response.
- **The rebuild costs one D1 query** (pages joined to their locales), however many pages exist.

## Consequences

- Two rebuilds can still overlap: a rebuild that read D1 before another publish was recorded can
  put after it. The window is the time between one query and one KV put, and the next rebuild
  closes it. It cannot lose a page for good the way patching could.
- The index takes its slugs from D1, which holds the current slugs. A published page that was
  renamed and not republished appears in the sitemap under its new slug until it is republished,
  while its live URL is the old one. Storing the published slugs beside `published_at` would close
  this, at the cost of a migration.
- Every publish, unpublish and delete spends one KV write on the index, as before.
