# ADR-0017: Collections are defined like blocks, entries are rows, and pages depend on entries

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

[ADR-0003](0003-blocks-in-code.md) says collections are defined the same way as blocks, and
[ADR-0004](0004-publish-to-kv.md) says publishing a page resolves its references. Milestone M4
([E6](../PRD.md#e6-collections)) builds collections in five stories, each in its own pull request.
This ADR records the decisions they share, so that the later ones do not reopen the earlier ones.

## Decision

### A collection is a schema in the registry (COL-1)

- `defineCollection({ name, schema, label, version?, migrate?, title?, description? })` mirrors
  `defineBlock`: the same name rule, the same check that the admin form can render the schema, and
  the same `version` and `migrate` semantics. Upgrading and validating content is the one function
  blocks already use.
- `label` names a top-level field, plain or localized text, that is the entry's title in lists,
  search and pickers. `defineRegistry` rejects a label that is missing or not text.
- Collections are registered with `defineRegistry(blocks, { collections })`. The registry gains
  `collections`, `getCollection(name)` and `collectionJsonSchema(name)`. A duplicate name throws.
  Collections and blocks are separate namespaces. Until the site's own dependency on the package
  moves to a release that has them, the new members sit in a `CollectionRegistry` interface that
  the admin treats as optional, so a registry from an older release still type-checks.
- Localized fields use the `localized()` helper, so a collection needs nothing new for them.
- An entry is one row in `entries`: its draft `content`, a `label` per locale kept in sync on every
  save, an optimistic `version` as pages have, and the `published_*` columns with a copy of the
  published content (`published_content`) and its schema version. Draft and published content are
  both kept, so a draft edit never changes what the site renders.
- The admin API validates every entry save with the collection's schema, and a publish validates
  again and reports the same problems a page does, such as an image that no longer exists or a
  missing default-locale value. Publishing an entry records `published_content`, the version and
  who published it. It writes nothing to KV until an entry is referenced or has a page.

### References resolve from published content (COL-3)

- A block field `entries(collection, { max? })`, marked `backstage: 'reference'`, holds
  `{ mode: 'chosen', ids }` or `{ mode: 'latest', count }`. `defineRegistry` throws if it names an
  unknown collection.
- Publishing a page resolves each reference from the entries' **published** content only, so a
  draft never leaks. `latest` orders by `published_at`, newest first. A chosen entry that is
  unpublished or deleted is dropped from the list, not reported as a problem, so unpublishing an
  entry never blocks a page. Page preview and republish resolve the same way.
- The snapshot carries the resolved entries per collection and the ordered ids per block and
  field path, and its `format` is bumped to 2 with an upgrade for format 1. In a resolved entry a
  localized value keeps only the snapshot's locale, filled from the default locale when blank, so
  the component reads it with `useLocalized` like a block's own fields. The block component
  receives the entries in place of the reference, typed from the collection schema.
- A collection's own schema cannot hold a reference: resolving one entry would need another, and
  `defineRegistry` rejects it.
- The page records what it depends on in `page_entry_refs`: the page, the collection, and the
  entry, or none for "latest of the collection". Every chosen id is recorded, published or not,
  so publishing it later can refresh the page. The rows are replaced on each publish and removed
  on unpublish and with the page.

### Entries can have pages (COL-4)

- `route: { path: '/blog/:slug' }` on a collection declares one `:slug` parameter. An entry then
  has a slug per locale, derived from its label and editable. Publishing it writes an entry
  snapshot and a route key per locale, reusing the page helpers and the sitemap, and
  `createSite` renders it in the layout with the template component given to
  `defineComponents`. Unpublishing removes both.

### Publishing an entry republishes its dependents (COL-5)

- Publishing, unpublishing or deleting a **published** entry refreshes every published page in
  `page_entry_refs` that names the entry, or its collection's "latest". An entry that was never
  published changes nothing a page shows, so it refreshes nothing.
- **A page is refreshed from what it published, never from its draft.** Pages keep no copy of
  their published blocks, but the published snapshot in KV holds them. The refresh reads the
  stored snapshot of each locale, resolves its references again from the entries' published
  content and rewrites only `entries`, `references` and `media`. The title, slug, layout, blocks,
  `version` and `published_version` stay as published, so a newer unpublished draft never goes
  live as a side effect. This differs on purpose from republish-all
  ([ADR-0014](0014-republish-all-in-batches.md)), which republishes the saved version because an
  upgrade is meant to reach every page's current content.
- **It is the same batch endpoint with a narrower scope.** `POST /api/v1/republish` takes an
  optional `entry: { collection, entryId }`. The work list is the published pages that depend on
  that entry after the cursor (page id order), and `GET /api/v1/republish?collection=&entryId=`
  returns the pages left and the KV writes they need. With an entry scope, `since` plays no part,
  because a refresh leaves `published_at` alone and the cursor alone marks progress.
- **Cost.** A refresh writes one snapshot per locale. The route key is unchanged and the sitemap
  index is not rebuilt, since no slug or `published_at` changes. The estimate is
  `kvWritesToRefresh`, pages times locales, counted by a test against the real writes.
- **Inline when it fits, a cursor when it does not.** The entry publish, unpublish and delete
  requests count the dependents after their own write. When they fit one batch
  (`republishBatchSize`), the request refreshes them and answers
  `republish: { pages, writes, pending: false, batch }`. Otherwise it answers
  `{ pages, writes, pending: true, batch: null }` and the admin drives the batch endpoint with the
  entry scope from a null cursor, with the same pause, progress and halt rules as republish-all.
  The request's own D1 calls stand in for the batch overhead the size already allows. Unpublish
  and delete keep the references, so the same lookup finds the pages afterwards. Deleting now
  answers `200` with `republish` instead of `204`.
- The admin shows the page count and the KV writes before publishing or unpublishing an entry (the
  status request above, before the action) and progress while a pending run is driven.

## Consequences

- One admin build still serves every client: the entry form is built from the collection's JSON
  Schema, as a block's is.
- A collection needs no migration for a new field. Its content is JSON, so a field change is a
  `version` bump and a `migrate`, as for a block.
- Searching and sorting by title use the stored `label`, not the content JSON.
- A republish after an entry change costs KV writes in proportion to the pages that show it. The
  admin warns before that, as it does for a full republish.
