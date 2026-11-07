# ADR-0008: The org's profiles inside a workspace, with coss ui and lineup's styling

- **Status:** Accepted, amended 2026-11-07 (bimo.dev moved to its own repository)
- **Date:** 2026-11-07

## Context

`studiobimo/project-template` has a `vite-react-tanstack` profile, for Vite, React 19,
TanStack, zod, i18next, Tailwind 4 and Vitest, and a `cloudflare` profile, for Workers, static
assets and Hono. lineup uses both inside a pnpm workspace, styles them with coss ui, and has a
look the studio wants to reuse.

## Decision

- The repo uses the **`vite-react-tanstack` and `cloudflare` profiles**, in a workspace:

  ```text
  packages/backstage   core, admin API, site renderer, admin SPA
  apps/admin           the smallest admin worker that runs the package
  apps/site            the smallest site worker that renders it, with a few example blocks
  ```

- The `apps/` folders are the package's harness: the smallest consumers that run it end to end,
  for local development and for Playwright. They are what the `backstage` profile in
  project-template will scaffold for a client (PKG-3). They are not bimo.dev, and no real
  site's design lives in them.
- **bimo.dev lives in its own repository** and consumes `@studiobimo/backstage` like any client
  project. Until the package is published (M2) it takes the package by path or as a git
  submodule of this repository.
- **Nothing in this repository is deployed.** The first deploy comes from a consumer: bimo.dev's
  repository, or a test project for M2. The repository has one long-lived branch, `main`, and no
  `development` environment. The `cloudflare` profile's deploy workflow stays inert, because the
  repository variable it waits for is never set.
- The admin uses **coss ui** (the `@coss` shadcn registry) and **lineup's styling**, copied from
  `apps/web/src/index.css` and `components.json` until a shared source exists. An issue on
  `studiobimo/lineup` asks for that source.
- A gap in a profile is fixed in project-template, not here.

## Consequences

- Tooling, hooks and CI come from the template and stay in step through `make -C .devtools sync`.
- The copied styling can drift from lineup's until the shared source exists
  ([risk 9](../RISKS.md)).

## Amendment: bimo.dev moves out (2026-11-07)

The first version made `apps/admin` and `apps/site` "bimo.dev's admin worker" and "bimo.dev's site
worker", deployed to `development` from this repository. That makes the library carry a real site:
its blocks, its domains and its environments. It also means the package would never be used the
way a client uses it.

- **Changed:** bimo.dev is a separate repository and the first consumer. The `apps/` folders shrink
  to a harness, and `apps/site` is the bare minimum for the package to work. This repository
  deploys nothing and has no `development` environment or `develop` branch.
- **Unchanged:** the two profiles, the workspace layout, coss ui and lineup's styling.

### Consequences of the amendment

- Everything that needs a deployed site is checked from a consumer: the free-plan budgets over a
  day of use, Cloudflare Access, custom domains, and the leads and contact form.
- A bug found in bimo.dev is fixed here and released, then bumped there. That is the loop every
  client will have, so the studio meets it first.
- Both repositories need to be checked out side by side while the package is unpublished.
