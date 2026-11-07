# ADR-0008: The org's profiles inside a workspace, with coss ui and lineup's styling

- **Status:** Accepted
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
  apps/admin           bimo.dev's admin worker, built on the package
  apps/site            bimo.dev's site worker, with its blocks
  ```

- The `apps/` folders are the dogfood, and they are what the `backstage` profile in
  project-template will scaffold for a client (PKG-3).
- The admin uses **coss ui** (the `@coss` shadcn registry) and **lineup's styling**, copied from
  `apps/web/src/index.css` and `components.json` until a shared source exists. An issue on
  `studiobimo/lineup` asks for that source.
- A gap in a profile is fixed in project-template, not here.

## Consequences

- Tooling, hooks and CI come from the template and stay in step through `make -C .devtools sync`.
- The copied styling can drift from lineup's until the shared source exists
  ([risk 9](../RISKS.md)).
