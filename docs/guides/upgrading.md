# Upgrade notes

- **Status:** Started with [#279](https://github.com/studiobimo/backstage/issues/279). Settles part
  of [PKG-5](../PRD.md) and [#37](https://github.com/studiobimo/backstage/issues/37).

Every release that touches what a snapshot holds adds a line here saying whether to republish.
A snapshot is a full copy of a page made when it was published ([ADR-0004](../adr/0004-publish-to-kv.md)),
so a package upgrade does not change a live page until it is published again.

## When to republish every page

Run **Republish all** on the pages list after an upgrade that:

- **changes the snapshot format** (`SNAPSHOT.format`). The site reads the previous format for one
  release, so nothing breaks while you upgrade, but a page stays in the old format until it is
  published again. Republish before the release after that one, which drops the old format.
- **changes a block's schema with `migrate`.** The site re-runs `migrate` on every request until
  the page is republished.
- **changes data copied into each snapshot,** such as media alt text or the SEO defaults.

A release whose notes do not say so needs no republish.

## How to run it

1. Deploy the upgrade, admin and site.
2. Open the pages list and choose **Republish all**. The dialog shows how many pages it will
   republish and how many KV writes that uses: each page writes its snapshot and its route for
   each language, and the sitemap index is written once at the end.
3. Keep the tab open. Pages are republished in small batches, one batch a second, so no key is
   written more than once a second.
4. Pages that cannot be published as saved (an unknown block, invalid content) are skipped and
   listed with their problems. Fix each one and republish it from its own page.

A page's **saved** content is what goes live. A page with unpublished changes publishes them too;
the dialog says how many pages that is.

## Staying within KV's free plan

The free plan allows 1,000 KV writes a day, shared with every publish and preview. A page costs
four writes with two languages, so about 249 pages fit in a day with the index. A bigger site
runs over several days: **Stop** when the dialog warns you are at the limit, or let a write fail.
The run keeps its place in this browser. Open the pages list the next day and choose **Resume
republishing**; it carries on after the last page it finished. A page that was published by hand
meanwhile is not republished again.

## Releases

### 0.5.0

- **Snapshots are `format: 2`.** A page snapshot now carries the entries its blocks show. The 0.4.0
  site rejects format 2, so every page published by a 0.5.0 admin answers 404 on an older site.
  Deploy the admin and the site Workers together, and move both to 0.5.0 before anyone publishes.
  The 0.5.0 site still reads format 1 through `SNAPSHOT_UPGRADES`, so pages published before the
  upgrade keep working. Republish all is not required, though a page is in format 2 only once it is
  published again.
- **Apply the new D1 migrations, `0010_entries`, `0011_page_entry_refs`, `0012_entry_locales` and `0013` (the published slug,
  added in 0.5.1),**
  with `make migrate` (add `REMOTE=1` and `ENV=<env>` for a deployed database) before the admin
  starts serving 0.5.0.
- **A routed collection (`route: { path: '/posts/:slug' }`) needs a template** in
  `defineComponents`, and an entry is served at its address only after it is published again.

### 0.6.0

- **Apply `0014_page_link_refs`** with `make migrate`. It records which pages link to which, so
  publishing a page republishes the pages that link to it.
- A link field can point to a page. The link table fills as pages are published, so a page that links to
  another page is tracked once it is published again. Republish all is not required.

### 0.7.0

- **Apply `0015_auth_sessions`** (sign-in attempts, magic-link tokens and sessions)
  before the admin serves 0.7.0.
- **Run the migration first:** `make migrate` with `REMOTE=1 ENV=production` (or your environment).
- **Access needs `OWNER_EMAIL` or the `users` table.** An Access identity that is not in `users`
  gets `403` on every request, so set `OWNER_EMAIL` on the admin Worker to the owner's address
  before the deploy. Until 0.8.0, nobody could be an owner without it.
  See [Access](cloudflare-access.md#who-may-sign-in).
- **Sign-in is otherwise unchanged.** Access stays the default. Magic link is the other mode, not
  an addition: set `AUTH_MODE` to `magic-link`, bind `EMAIL`, and set `AUTH_EMAIL_FROM` (and
  `OWNER_EMAIL`) on the admin Worker.
- Publishing now writes a `site:version` key to KV, which the site reads to bust its edge cache.
  There is nothing to create. The snapshot format is unchanged, so Republish all is not required.

### 0.8.0

- **No migration.** `OWNER_EMAIL` is no longer required, but set it before the admin is reachable:
  with it unset and no users, whoever signs in first becomes the owner
  ([who may sign in](cloudflare-access.md#who-may-sign-in)).
- The site snapshot carries a `brand` (`{ logo, themeColor }`), written each time the site is
  published ([ADR-0018](../adr/0018-site-brand-in-settings.md)). A snapshot published before has no
  brand and reads as empty, so use **Publish site** from Settings once after choosing a logo or a
  theme color, or they never reach the site's head. Pages need no republish. A test helper typed
  as `SiteSnapshot` now has to include `brand`, even though the schema defaults it.

### 0.9.0

- No migration and no republish. Deleting an image that a page uses is now refused.

### 0.10.0

- **Apply `0016_submissions` and `0017_submission_updated_by`** with `make migrate`. They add the
  `submissions` table the form inbox reads.
- **The admin's `main` is now `worker/entry.ts`.** It re-exports the admin app and exports
  `AdminEntrypoint = createAdminEntrypoint(registry)`, so the site can call it
  ([ADR-0019](../adr/0019-admin-rpc-entrypoint.md)). Change `main` in the admin's `wrangler.jsonc`
  from `worker/index.ts` and deploy the admin before the site.
- **The site needs an `ADMIN` service binding** to the admin Worker's `AdminEntrypoint`, in each
  environment: `"services": [{ "binding": "ADMIN", "service": "<admin name>", "entrypoint": "AdminEntrypoint" }]`.
  It is needed only when the site submits forms or reads form data.
- **Set `TURNSTILE_SECRET` on the admin Worker** for any form that keeps Turnstile on, which is
  every form unless it sets `turnstile: false` ([ADR-0020](../adr/0020-forms-and-submissions.md)). A
  missing secret refuses every submission. The owner's notification email uses `EMAIL`,
  `AUTH_EMAIL_FROM` and `OWNER_EMAIL` on the admin Worker.
- A registry can declare its own site settings fields, and blocks can read them while they render.
  No snapshot format changed (pages stay `format: 2`), so a block that reads a setting shows it once
  its page is published again.
- A site Worker that serves a client app uses `renderInShell` and the CSP additions in the
  [setup guide](setup.md).

### 0.11.0

- **Apply `0018_entry_position`** with `make migrate`. It adds a manual position to collection
  entries and numbers the existing entries by creation date, so a collection keeps its order.
- New field kinds `weeklyHours()` and `money()`, and and `createSite`'s `scripts` option (or a block's `clientScript`), change nothing
  already published. A site that adds a `money()` field also declares a `currency` setting.
- No snapshot format changed, so no republish is needed.
