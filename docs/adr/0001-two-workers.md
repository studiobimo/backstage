# ADR-0001: Two Workers per site, an admin and a site

- **Status:** Accepted. Amended by [ADR-0019](0019-admin-rpc-entrypoint.md): the site may bind to the
  admin's RPC entrypoint, and to nothing else.
- **Date:** 2026-11-07

## Context

Each site needs an admin, where editors work on drafts, and a public site. Other studio projects
run a React app and a Hono API in one Worker, and that layout works well. A CMS is different: the
public site must not be able to read drafts, and it must keep serving even if the admin breaks.

## Decision

Each site runs as **two Workers**:

- **The admin** at `admin.<domain>` serves a React SPA as static assets, with Hono under
  `/api/*`. It owns D1 (drafts, users, media metadata), R2 (media) and KV (published snapshots).
- **The site** at `<domain>` renders pages from the snapshots in KV and serves media from R2.
  It has no D1 binding, no admin secret and no auth code.

They share no service binding. The only contract between them is the snapshot format in KV, which
`packages/backstage` defines and validates.

## Consequences

- An admin outage or a bad admin deploy leaves the site serving its last published version.
- The site's attack surface is reading a key from KV. A test checks its bindings (PUB-6).
- There are two deploys per site, which the `backstage` profile scripts.
- The admin and the site are on different origins, so they need no CORS and share no cookies.
