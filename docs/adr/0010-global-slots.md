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
- **Publishing the site is its own action**, "Publish site" on `/settings`, with the same
  draft and live model as a page. Saving a slot or the settings changes the draft only.
  Publishing validates what the site would show, with the same problems and checks as a page
  (an unknown or invalid block, an image that left the library, an unsafe link, a missing value
  in the default language, and a site name missing in the default language), and refuses with a
  named problem that carries the slot. It then writes **one site snapshot per locale** to KV
  under `site:<locale>`, beside the page snapshots ([ADR-0004](0004-publish-to-kv.md)), and
  records when and by whom in D1 (`site_publication`). The slots are checked and upgraded with
  `migrate` at that moment, like page blocks.
- **The snapshot holds** the slot blocks, the site name resolved for the locale (falling back to
  the default language), the default description, the default social image and the media they
  reference. Its `format` field versions it like a page snapshot.
- **One snapshot per locale, not one key**, so the site reads exactly one small key per request,
  its media alt text is in the language of the page, and it mirrors page snapshots. A publish
  spends two KV writes.
- **The site reads the site snapshot beside the page**, through the same edge cache, and passes
  each slot to the page's layout ([ADR-0011](0011-page-layouts.md)). It has no D1 binding. A site
  that was never published renders pages without slots, and with the page title alone.
- **The SEO defaults live in the site snapshot only.** A page snapshot keeps what the page has
  and the site falls back to the defaults when it renders, so changing a default needs no page
  republished. The page snapshot keeps `format: 1`; it already allowed an empty description and a
  missing social image.
- **The admin knows what is unpublished** by recording the version of the settings and of each
  slot block at publish time in `site_publication`, and comparing them with the current versions
  ([#275](https://github.com/studiobimo/backstage/issues/275)). A slot added or removed counts
  too. It costs two small D1 reads and runs no validation. A change to an image's alt text alone
  does not flag the site; it reaches the site at the next publish.

## Consequences

- A project defines the header and footer it needs without a Backstage release.
- A project that registers no slots has no header or footer to edit.
- A header or footer an editor saves is not on the site until someone publishes the site, which
  the settings page says.
- A project upgrading must publish the site once, and update the site Worker with the admin: pages
  published after the upgrade no longer carry the SEO defaults, so an older site shows none until
  it reads the site snapshot.
- Content already saved in the old navigation and footer fields is not carried over; it was an
  interim shape that was never published.
