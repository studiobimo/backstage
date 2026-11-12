# ADR-0003: Content types are defined in code, and the admin builds its forms from them

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Contentful-style CMSs let editors define content types in the UI. Doing that well means building
dynamic schemas, migrations and a type builder. It also lets editors make content that the
design cannot show. Here the studio designs every site, so every type already exists in the
design. belen-core has a registry of modules, each with a schema, which has held up well.

## Decision

- **A block's schema and its component are defined apart.** `defineBlock` gives the name, the zod
  schema, the version, `migrate`, the title and the description, with no React. The
  registry of schemas is what both Workers validate with. `defineComponents(registry, { blocks,
layouts })` maps each block and each layout to a React component. It is type-checked: a missing
  component, or one whose props are not the schema's output, fails `tsc`. Thumbnails are site-owned: the site Worker serves each
  block's at `/__preview/blocks/<name>/thumbnail.svg` and the admin loads it from the site origin.
  Collections
  ([E6](../PRD.md#e6-collections)) are defined the same way.
- **The site owns its blocks.** Each block lives in the site's `src/blocks/<name>/` with its schema,
  its sample and its component, and the site owns its stylesheet. The admin depends on the site for
  the schema registry, never the reverse, so the admin bundle carries no block component.
  `@studiobimo/backstage` keeps the mechanism and a fixture registry for its own tests, not any
  site's blocks.
- Helpers in `packages/backstage` mark field kinds that zod cannot express on its own: image,
  rich text, link, reference and localized.
- The admin API serves each schema as JSON Schema (zod 4 `z.toJSONSchema`). **The admin SPA is
  generic**: it renders forms from that JSON Schema and knows no block in advance.
- The API validates every save, and every publish, against the zod schema.
- Each stored block records its schema version, and a block may provide `migrate` (BLK-5).

## Consequences

- One admin build serves every client. Only the schema registry changes between sites.
- A block's component can use anything the site can, such as motion or coss ui, without the admin
  bundling it.
- Editors cannot break the design, and they cannot add a field the studio did not plan for.
- A new kind of field means a release of Backstage, not just a change to one site.
