# ADR-0008: The org's profiles inside a workspace, with coss ui and lineup's styling

- **Status:** Accepted, amended 2026-11-07 (bimo.dev moved to its own repository), 2026-11-10
  (the site owns its blocks and stylesheet), 2026-11-12 (the admin SPA's source and how the
  package ships) and 2026-11-20 (the site uses the workspace package)
- **Date:** 2026-11-07

## Context

`studiobimo/project-template` has a `vite-react-tanstack` profile, for Vite, React 19,
TanStack, zod, i18next, Tailwind 4 and Vitest, and a `cloudflare` profile, for Workers, static
assets and Hono. lineup uses both inside a pnpm workspace, styles them with coss ui, and has a
look the studio wants to reuse.

## Decision

- The repo uses the **`vite-react-tanstack` and `cloudflare` profiles**, in a workspace:

  ```text
  packages/backstage   core, admin API, site renderer, and the admin SPA's build in dist/client
  apps/admin           the admin SPA's source, and the smallest admin worker that runs the package
  apps/site            the smallest site worker that renders it, with a few example blocks
  ```

- The `apps/` folders are the package's harness: the smallest consumers that run it end to end,
  for local development and for Playwright. They are what the `backstage` profile in
  project-template will scaffold for a client (PKG-3). They are not bimo.dev, and no real
  site's design lives in them.
- **bimo.dev lives in its own repository** and consumes `@studiobimo/backstage` like any client
  project, from GitHub Packages.
- **Nothing in this repository is deployed.** The first deploy comes from a consumer: bimo.dev's
  repository, or a test project for M2. The repository has one long-lived branch, `main`, and no
  `development` environment. The `cloudflare` profile's deploy workflow stays inert, because the
  repository variable it waits for is never set.
- The admin uses **coss ui** (the `@coss` shadcn registry) and **lineup's styling**, copied from
  `apps/web/src/index.css` and `components.json` until a shared source exists. An issue on
  `studiobimo/lineup` asks for that source.
- A gap in a profile is fixed in project-template, not here.

- **The site has its own stylesheet and its own components.** Tailwind v4 with the site's tokens
  lives in `apps/site/src/`, and nothing in it comes from the admin's `index.css`. coss ui is the
  site's default component library, in its `components/ui`, and is swappable per consumer.
- **Motion, the AI SDK, AI Elements and email are per-site additions**, added by a consumer where it
  needs them. They are not part of the starter.

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
- The package is on GitHub Packages (`0.1.0`, published by hand until
  [#271](https://github.com/studiobimo/backstage/issues/271) gets the release workflow running),
  so a consumer no longer needs this repository checked out beside it.

## Amendment: the SPA's source and the compiled package (2026-11-12)

- **The admin SPA's source is `apps/admin`, not `packages/backstage`.** The package's `prepack`
  builds it and copies the result into `dist/client`, which `createAdmin` serves. `apps/admin`
  therefore stays on the workspace source of the package, while `apps/site` consumes the
  published `0.1.0` like a client.
- **The package ships compiled JavaScript and declarations**
  ([#261](https://github.com/studiobimo/backstage/issues/261)), mapped through `publishConfig.exports`
  to the entry points of [ADR-0015](0015-entry-points-and-semver.md), so a consumer needs no
  TypeScript source transform.

## Amendment: the site uses the workspace package (2026-11-20)

- **Changed:** `apps/site` depends on `@studiobimo/backstage` as `workspace:*`, as `apps/admin`
  does. It had installed the published package since
  [#244](https://github.com/studiobimo/backstage/pull/244), so a change to the package reached the
  site only after a release, and a feature and its site template could not land together.
- **Trade-off:** the site no longer proves, on every pull request, that a client can install the
  published package. `make -C .devtools pack-check` replaces that proof: it builds the package, runs
  `pnpm pack`, installs the tarball into a project outside the workspace with only the peer
  dependencies, and type-checks and imports every entry point listed in `publishConfig.exports`. It
  needs no GitHub Packages token. It runs in the full CI suites, not in a narrowed run.
- **Removed:** the repository's `.npmrc`, the `GITHUB_TOKEN` install steps in the e2e workflow, the
  `minimumReleaseAgeExclude` entry for `@studiobimo/*` and the `link-local` targets, which existed
  only to install or bypass the published package.
- **Unchanged:** a client project installs the package from GitHub Packages with a token
  ([guide](../guides/package-token.md)).
