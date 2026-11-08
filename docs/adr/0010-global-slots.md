# ADR-0010: The header and footer are blocks in named global slots

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The site settings first held one header shape (a flat list of links) and one footer shape (a
text line and a list of links), written into `siteSettingsSchema`. Backstage is consumed by many
projects and they will not share a header or a footer: one needs a call to action, another a
dropdown navigation, another a footer with columns, several texts and an image. With a fixed
schema, each of those is a release of Backstage, which [ADR-0003](0003-blocks-in-code.md)
rules out: only the registry changes between sites.

## Decision

- **A registry declares slots.** `defineRegistry(blocks, { slots })` maps a slot name to the
  names of the blocks it may hold. `header` and `footer` are the convention; any other
  lowercase name works, such as an announcement bar.
- **A slot holds one block**: its name, schema version and content, in the `site_blocks` table
  keyed by slot. Columns, texts, images, a call to action and nested dropdown items are fields
  of that block's own schema, so composition lives inside the schema.
- **Several blocks for a slot are variants.** The editor picks one. The choice is per site, not
  per locale; the content is localized inside the block like any other.
- **The admin stays generic.** `GET /api/v1/slots` serves each slot with the JSON Schema of
  every block it offers and the saved content, and `PUT /api/v1/slots/:slot` saves it. `/settings`
  renders each with the existing `BlockForm`. The API validates every save against the block's
  zod schema (BLK-4) and upgrades older content with `migrate` on read (BLK-5).
- **A slot block belongs to its slot.** It is not offered in the page picker, and a page cannot
  save one.
- **The settings shrink** to what the package reads itself: the site name and the default
  social image. Navigation, footer and contact details leave the schema; contact details are
  fields of the project's footer block. Settings stored before this change keep working, since
  unknown keys are dropped on read.
- **Publishing** carries the slot content in the snapshot with the site settings
  ([ADR-0004](0004-publish-to-kv.md)), and the site wraps a page's blocks in the slot
  components through its layout ([ADR-0011](0011-page-layouts.md)). Publishing is not built
  yet, so only the draft side exists.

## Consequences

- A project defines the header and footer it needs without a Backstage release.
- A project that registers no slots has no header or footer to edit.
- Content already saved in the old navigation and footer fields is not carried over; it was an
  interim shape that was never published.
