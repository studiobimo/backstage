# ADR-0003: Content types are defined in code, and the admin builds its forms from them

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Contentful-style CMSs let editors define content types in the UI. Doing that well means building
dynamic schemas, migrations and a type builder. It also lets editors make content that the
design cannot show. Here the studio designs every site, so every type already exists in the
design. belen-core has a registry of modules, each with a schema, which has held up well.

## Decision

- **A block is a zod schema plus a React component**, registered once in a registry that both
  Workers import. Collections ([E6](../PRD.md#e6-collections)) are defined the same way.
- Helpers in `packages/backstage` mark field kinds that zod cannot express on its own: image,
  rich text, link, reference and localized.
- The admin API serves each schema as JSON Schema (zod 4 `z.toJSONSchema`). **The admin SPA is
  generic**: it renders forms from that JSON Schema and knows no block in advance.
- The API validates every save, and every publish, against the zod schema.
- Each stored block records its schema version, and a block may provide `migrate` (BLK-5).

## Consequences

- One admin build serves every client. Only the registry changes between sites.
- Editors cannot break the design, and they cannot add a field the studio did not plan for.
- A new kind of field means a release of Backstage, not just a change to one site.
