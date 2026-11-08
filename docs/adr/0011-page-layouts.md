# ADR-0011: A page chooses a layout from a list in the registry

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

[ADR-0010](0010-global-slots.md) gives a site one header block and one footer block. Not every
page uses them alike: a landing page may want no navigation, a campaign page a minimal one, a
legal page the full set. The design stays in code (PRD, principles).

## Decision

- **Layouts are components in the registry**, next to blocks: `defineLayout({ name, component })`
  and `defineRegistry(blocks, { layouts })`. A layout receives the slots, already rendered, and
  the page's blocks as children, and decides whether and how to place them. The names `default`,
  `minimal` and `bare` are the convention.
- **`default` always exists.** The registry offers it even when a project registers no layouts.
- **A page stores the name of its layout**, `default` unless changed, in `pages.layout`. It is one
  choice per page, not per locale, so the locales of a page never differ in shape.
- **The page editor shows a layout select** fed by `GET /api/v1/layouts`. `PUT
  /api/v1/pages/:id/layout` refuses a name the registry does not have.
- **The snapshot carries the name**, and the site picks the matching component. Publishing is not
  built yet, so only the draft side exists.
- Editors cannot switch the header or footer off without a layout for it: a developer adds the
  layout. Named menus (a layout choosing different links) are a further step, only worth it if a
  real page needs different links and not only a different shape.

## Consequences

- Every layout is reviewed and tested in code, so editors cannot break the frame of a page.
- Removing a layout from the registry leaves pages that name it; the site must fall back to
  `default` for a name it does not know.
