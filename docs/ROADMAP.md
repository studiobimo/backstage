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

`0.1.0` is on GitHub Packages, published by hand because the release workflow does not run yet
([#271](https://github.com/studiobimo/backstage/issues/271)), so bimo.dev installs it with a token
([guide](guides/package-token.md)). Changes merged after `0.1.0` reach bimo.dev only in the next
release. Anything that needs a
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

## M1.5: The site owns its blocks

A site should look like the studio it belongs to, not like Backstage. The site owns its blocks,
samples and stylesheet, the package keeps only a framework-neutral mechanism, and the admin
previews the site's real blocks in a frame the site serves. It comes before M2 because it changes
the package's API: `defineBlock` loses its component and the `./example` entry goes away.

The design and its decisions are in
[#199](https://github.com/studiobimo/backstage/issues/199#issuecomment-6776022613). The starter
stays on Hono with no client JavaScript. A site that hydrates either mounts a client app on the Hono
site through `renderInShell` ([#467](https://github.com/studiobimo/backstage/issues/467)), or is a
separate site in its own repository that uses the Hono-free `./site` units.

**Stories:** BLK-1, BLK-6, PUB-3 to PUB-6; groundwork for PRV-1.

### Exit criteria

- A block's schema and its component are defined apart, and the admin Worker bundles no block or
  layout component
- The site's helpers (KV reads, routing, SEO, media, edge cache) live in the package and import no
  Hono, and `./render` runs in the browser as well as on the server
- The example blocks, their samples and the site's stylesheet live in `apps/site`, and
  `@studiobimo/backstage/example` is gone
- Lint fails if the site imports from the admin or from Backstage's styles or UI components
- `/blocks` in a deployed admin frames every site block with the site's real styles at phone,
  tablet and desktop widths, and the site renders the same blocks with the same stylesheet
- The preview route can be framed from the admin's origin only, and every other route keeps
  `frame-ancestors 'none'`
- The ADRs and the PRD record the split

### Issues

In working order. Status lives in the
[milestone](https://github.com/studiobimo/backstage/milestone/10).

1. [#201](https://github.com/studiobimo/backstage/issues/201) record the split in the ADRs and PRD
2. [#202](https://github.com/studiobimo/backstage/issues/202) define a block's schema apart from its component
3. [#203](https://github.com/studiobimo/backstage/issues/203) define a page layout apart from its component
4. [#204](https://github.com/studiobimo/backstage/issues/204) render a page's blocks with a shared `<Blocks>`
5. [#205](https://github.com/studiobimo/backstage/issues/205) read published snapshots and routes without Hono
6. [#206](https://github.com/studiobimo/backstage/issues/206) build SEO, media and edge cache responses without Hono
7. [#207](https://github.com/studiobimo/backstage/issues/207) move the example block schemas and samples into the site
8. [#208](https://github.com/studiobimo/backstage/issues/208) move the example block components into the site
9. [#209](https://github.com/studiobimo/backstage/issues/209) remove the example entry and test against a fixture registry
10. [#210](https://github.com/studiobimo/backstage/issues/210) fail lint when the site imports the admin
11. [#211](https://github.com/studiobimo/backstage/issues/211) style the site's blocks with its own Tailwind stylesheet
12. [#212](https://github.com/studiobimo/backstage/issues/212) add coss ui as the site's own components
13. [#213](https://github.com/studiobimo/backstage/issues/213) serve a framable preview of one block from its sample
14. [#214](https://github.com/studiobimo/backstage/issues/214) frame the site's block preview in `/blocks` (closes #199)
15. [#215](https://github.com/studiobimo/backstage/issues/215) check the site has no D1 binding and no admin secret

## M1.6: Hardening

A review of M1, M1.5 and M2 found bugs, races and footguns that a client project would hit on
its first install. They are fixed before the package goes to client projects, so the first
installs do not inherit them.

**Stories:** PUB-1 to PUB-5; PAG-1 to PAG-6; BLK-1 to BLK-6; MED-1, MED-2, MED-4; LOC-1 to LOC-4;
AUT-1, AUT-2; OPS-3; PKG-1 to PKG-3, PKG-5, PKG-6.

### Exit criteria

- Unpublishing, deleting or renaming one page never changes what another page serves
- The header, footer and site name an editor saves reach the site through publishing
- An editor can tell a page whose saved changes are not yet live from one that is up to date
- Page writes and publishing leave D1 and KV consistent after a failure or concurrent edits,
  and the sitemap keeps every published page
- Every environment declares its bindings, and a missing one fails with a clear error
- Bots cannot use up the free plan's KV reads through query strings or impossible paths
- CI runs on every pull request, and a release is published by the workflow. Not met: the
  workflow's Actions do not run, and `0.1.0` was published by hand
  ([#271](https://github.com/studiobimo/backstage/issues/271))
- The built admin works under its own Content-Security-Policy, and the end-to-end run fails on a
  console error
- A page cannot be published with a required field empty in the default locale
- A site sets its own locales and default locale
- Site settings and slots are never lost or overwritten silently, and a refused save names the
  field
- The package's public API is listed, and its server code is out of the site's reach
- Each issue below ships with a test that fails without its fix

### Issues

In working order. Status lives in the
[milestone](https://github.com/studiobimo/backstage/milestone/11).

1. [#271](https://github.com/studiobimo/backstage/issues/271) get the release workflow running and prove it publishes a release
2. [#247](https://github.com/studiobimo/backstage/issues/247) keep unpublishing a page from deleting a route another page owns
3. [#251](https://github.com/studiobimo/backstage/issues/251) allow only one home page at the database level
4. [#252](https://github.com/studiobimo/backstage/issues/252) save the page version and its content in one transaction
5. [#253](https://github.com/studiobimo/backstage/issues/253) stop concurrent publishes from losing sitemap entries
6. [#249](https://github.com/studiobimo/backstage/issues/249) show when a published page has saved changes that are not live
7. [#248](https://github.com/studiobimo/backstage/issues/248) publish the header, footer and site name to the site
8. [#250](https://github.com/studiobimo/backstage/issues/250) find images and translations inside nullable and union fields
9. [#255](https://github.com/studiobimo/backstage/issues/255) localize call-to-action links and image alt overrides
10. [#269](https://github.com/studiobimo/backstage/issues/269) refuse to publish a required localized field with no default-locale value
11. [#254](https://github.com/studiobimo/backstage/issues/254) declare every binding per environment and fail clearly when one is missing
12. [#256](https://github.com/studiobimo/backstage/issues/256) stop query strings and impossible paths from spending KV reads
13. [#257](https://github.com/studiobimo/backstage/issues/257) keep the pages list within the free plan's CPU limit
14. [#258](https://github.com/studiobimo/backstage/issues/258) reject unsafe hrefs in link fields by default
15. [#259](https://github.com/studiobimo/backstage/issues/259) tighten dev auth, cross-site writes and API request headers
16. [#268](https://github.com/studiobimo/backstage/issues/268) let the CSP allow the upload preview and the rich text editor's styles
17. [#280](https://github.com/studiobimo/backstage/issues/280) cover the block form, CSP errors and unpublish end to end
18. [#264](https://github.com/studiobimo/backstage/issues/264) validate blocks once at publish and log any block the site drops
19. [#276](https://github.com/studiobimo/backstage/issues/276) return field errors from the API so the form can show what the server refused
20. [#272](https://github.com/studiobimo/backstage/issues/272) show the copied text when a rich text field copies another language
21. [#273](https://github.com/studiobimo/backstage/issues/273) clear the new page form after it is cancelled or saved
22. [#274](https://github.com/studiobimo/backstage/issues/274) show each page's real address on the site
23. [#275](https://github.com/studiobimo/backstage/issues/275) guard site settings and slots against lost and overwritten changes
24. [#282](https://github.com/studiobimo/backstage/issues/282) say what went wrong when an action fails
25. [#283](https://github.com/studiobimo/backstage/issues/283) name every screen in the breadcrumb and the document title
26. [#284](https://github.com/studiobimo/backstage/issues/284) flag only the list item that has the error
27. [#285](https://github.com/studiobimo/backstage/issues/285) keep one h1 and no empty elements in the example blocks
28. [#263](https://github.com/studiobimo/backstage/issues/263) read image sizes from the file and fall back to WebP when PNG is too large
29. [#260](https://github.com/studiobimo/backstage/issues/260) let the site serve its own block thumbnails
30. [#270](https://github.com/studiobimo/backstage/issues/270) configure a site's locales and default locale
31. [#277](https://github.com/studiobimo/backstage/issues/277) split the package's entry points and shrink its public API
32. [#278](https://github.com/studiobimo/backstage/issues/278) give the site worker a `createSite` like the admin's `createAdmin`
33. [#279](https://github.com/studiobimo/backstage/issues/279) republish every published page in one action
34. [#261](https://github.com/studiobimo/backstage/issues/261) publish the package so consumers need not compile its source
35. [#262](https://github.com/studiobimo/backstage/issues/262) build canonical and sitemap URLs from a configured site URL
36. [#281](https://github.com/studiobimo/backstage/issues/281) check every migration against the drizzle schema
37. [#286](https://github.com/studiobimo/backstage/issues/286) bring the ADRs, PRD and risks back in line with the code

## M2: Package

Backstage becomes something a client project installs, rather than code it copies.

**Stories:** PKG-1 to PKG-6.

### Exit criteria

- `@studiobimo/backstage` is published to GitHub Packages by the reusable workflow in
  `studiobimo/.github`. Not met: `0.1.0` is on GitHub Packages but was published by hand, because
  the workflow's Actions do not run ([#271](https://github.com/studiobimo/backstage/issues/271))
- `apps/site` consumes the published package, not the workspace source. `apps/admin` stays on the
  workspace source, because the package ships the admin SPA's build in `dist/client`
  ([ADR-0008](adr/0008-workspace-profiles-and-styling.md)). The package ships compiled JavaScript
  through the entry points of [ADR-0015](adr/0015-entry-points-and-semver.md). Met for `0.1.0`;
  later changes (the site's header and footer, site locales and `createSite`) wait for the next
  release
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
