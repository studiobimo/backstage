# Product requirements: Backstage

- **Status:** Draft for v1
- **Date:** 2026-11-07
- **First site:** `bimo.dev`, edited at `admin.studio.bimo.dev`, in its own repository

## 1. Summary

Backstage is a lean CMS for the marketing sites the studio builds. The studio builds a site's
blocks in code. The client's staff fill them in, arrange them on pages and publish. Each site is
two Cloudflare Workers in the client's own account: an admin, and the public site, which renders
published pages. Both run on the free plan.

## 2. Problem

Studio clients need to change their own copy, photos, menus and events without asking the studio
each time. The available options all fall short:

- **Hosted headless CMSs** (Contentful and others) charge per seat, and they store the client's
  content on their servers.
- **EmDash**, Cloudflare's own CMS, does far more than a marketing site needs and requires Workers
  Paid.
- **Hardcoding the copy**, as the studio does today, makes every typo a deploy.

The studio's clients are waiting for a site they can edit.

## 3. Users

| Persona           | Who                                                          | What they need                                                                                                  |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Studio dev**    | Builds the client's site from a Figma design                 | Define blocks once, in code, with types; get a working admin without building one; ship a new client in a day   |
| **Client editor** | Owner or staff of a café or restaurant, on a laptop or phone | Change text and photos, reorder sections and publish, in their language, without being able to break the design |

## 4. Goals and non-goals

### Goals for v1

1. Pages assembled from blocks the studio defines, edited in forms the admin builds from each
   block's schema.
2. Publishing takes effect without a rebuild, and the site keeps serving the last published
   version whatever happens to the admin.
3. English and Spanish for both the content and the admin.
4. The client's content lives only in the client's Cloudflare account.
5. Runs on Cloudflare's free plan.
6. A new client project goes from an empty repo to a working admin and site by following the
   README.

### Non-goals for v1

- Content types defined in the admin. Types are code ([ADR-0003](adr/0003-blocks-in-code.md)).
- A visual drag-and-drop page designer. Editors arrange blocks in a list and edit them in forms.
- A central hosted service ([research](research/hosted-backstage.md)).
- Scheduled publishing, revision history, image transforms and a form builder (see the roadmap's
  "Later").
- Languages other than English and Spanish. Locales are configuration, so another can follow.
- E-commerce, bookings and memberships.

## 5. Principles

- **Lean.** Each part is a small Worker that a person can read in an afternoon.
- **The client owns their data.** Their content lives in their D1, R2 and KV, in their own
  account.
- **The design stays in code.** Editors change content. They cannot change the layout or styles.
- **The site never goes down because of the admin.** The site reads published snapshots and
  nothing else.

## 6. Concepts

| Term              | Meaning                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Block**         | A section of a page, such as a hero, a feature list or testimonials: a zod schema plus a React component, in code                                     |
| **Page**          | An ordered list of blocks, with a slug and SEO fields for each locale                                                                                 |
| **Collection**    | A type of reusable entry, such as a blog post or a case study, defined in code like a block                                                           |
| **Entry**         | One item in a collection                                                                                                                              |
| **Site settings** | The single document for what the package itself reads: the site name, the logo, the theme color and the default social image                          |
| **Slot**          | A named place on every page, such as the header or footer, that holds one block defined in the site's registry ([ADR-0010](adr/0010-global-slots.md)) |
| **Layout**        | A component in the registry that places the slots around a page's blocks, chosen for each page ([ADR-0011](adr/0011-page-layouts.md))                 |
| **Draft**         | What the admin stores in D1 and edits                                                                                                                 |
| **Snapshot**      | The published, validated JSON of a page, which the admin writes to KV and the site reads                                                              |

## 7. Requirements

Stories are numbered by epic. "Must" is required for the milestone that owns the epic; "Should"
may slip to the next release.

### E1. Blocks

| ID    | Story                                 | Acceptance                                                                                                                                                                                                            | Priority |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BLK-1 | As a dev, I define a block once       | A block's zod schema and its React component are defined apart. The site owns its blocks and their samples, and the admin reads the site's schema registry. Each block's component is type-checked against its schema | Must     |
| BLK-2 | The admin builds the block's form     | The admin reads the schema as JSON Schema from its API. Supported fields: text, rich text, number, boolean, select, image, link, list of items and nested group                                                       | Must     |
| BLK-3 | A field can be localized              | A localized field stores one value per locale; other fields are shared across locales                                                                                                                                 | Must     |
| BLK-4 | Invalid content cannot be saved       | Each error shows on its field, in the editor's language; the API validates with the same schema                                                                                                                       | Must     |
| BLK-5 | Changing a schema keeps saved content | Each block stores its schema version, and a block's `migrate` upgrades old content on read. A publish that would not validate is refused and names the field                                                          | Should   |
| BLK-6 | I can tell blocks apart in the picker | Each block has a name, a description and a thumbnail, in both languages                                                                                                                                               | Should   |

### E2. Pages

| ID    | Story                                               | Acceptance                                                                                                                                                                                                                                                                                                  | Priority |
| ----- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| PAG-1 | I can manage pages                                  | Create, rename and delete a page. Each page has a unique slug for each locale, and the home page has none                                                                                                                                                                                                   | Must     |
| PAG-2 | I can arrange a page                                | Add a block from the picker, then reorder, duplicate or remove it, with the keyboard or a pointer                                                                                                                                                                                                           | Must     |
| PAG-3 | I can set a page's SEO                              | Title, description and social image for each locale, with defaults taken from the site settings                                                                                                                                                                                                             | Must     |
| PAG-4 | I do not lose or overwrite work                     | Leaving with unsaved changes asks first. Saving over a newer version is refused and shows who saved it                                                                                                                                                                                                      | Must     |
| PAG-5 | I can edit the site settings and the global slots   | The site name, logo, theme color and default social image, localized where text, and one section for each slot the registry declares (the header and footer by convention). A slot's form is built from its block's schema, saves are validated against it, and a slot with several blocks lets me pick one | Must     |
| PAG-6 | The admin works on a phone and with a screen reader | Every action works at 360 px, with touch, and from the keyboard alone                                                                                                                                                                                                                                       | Must     |
| PAG-7 | I can choose a layout for a page                    | A select in the page editor lists the layouts in the registry, `default` unless changed. The choice survives publishing and the site renders the slots to match                                                                                                                                             | Should   |

### E3. Media

| ID    | Story                        | Acceptance                                                                                                                                                                         | Priority |
| ----- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| MED-1 | I can upload photos          | JPEG, PNG, WebP and AVIF, checked by magic bytes and capped in size. The browser downscales them and strips EXIF data before uploading. They are stored in R2 under immutable keys | Must     |
| MED-2 | Images have alt text         | Alt text for each locale is required, unless the image is marked decorative                                                                                                        | Must     |
| MED-3 | I can reuse and remove media | A media library to browse, search and reuse images. Deleting an image that is in use is refused, and the message names the pages that use it                                       | Should   |
| MED-4 | Images load fast             | The site serves images from R2 with long, immutable cache headers, and with their width and height to prevent layout shift                                                         | Must     |

### E4. Publish and render

| ID    | Story                              | Acceptance                                                                                                                                                                                                                                                                                                                                                    | Priority |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| PUB-1 | I can publish a page               | Publishing validates the page, writes its snapshot to KV and records who published it and when. The page is live within two minutes                                                                                                                                                                                                                           | Must     |
| PUB-2 | I can unpublish a page             | The snapshot is removed and the URL returns the site's 404 page                                                                                                                                                                                                                                                                                               | Must     |
| PUB-3 | Pages render on the server         | The site worker renders the snapshot with React on the server. The starter ships no client JavaScript; a site that needs interactivity mounts a client app on the Hono site through the planned `renderInShell` ([#467](https://github.com/studiobimo/backstage/issues/467)), or uses a separate site in its own repository with the Hono-free `./site` units | Must     |
| PUB-4 | The site is fast and cheap         | Responses are cached at the edge with a short `s-maxage` and stale-while-revalidate, so most requests never read KV                                                                                                                                                                                                                                           | Must     |
| PUB-5 | Search engines understand the site | `sitemap.xml`, `robots.txt`, `hreflang` and canonical links are generated from the published pages                                                                                                                                                                                                                                                            | Must     |
| PUB-6 | The site cannot see drafts         | The site worker has no D1 binding and no admin secret. It may have any other binding, such as KV, R2, AI or Vectorize. A test checks its bindings                                                                                                                                                                                                             | Must     |
| PUB-7 | The 404 page is editable           | It is an ordinary page, with a reserved slug                                                                                                                                                                                                                                                                                                                  | Should   |

### E5. Locales

| ID    | Story                          | Acceptance                                                                                                                                                                                                                 | Priority |
| ----- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| LOC-1 | The site has a default locale  | A site declares its locales and default in `defineRegistry`; `en` and `es` with `en` as the default if it declares none ([ADR-0007](adr/0007-two-locales.md)). The default is served at `/` and the others at `/<locale>/` | Must     |
| LOC-2 | I edit one locale at a time    | The editor has a locale switcher, and fields with a missing translation are flagged in the page list and in the form                                                                                                       | Must     |
| LOC-3 | Missing translations fall back | On the site, an empty localized value shows the default locale's value                                                                                                                                                     | Must     |
| LOC-4 | The admin speaks my language   | Every admin string comes from i18next in `en` and `es`. `eslint-plugin-i18next` fails the build on a hardcoded string                                                                                                      | Must     |
| LOC-5 | Visitors can switch language   | The switcher links to the same page in the other locale                                                                                                                                                                    | Must     |

### E6. Collections

| ID    | Story                                | Acceptance                                                                                            | Priority |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------- |
| COL-1 | As a dev, I define a collection once | A collection is a zod schema, registered like a block, with localized fields                          | Must     |
| COL-2 | I can manage entries                 | List, search, sort, create, edit and delete the entries of each collection                            | Must     |
| COL-3 | Blocks can show entries              | A block field can refer to chosen entries, the latest N, or a query (where, orderBy, groupBy)         | Must     |
| COL-4 | Entries can have their own pages     | A collection can declare a route, such as `/blog/:slug`, which the site renders with a template block | Should   |
| COL-5 | Publishing an entry updates the site | Every published page that shows the entry reflects the change                                         | Must     |

### E7. Preview

| ID    | Story                           | Acceptance                                                                                                         | Priority |
| ----- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| PRV-1 | I can preview before publishing | Preview writes the draft to a KV key that expires after an hour. The site renders it with the real design          | Must     |
| PRV-2 | Previews stay private           | The preview URL contains a random token. It is marked `noindex`, is never cached and stops working once it expires | Must     |

### E8. Auth

| ID    | Story                                    | Acceptance                                                                                                                                  | Priority |
| ----- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| AUT-1 | Only the client's people reach the admin | The admin sits behind Cloudflare Access, and the worker checks the Access JWT on every API request                                          | Must     |
| AUT-2 | Local development needs no Access        | A bypass is on only when `DEV_AUTH` is `true` and works only on localhost. A deployed Worker with it set answers `500` to every API request | Must     |
| AUT-3 | I can sign in without Zero Trust         | Magic-link sign-in with sessions, as an alternative to Access, chosen per site                                                              | Must     |
| AUT-4 | Owners manage who edits                  | The owner role invites and removes users. Editors edit and publish                                                                          | Must     |
| AUT-5 | I can see who changed what               | Each page and entry shows who last saved it and who last published it                                                                       | Should   |

### E9. Package and onboarding

| ID    | Story                                     | Acceptance                                                                                                                          | Priority |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| PKG-1 | As a dev, I install Backstage             | `@studiobimo/backstage` installs from GitHub Packages with a studiobimo `read:packages` token, locally, in CI and in Workers Builds | Must     |
| PKG-2 | A client's admin is a few lines           | The admin worker imports Backstage and passes it the client's registry. The admin SPA ships prebuilt in the package                 | Must     |
| PKG-3 | A new project is scaffolded               | A `backstage` profile in `studiobimo/project-template` writes `apps/admin` and `apps/site` with their Wrangler configs              | Must     |
| PKG-4 | Setup is written down                     | The README goes from an empty Cloudflare account to a working admin and site: D1, R2, KV, Access and domains                        | Must     |
| PKG-5 | Upgrades are safe                         | Dependabot bumps the package, releases follow SemVer, and breaking changes come with migration notes                                | Must     |
| PKG-6 | Database migrations ship with the package | One make target applies the package's D1 migrations                                                                                 | Must     |

### E10. Operations

| ID    | Story                | Acceptance                                                                                                                | Priority |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| OPS-1 | Content is backed up | A daily cron writes a JSON dump of every content table to R2 and keeps 30 days. A restore script is documented and tested | Must     |
| OPS-2 | Content can move     | Export all content to one file, and import it into an empty instance                                                      | Should   |
| OPS-3 | Problems are visible | Both Workers have a health route, observability turned on and a request id in every log line                              | Must     |

## 8. Quality requirements

- **Free plan.** The design stays within:
  - **Workers:** 100,000 requests a day and 10 ms of CPU per request; each Worker's bundle is
    within its size budget, enforced in CI
  - **KV:** 1,000 writes a day, so writes happen only on publish and preview
  - **D1:** 5 GB
  - **R2:** 10 GB
- **Security:**
  - A strict Content-Security-Policy on both Workers
  - No secret in the site worker
  - CSRF protection on every admin write: Hono's `csrf()` refuses a form-type write from another
    origin, and the JSON routes answer `415` to a body that is not `application/json`
    ([Cloudflare Access guide](guides/cloudflare-access.md))
- **Accessibility:** the admin and bimo.dev meet WCAG 2.2 AA.
- **Performance:** bimo.dev's home page reaches an LCP under 2.5 s on a mid-range phone over 4G.

## 9. Success measures

1. bimo.dev runs on Backstage, and the studio edits it without a deploy.
2. A new client project goes from `gh repo create` to a published home page in under a day.
3. Over one month, no client site goes over a free-plan limit.
4. A client editor publishes a change unaided after a 15-minute walkthrough.
