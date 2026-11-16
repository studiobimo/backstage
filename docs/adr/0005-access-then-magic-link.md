# ADR-0005: Cloudflare Access first, magic link later

- **Status:** Accepted. Magic link (AUT-3) and roles (AUT-4) are implemented
- **Date:** 2026-11-07

## Context

The admin needs sign-in, and each project already has a tested way to do it:

- **belen-core** puts its app behind Cloudflare Access and checks the Access JWT
  (`worker/auth.ts`). There is no auth code to maintain.
- **jpn-community** has its own magic-link sign-in with sessions (`worker/auth.ts`,
  `worker/email.ts`).

Access is free for up to 50 users, but Zero Trust asks for a payment card, and some clients will
not add one.

## Decision

- **M1 ships Access only.** The admin worker checks `Cf-Access-Jwt-Assertion` against the team's
  keys on every API request. A local bypass is on only when `DEV_AUTH` is exactly `true`, and it works
  only for requests to `localhost`, `127.0.0.1` or `[::1]`. Nothing checks at deploy time: a
  deployed Worker that carries `DEV_AUTH=true` answers `500` to every `/api/*` request, even one
  with a valid token, so it is never left open.
- **M5 adds magic link**, ported from jpn-community, together with owner and editor roles. Each
  site picks one mode in its config.
- Users and roles live in D1 in both modes, keyed by email address.

## Consequences

- Content editing ships without waiting on auth work.
- Until M5, every client needs Zero Trust set up ([risk 2](../RISKS.md)).
- Magic link brings email sending, token storage and rate limits, and its tests come from
  jpn-community.
