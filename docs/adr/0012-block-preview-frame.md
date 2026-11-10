# ADR-0012: Block preview is a frame the site serves

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

The admin SPA ships prebuilt in the package ([ADR-0006](0006-private-package.md)), so it cannot
render a block with a component from one consumer's repository. The admin still has to show each
block with the site's real design, at phone, tablet and desktop widths.

## Decision

- Block preview is an **iframe that the site serves**. The site has a preview route that renders
  one block from its sample, and the admin frames it at phone, tablet and desktop widths.
- The preview route is enabled in production, because editors need it there. The admin reads the
  site's origin from configuration.
- The route allows framing from the admin's origin only (`frame-ancestors <admin origin>`), and
  every other route keeps `frame-ancestors 'none'`. The route is `noindex`, never cached and answers
  404 for an unknown block. It renders sample content only, so it can be public.
- Draft preview ([PRV-1](../PRD.md#e7-preview)) reuses this route behind a token.

## Consequences

- The admin's Content-Security-Policy allows `frame-src` for the site's origin only, and nothing
  else of the site's code enters the admin bundle.
