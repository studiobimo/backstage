# ADR-0006: A private repo, and a package on GitHub Packages

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Client projects need Backstage as a dependency they can upgrade, not as code copied into each
repo. The studio wants the source kept private and access to it controlled. Public npm would make
the code public, so that rules it out.

## Decision

- `studiobimo/backstage` stays **private** and publishes `@studiobimo/backstage` to **GitHub
  Packages**.
- The package exports:
  - the core: schemas, field helpers and the registry
  - the admin worker
  - the site renderer
  - the **prebuilt admin SPA**, which the client's admin worker serves as its assets
- A client project installs it with a studiobimo token that has only `read:packages`. The token
  goes in `.npmrc` through an environment variable, in CI as a secret and in Workers Builds as a
  build variable. This token is the access control, so there is no licence system.
- **The prebuilt admin cannot import a consumer's components.** The admin SPA ships prebuilt, so
  it cannot render a block with a component from one consumer's repository. Block preview is
  therefore an **iframe that the site serves**: the site has a preview route that renders one block
  from its sample, and the admin frames it at phone, tablet and desktop widths.
- The preview route is enabled in production, because editors need it there. The admin reads the
  site's origin from configuration. The route allows framing from the admin's origin only
  (`frame-ancestors <admin origin>`), every other route keeps `frame-ancestors 'none'`, and the
  route is `noindex`, never cached and answers 404 for an unknown block. It renders sample content
  only, so it can be public. Draft preview ([PRV-1](../PRD.md)) reuses it behind a token.
- The publish workflow is a reusable workflow in `studiobimo/.github`, like every other shared
  workflow, so other studio packages can use it too.
- Releases are cut by release-please, follow SemVer and carry migration notes for breaking
  changes. Dependabot bumps the package in client repos.

## Consequences

- A client project cannot be installed without the token, and that includes a fork made by the
  client.
- The admin's Content-Security-Policy allows `frame-src` for the site's origin only, and nothing
  else of the site's code enters the admin bundle.
- Each client's token has to be rotated when it leaks or the contract ends ([risk 3](../RISKS.md)).
- `LICENSE` must match a private package before the first release.
