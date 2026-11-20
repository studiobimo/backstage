# ADR-0016: The package owns the site Worker, and a site overrides only what is its own

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

A client's admin Worker is `createAdmin(registry)`. Its site Worker was about 300 lines in
`apps/site/worker`: routing and the edge cache, the Content-Security-Policy, the block preview, the
document shell with SEO and the language switcher, the stylesheet route and media. A fix to any of
them, including a security fix, reached a client through a template sync in each repository, not
through a package bump, and the copies drifted ([#278](https://github.com/studiobimo/backstage/issues/278)).

## Decision

`@studiobimo/backstage/site/hono` exports `createSite(options)`, which returns a Hono app. The
Hono-free helpers stay in `./site`, so a site that moves to TanStack Start keeps them
([ADR-0015](0015-entry-points-and-semver.md)).

**The package owns:**

- the route table: health, `/sitemap.xml`, `/robots.txt`, the hashed stylesheet, the block preview and
  its thumbnails, `/media/*`, and a page for every published route, with the edge cache, the 404 and
  the 500;
- the locales, read from the registry, for routing, the sitemap, translations and the switcher;
- the document: head, canonical and alternate links, Open Graph, the layout with the site snapshot's
  slots, and the language switcher;
- the security headers: a strict policy (`default-src 'none'`, no inline script or style, no
  framing), and `frame-ancestors <ADMIN_ORIGIN>` plus cross-origin thumbnails on the preview only.

**A site supplies or may add:**

| Option                  | Required | Effect                                                                                                     |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `components`            | yes      | the blocks and layouts to render, and through them the locales                                             |
| `stylesheet`            | yes      | the CSS, served under a content-hashed path and linked from every document                                 |
| `preview`               | no       | samples, media, thumbnails and assets for the block preview; none, no route                                |
| `contentSecurityPolicy` | no       | sources added to `style-src`, `img-src`, `font-src`, `media-src`, `connect-src`, `script-src`, `frame-src` |
| `favicon`               | no       | a URL, or `{ href, type }`, rendered as `<link rel="icon">` in every page and entry document               |
| `head`                  | no       | extra elements in a page's `<head>`                                                                        |
| `scripts`               | no       | same-origin module scripts added to every document; adds `script-src 'self'`                               |
| `routes`                | no       | extra routes, registered before the page route                                                             |

**Adding a script.** `default-src 'none'` blocks every script, so a same-origin script needs a
policy entry and a tag. Declare it instead of wiring both by hand: `scripts: ['/cart.js']` adds
`<script type="module" src>` to every document (pages, entry pages, the block preview and
`renderInShell` routes), and a block's `clientScript: '/cart.js'` adds it only to documents that
render that block, once whatever the number of instances. Either one adds `'self'` to `script-src`
and changes nothing else in the policy. Inline scripts stay blocked, so a script reads its
configuration from `data-*` attributes. Paths must be same-origin (a full URL or `//host/x` throws),
and the site serves the file from its own assets or a route added with `routes`. `head` still works
for a script that needs other attributes, but it receives page snapshots only. The favicon needs no
policy change: it loads under `img-src 'self'`, so a cross-origin one needs its origin in `imgSrc`.

**A site cannot** relax `default-src`, `base-uri`, `form-action` or `frame-ancestors`, change the
cache policy, or replace the document shell. A change like that is a change to the package, so every
client gets it with a bump.

## Consequences

- `apps/site/worker/index.ts` shrinks to `createSite({ components, stylesheet, preview })` and
  whatever is the site's own. It can only do so after a release, because `apps/site` depends on the
  published package.
- `SiteEnv` gains `SITE_URL`, which the Worker needs for canonical links and the sitemap.
- The site's tests no longer cover the routing and headers; the package's tests do, against a
  fixture site.
