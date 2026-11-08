# Roadmap

This file lists each milestone: what it is for, which [PRD](PRD.md) stories it delivers, and how
we know it is done. Each milestone is also a GitHub milestone with the same title. **The work
itself and its status live in issues**, not in this file; see
[Planning](../CONTRIBUTING.md#planning-milestones-and-issues).

A milestone closes when every one of its exit criteria is met. Milestones are not tied to version
numbers: release-please sets the versions from the commits.

Client sites such as BackUp Coffee Shop and Brasa Brava are separate projects with their own
roadmaps, and so is bimo.dev. This roadmap covers only Backstage itself.

## bimo.dev, in its own repository

bimo.dev's site and admin are the first consumer of Backstage, not part of it
([ADR-0008](adr/0008-workspace-profiles-and-styling.md)). They live in their own repository, which
the studio starts in parallel once there are blocks to build on. This repository holds only the
harness in `apps/`.

Until the package is published (M2), bimo.dev takes it by path (a `link:` dependency on
`packages/backstage`) or through this repository as a git submodule. Anything that needs a
deployed site, such as the deploys, Cloudflare Access, the custom domains, the leads and contact
form, the home page and the 404 page, is built and checked there. Milestones below that name
bimo.dev are met in that repository.

## M0: Foundation

An empty admin and an empty site, running in workerd.

**Stories:** none.

### Exit criteria

- `make -C .devtools check` passes locally and in CI
- The workspace has `packages/backstage`, `apps/admin` and `apps/site`, the harness
  ([ADR-0008](adr/0008-workspace-profiles-and-styling.md))
- Both Workers run in workerd under a strict Content-Security-Policy. Nothing here is deployed
- Setting up Cloudflare Access for the admin is written down
- The admin shell uses coss ui and lineup's styling, and its strings come from i18next in `en` and `es`
- A Worker over its size budget fails CI

## M1: Pages and blocks

The core loop: define a block in code, fill it in, publish, and see it on the site.

**Stories:** BLK-1 to BLK-4; PAG-1 to PAG-6; MED-1, MED-2, MED-4; PUB-1 to PUB-6; LOC-1 to LOC-5;
AUT-1, AUT-2; OPS-3.

### Exit criteria

- The harness's example page renders from published content, in `en` and `es`
- Every "Must" story above passes its acceptance, on desktop and at 360 px with touch
- A test proves the site worker has no D1 binding and no admin secret
- Unit tests cover schema-to-form for every field kind, and publish validation
- Rich text fields edit with Tiptap and render on the site with no client JavaScript
  ([ADR-0009](adr/0009-rich-text-with-tiptap.md))
- Playwright covers the whole loop: create a page, add blocks, upload an image, publish, see it on the site
- An axe scan of the page editor reports no violations
- The free-plan budgets in the PRD hold during a day of normal use of a deployed consumer
  (bimo.dev, in its own repository)

## M2: Package

Backstage becomes something a client project installs, rather than code it copies.

**Stories:** PKG-1 to PKG-6.

### Exit criteria

- `@studiobimo/backstage` is published to GitHub Packages by the reusable workflow in `studiobimo/.github`
- `apps/admin` and `apps/site` consume the published package, not the workspace source
- The `backstage` profile is released in `studiobimo/project-template`
- On a test Cloudflare account, a fresh repo with the profile and a token reaches a working admin
  and site by following the README alone
- A breaking change in a test release comes with migration notes, and Dependabot opens the bump

## M3: bimo.dev on Backstage

The studio's own site, in its own repository, is the first real install.

**Stories:** BLK-6; MED-3; PUB-7.

### Exit criteria

- One site worker serves both `bimo.dev` and `studio.bimo.dev` as custom domains, and the
  canonical URL is `bimo.dev`
- The admin is live at `admin.studio.bimo.dev`
- The studio has made a week of edits there without a deploy
- Leads and the contact form still work, in the site's own code
- The LCP target in the PRD holds on the home page

## M4: Collections and preview

Repeating content, and seeing a change before it goes live.

**Stories:** COL-1 to COL-5; PRV-1, PRV-2; BLK-5.

### Exit criteria

- bimo.dev shows its case studies and testimonials from collections
- Editing an entry updates every page that shows it
- A preview link renders the draft with the real design, is never cached and stops working after
  an hour
- Content saved before a schema change still opens after it, and a publish that would not
  validate is refused

## M5: Magic-link sign-in and roles

Clients who will not set up Zero Trust can still sign in.

**Stories:** AUT-3 to AUT-5.

### Exit criteria

- A site chooses Access or magic link in its config, and both work in a deployed consumer
- Tests cover token expiry, reuse, and rate limits, and that the session cookie is HttpOnly and
  host-bound
- An editor cannot manage users, and an owner can
- Every page and entry shows who saved it and who published it

## M6: Launch

1.0: ready for the first client projects.

**Stories:** OPS-1, OPS-2.

### Exit criteria

- Every "Must" story in the PRD passes on bimo.dev
- A backup taken from bimo.dev restores into an empty instance, and the result is identical
- The accessibility review against WCAG 2.2 AA is done for the admin
- The PRD's success measures are checked and recorded
- The README and the client setup guide are final

## Later

Not scheduled. Each needs its own ADR before work starts.

- Scheduled publishing
- Revision history and rollback
- Image transforms through Cloudflare Images
- A form builder, with submissions stored in the client's D1
- More locales
