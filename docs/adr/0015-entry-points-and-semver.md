# ADR-0015: The package has six entries, and SemVer covers only the public ones

- **Status:** Accepted. Amended by [ADR-0019](0019-admin-rpc-entrypoint.md), which adds the
  `./admin/entrypoint` entry.
- **Date:** 2026-11-12

## Context

`@studiobimo/backstage` started as one barrel that exported everything: the zod contract, every D1
function and table, the KV key helpers and the Hono middleware. Three consumers imported it, and
each needed a different part:

- the admin SPA, a browser bundle, which needs schemas and constants;
- the site worker, which must not reach drafts ([PRD](../PRD.md), PUB-6) yet imported the module that
  exports the D1 access. Tree-shaking kept drizzle out of the bundle, which is a convention and not
  a boundary;
- the admin worker.

Because the SPA lives in `apps/admin` and not in the package, everything it needs had to be public,
so internal helpers were part of the SemVer surface and any refactor was a breaking change
(PKG-5).

## Decision

The package has six entries. Each is mapped to compiled JavaScript and declarations in
`publishConfig.exports`, and `test/pack.test.ts` typechecks and loads every one from a packed
tarball.

| Entry         | For                                 | Reaches                 | SemVer |
| ------------- | ----------------------------------- | ----------------------- | ------ |
| `.`           | what a site author writes           | no D1, no Hono          | yes    |
| `./admin`     | the client's admin worker           | D1, Hono, the admin API | yes    |
| `./site`      | the client's site worker            | no D1, no Hono          | yes    |
| `./site/hono` | the site worker's Hono middleware   | Hono, no D1             | yes    |
| `./render`    | rendering blocks and slots in React | no D1, no Hono          | yes    |
| `./internal`  | the admin SPA and this repo's tests | no D1, no Hono          | **no** |

- **SemVer covers the names listed under the five public entries in the README, with their types and
  behaviour.** Removing or changing one is a breaking change and ships with a migration note.
  Anything the package exports from no public entry is not covered, however it is reachable, and
  neither is the shape of `dist/`.
- **`./internal` is outside SemVer.** It holds the request and response schemas, the constants and the
  helpers that the admin SPA shares with the admin worker. It can change in any release, so
  only code released together with the package may import it. It is browser-safe on purpose: it
  cannot reach `db/`, `drizzle-orm` or `hono`.
- **Server code is reachable only from `./admin`.** The D1 functions, the drizzle tables and the
  publishing steps are not exported. `./admin` exports `createAdmin`, `AdminEnv` and the few helpers
  that seed a database. `test/entry-graph.test.ts` walks the import graph from every other entry and
  fails when it can reach `db/` or `drizzle-orm`. It also fails when anything but `./admin` and
  `./site/hono` can reach `hono`.
- **The site reads what the admin publishes through `./site`:** the KV key layout, the snapshot and
  index schemas and the helpers that build a page's SEO. The admin worker's tests import them from
  there, so the two workers cannot drift apart.
- **A name that nobody imports is removed**, not kept in case. Adding one later is a minor release.

The SPA's source stays in `apps/admin`. Moving it into the package would be a far larger change
than an entry that is documented as internal, and the SPA ships prebuilt anyway
([ADR-0006](0006-private-package.md)).

`./site/hono` leaves room for a Hono-flavoured site entry, which
[#278](https://github.com/studiobimo/backstage/issues/278) adds.

## Consequences

- Refactors behind the five public entries are not breaking changes, and the admin worker, the SPA
  and the site worker can move code without a release note.
- Moving a name between entries is a breaking change for the public entries and nothing for
  `./internal`.
- This change removes the root's server exports, which breaks any consumer that imported them. The
  package is at 0.x, so it ships as a minor release with a migration note.
- A name two consumers need is defined once and re-exported by both entries: `BLOCK_PREVIEW` is in
  `./site` and in `./internal`.
- The README lists every runtime name of the public entries, and `test/pack.test.ts` fails when the
  list and the packed package disagree.
