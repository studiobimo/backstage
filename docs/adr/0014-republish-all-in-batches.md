# ADR-0014: Republishing every page runs as server-driven batches

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

A snapshot is a copy of a page ([ADR-0004](0004-publish-to-kv.md)), so an upgrade, a block schema
change or site-wide data can make every snapshot stale at once. Publishing 200 pages by hand is
not realistic, and doing it in one request would break two limits: KV allows about one write per
key per second and 1,000 writes a day on the free plan, and a Worker invocation on the free plan
makes at most 50 subrequests (D1 and KV calls).

## Decision

- `POST /api/v1/republish` republishes the next few published pages after a **cursor** (page id
  order) and returns the cursor, what it republished, what it skipped and why, and how many pages
  remain. The client loops, waits `KV_LIMITS.writesPerKeyIntervalMs` between batches and shows
  progress. `GET /api/v1/republish` returns the pages left, the KV writes they need and the daily
  limit, so the dialog shows the cost before anything starts.
- **The batch size is derived,** from `KV_LIMITS.subrequestsPerInvocation` and the worst-case
  subrequests of one page. It is 2 today.
- **The writes shown are counted, not typed in.** One page costs
  `LOCALES.length * SNAPSHOT_RECORDS_PER_LOCALE` writes (snapshot and route per language), and
  the run adds one write for the sitemap index. A test makes the real run and compares the count.
- **The sitemap index is rebuilt once,** in the request that finishes the run
  ([ADR-0013](0013-sitemap-index-from-d1.md)), not per page. Publishing a page records
  `published_at`, so the index only needs to be correct at the end.
- **A page is republished at its saved version** (`planPublish` with the version read in the
  batch query) and `published_version` is recorded as a normal publish does (#249). Unpublished
  saved changes therefore go live, and the dialog says how many pages that affects.
- **A page that cannot be validated is skipped and reported** with the same publish problems the
  editor shows. The cursor moves past it, so it cannot stall the run.
- **A KV failure halts the run** with the cursor at the last finished page instead of failing the
  request, so the editor can resume.

## Resuming without a table

The work list is stateless: the published pages with `published_at` before the run's `since`
timestamp and an id after the cursor. The server picks `since` on the first batch and the client
sends it back each time. A page just republished has a newer `published_at`, so it leaves the list;
a page published by hand during the run leaves it too, which is what an editor wants.

The client keeps `{ since, cursor }` in `localStorage`, so a reload offers **Resume republishing**.
A D1 table would also resume on another device, but it needs a migration, a row to clean up and a
rule for a run abandoned for good, to save writes only when an editor changes browser mid-run. If
that proves wrong, the table holds the same two values and nothing else changes.

## Consequences

- A run is resumable in the browser that started it. Elsewhere it starts again from the first
  page, republishing pages that already finished.
- Two editors running it at once republish some pages twice. The cost is wasted writes, never a
  wrong page.
- The previous snapshot format is read for one release through `SNAPSHOT_UPGRADES`. The site
  snapshot (`site:<locale>`) has its own format and is published separately from Settings.
- Stale route keys removed by a renamed slug are KV deletes, which the free plan counts as writes.
  The estimate does not include them.
