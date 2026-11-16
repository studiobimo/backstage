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

- Publishing, unpublishing or deleting a published entry republishes every published page in
  `page_entry_refs` that names the entry, or the collection's "latest". It reuses the batches and
  the KV write budget of [ADR-0014](0014-republish-all-in-batches.md), and the admin shows how
  many pages will update, with progress.

## Consequences

- One admin build still serves every client: the entry form is built from the collection's JSON
  Schema, as a block's is.
- A collection needs no migration for a new field. Its content is JSON, so a field change is a
  `version` bump and a `migrate`, as for a block.
- Searching and sorting by title use the stored `label`, not the content JSON.
- A republish after an entry change costs KV writes in proportion to the pages that show it. The
  admin warns before that, as it does for a full republish.
