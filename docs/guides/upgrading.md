# Upgrade notes

- **Status:** Started with [#279](https://github.com/studiobimo/backstage/issues/279). Settles part
  of [PKG-5](../PRD.md) and [#37](https://github.com/studiobimo/backstage/issues/37).

Every release that touches what a snapshot holds adds a line here saying whether to republish.
A snapshot is a full copy of a page made when it was published ([ADR-0004](../adr/0004-publish-to-kv.md)),
so a package upgrade does not change a live page until it is published again.

## When to republish every page

Run **Republish all** on the pages list after an upgrade that:

- **changes the snapshot format** (`SNAPSHOT.format`). The site reads the previous format for one
  release, so nothing breaks while you upgrade, but a page stays in the old format until it is
  published again. Republish before the release after that one, which drops the old format.
- **changes a block's schema with `migrate`.** The site re-runs `migrate` on every request until
  the page is republished.
- **changes data copied into each snapshot,** such as media alt text or the SEO defaults.

A release whose notes do not say so needs no republish.

## How to run it

1. Deploy the upgrade, admin and site.
2. Open the pages list and choose **Republish all**. The dialog shows how many pages it will
   republish and how many KV writes that uses: each page writes its snapshot and its route for
   each language, and the sitemap index is written once at the end.
3. Keep the tab open. Pages are republished in small batches, one batch a second, so no key is
   written more than once a second.
4. Pages that cannot be published as saved (an unknown block, invalid content) are skipped and
   listed with their problems. Fix each one and republish it from its own page.

A page's **saved** content is what goes live. A page with unpublished changes publishes them too;
the dialog says how many pages that is.

## Staying within KV's free plan

The free plan allows 1,000 KV writes a day, shared with every publish and preview. A page costs
four writes with two languages, so about 249 pages fit in a day with the index. A bigger site
runs over several days: **Stop** when the dialog warns you are at the limit, or let a write fail.
The run keeps its place in this browser. Open the pages list the next day and choose **Resume
republishing**; it carries on after the last page it finished. A page that was published by hand
meanwhile is not republished again.

## Releases

### 0.5.0

- **Snapshots are `format: 2`.** A page snapshot now carries the entries its blocks show. The 0.4.0
  site rejects format 2, so every page published by a 0.5.0 admin answers 404 on an older site.
  Deploy the admin and the site Workers together, and move both to 0.5.0 before anyone publishes.
  The 0.5.0 site still reads format 1 through `SNAPSHOT_UPGRADES`, so pages published before the
  upgrade keep working. Republish all is not required, though a page is in format 2 only once it is
  published again.
- **Apply the new D1 migrations, `0010_entries`, `0011_page_entry_refs`, `0012_entry_locales` and `0013` (the published slug,
  added in 0.5.1),**
  with `make migrate` (add `REMOTE=1` and `ENV=<env>` for a deployed database) before the admin
  starts serving 0.5.0.
- **A routed collection (`route: { path: '/posts/:slug' }`) needs a template** in
  `defineComponents`, and an entry is served at its address only after it is published again.
