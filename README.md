# Backstage

Lean, reusable CMS for studio marketing sites on Cloudflare's free tier.

Each site is two Cloudflare Workers in the client's own account: an admin where editors fill in
blocks the studio defines in code, and a public site that renders what they publish. bimo.dev is
the first site.

- [Documentation](docs/README.md): product requirements, roadmap, risks and decision records

## Development

Requirements: [mise](https://mise.jdx.dev/getting-started.html).

```sh
make -C .devtools setup      # pinned tools + git hooks
make -C .devtools check      # everything CI runs
make -C .devtools migrate    # apply the D1 migrations locally (REMOTE=1 ENV=production for a deployed one)
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

### Sample content

With `make -C .devtools dev` running (and `DEV_AUTH=true` in `apps/admin/.dev.vars`), fill the
local admin with sample content to try collections, references, drafts and the site:

```sh
make -C .devtools seed       # posts and pages through the admin API; running it again adds nothing
make -C .devtools unseed     # removes only what seed created (slugs and titles it marks as seed)
```

`seed` creates six posts (four published, one with no Spanish text, one draft) and six pages: a
home page only if none exists, a blog with the latest posts, one with chosen posts in order, an
about page, a draft, and a published page with later unpublished edits. It also fills the site
name, header and footer when they are empty, and never overwrites existing ones, so `unseed`
leaves those alone. `ADMIN_URL` overrides `http://localhost:5173`.

`make dev` keeps the admin's and the site's local D1, KV and R2 in one shared `.dev-state`, so
the site shows what the admin publishes with no sync step. The site caches pages for about 45
seconds, so a change can take that long to show. Local data from before this, in
`apps/*/.wrangler/state`, is no longer read: run `make -C .devtools migrate` and `seed` once to
re-create it.

## Bindings and variables

The admin Worker answers every request except `/api/health` with a 500, and logs which binding
is missing, when a required binding is not declared. Declare them in every environment of `wrangler.jsonc`:
`env.production` does not inherit bindings or vars from the top level.

Admin Worker, typed as `AdminEnv` from `@studiobimo/backstage/admin`:

| Name                 | Kind                   | Required   | Purpose                                                             |
| -------------------- | ---------------------- | ---------- | ------------------------------------------------------------------- |
| `DB`                 | D1 database            | yes        | pages, settings, media records (`make -C .devtools migrate`)        |
| `SITE`               | KV namespace           | yes        | published snapshots, shared with the site Worker                    |
| `MEDIA`              | R2 bucket              | yes        | uploaded images, shared with the site Worker                        |
| `ASSETS`             | static assets          | yes        | the admin SPA                                                       |
| `SITE_ORIGIN`        | variable               | no         | the site's origin, so the page editor can frame its preview         |
| `AUTH_MODE`          | variable               | no         | `access` (default) or `magic-link`                                  |
| `OWNER_EMAIL`        | variable               | yes        | the address (or comma-separated addresses) that are always owners   |
| `ACCESS_TEAM_DOMAIN` | variable               | access     | Cloudflare Access team domain                                       |
| `ACCESS_AUD`         | variable               | access     | Cloudflare Access application audience                              |
| `EMAIL`              | `send_email` binding   | magic-link | sends the sign-in link and form notifications                       |
| `AUTH_EMAIL_FROM`    | variable               | magic-link | the sender address, on a domain you have onboarded to Email Service |
| `TURNSTILE_SECRET`   | secret                 | forms      | verifies the Turnstile token of a public form submission            |
| `DEV_AUTH`           | local `.dev.vars` only | no         | `true` skips Access on localhost; refused on a deployed host        |

Magic link (`AUTH_MODE=magic-link`) signs in people already in the `users` table. The link
works once and expires in 15 minutes. The session lives in D1 and in a `__Host-` cookie, and
requests are rate limited per email and per IP. Pass `createAdmin(registry, { mailer })` to send
the link through something other than the `EMAIL` binding. A `Mailer` has one method,
`send({ to, subject, text }, env)`; the entrypoint takes the same option for form notifications.

Roles and who may sign in work the same in both modes. A person is an `owner` or an `editor`.
Owners invite and remove people and change roles on the Users page (`/api/v1/users`); editors edit
and publish and can see who has access. Only people in the `users` table get in, so an owner
invites someone before they can sign in (with Access, they must also pass the Access policy).
Removing someone ends their sessions at once. The last owner cannot be removed or demoted.

`OWNER_EMAIL` is how the first owner is made: set it to one address, or a comma-separated list,
and each one is an owner whenever they sign in, created or promoted if need be. Without it nobody
is an owner and nobody can be invited. Under `DEV_AUTH` the local developer is an owner.

Site Worker, typed as `SiteEnv` from `@studiobimo/backstage/site`:

| Name           | Kind         | Required | Purpose                                                  |
| -------------- | ------------ | -------- | -------------------------------------------------------- |
| `SITE`         | KV namespace | yes      | published snapshots, written by the admin Worker         |
| `MEDIA`        | R2 bucket    | yes      | uploaded images, served under `/media`                   |
| `SITE_URL`     | variable     | yes      | the site's canonical URL, for canonical links, sitemap   |
| `ADMIN_ORIGIN` | variable     | no       | the admin's origin, so it may frame the block previews   |
| `ADMIN`        | service      | no       | the admin's `AdminEntrypoint`, never its default `fetch` |

## Public API

`@studiobimo/backstage` has six public entries. Their names, types and behaviour follow
[SemVer](https://semver.org), and a breaking change ships with a migration note
([ADR-0015](docs/adr/0015-entry-points-and-semver.md)). Anything not listed here is not covered, even
if it is reachable.

### `@studiobimo/backstage`

What a site author writes. It reaches no database and no Hono.

- Blocks and layouts: `defineBlock`, `defineLayout`, `defineRegistry`, `defineComponents`, `LAYOUT`, `SLOT`
- Collections ([ADR-0017](docs/adr/0017-collections.md)): `defineCollection`, `describeCollections`
- Forms ([ADR-0020](docs/adr/0020-forms-and-submissions.md)): `defineForm`, `FORM`, passed to `defineRegistry(blocks, { forms })`
- Fields: `entries`, `hexColor`, `image`, `link`, `localized`, `richText`, `isBlank`
- Shared constants: `API_ERROR`, `MEDIA`
- Types: `ApiError`, `Block`, `BlockComponents`, `BlockDefinition`, `Collection`, `CollectionComponents`,
  `CollectionDefinition`, `CollectionDescription`, `CollectionRoute`, `Form`, `FormDefinition`, `FormNotify`, `FormPublic`, `ComponentMap`, `EntryLabels`, `EntryReferenceValue`, `ResolvedEntry`, `LayoutComponents`,
  `LayoutDefinition`, `LayoutProps`, `Locale`, `LocaleConfig`, `Registry`, `RegistryOptions`, `RoutedCollection`, `RichTextDoc`

### `@studiobimo/backstage/admin`

The client's admin Worker. The only entry that reaches D1.

- `createAdmin`, and the `AdminEnv` type of its bindings
- `ensureUser`, `writeSiteBlock`, `writeSiteSettings`, which seed a database
- Submissions: `setSubmissionStatus`, which takes `(d1, kv, registry, id, status, options?)`, where `options` holds `now` and `editorId`, and also republishes the form's
  public projection to KV, `findSubmission`, `listSubmissions`, and the `Submission`, `StatusChange` and `StatusChangeOptions` types
- Mail: `cloudflareMailer`, and the `Mailer` and `MailMessage` types

### `@studiobimo/backstage/admin/entrypoint`

The admin Worker's RPC entrypoint, for the site to call through a service binding
([ADR-0019](docs/adr/0019-admin-rpc-entrypoint.md)). It imports `cloudflare:workers`, so it loads
only in workerd. It needs the registry to know the forms, so build the class from it and export it
beside `createAdmin`:
`export const AdminEntrypoint = createAdminEntrypoint(registry)`.

- `createAdminEntrypoint(registry, { mailer })`, which returns the class the Worker exports as
  `AdminEntrypoint`. Its methods act as an anonymous visitor:
  - `ping(context)` answers with the validated request context.
  - `submit(context, form, payload, turnstileToken)` verifies Turnstile, validates the payload
    against the form's schema, stores it and answers `{ ok: true, id, token }`, or
    `{ ok: false, code, issues }`.
  - `status(context, token)` answers the status and the form's public fields.

### `@studiobimo/backstage/site`

The client's site Worker, which reads what the admin publishes. It reaches no database and no Hono.

- Reading published pages: `findPublished`, `findSiteSnapshot`, `findTranslations`, and the `KvReader` type
- Reading published entries: `findPublishedEntry`, `findEntryTranslations`
- Reading the registry's own settings: `findRegistrySettings`
- Reading a form's public projection, such as the confirmed seats: `findFormProjection`, `formProjectionKey`,
  `FORM_PROJECTION`, and the `FormProjection` and `FormProjectionRead` types
- Routing: `parseRoute`, `parseEntryRoute`, `pathOf`, `entryPathOf`, `routeOf`, and the `Route`, `EntryRoute` and
  `CollectionRoute` types
- The KV layout: `SITE_VERSION`, `routeKey`, `snapshotKey`, `siteSnapshotKey`, `SNAPSHOT`, `SITE_SNAPSHOT`,
  `snapshotRecords`, `siteSnapshotRecords`, `snapshotSchema`, `siteSnapshotSchema`, and the
  `PageBlock`, `Snapshot` and `SiteSnapshot` types; for entries `entryRouteKey`, `entryRouteKeysOf`,
  `entrySnapshotKey`, `entrySnapshotKeysOf`, `ENTRY_SNAPSHOT`, `entrySnapshotRecords`, `entrySnapshotSchema` and the `EntrySnapshot` type
- SEO: `SEO`, `alternateLinks`, `canonicalUrl`, `EMPTY_PUBLISHED_INDEX`, `publishedIndexSchema`,
  `upsertIntoIndex`, `readPublishedPages`, `respondWithRobots`, `respondWithSitemap`, and the
  `AlternateLink` type
- Responses: `renderHtml`, `respondWithMedia`, `defaultEdgeCache`, `EDGE_CACHE`, `withEdgeCache`, and the
  `Deferrable`, `EdgeCache`, `MediaObject` and `MediaReader` types
- Locales: `localeName`, `LOCALE_NAME`, `switcherLabel`, `SWITCHER_LABEL`
- Turnstile: `verifyTurnstile`, `TURNSTILE`, and the `TurnstileCheck`, `TurnstileFailure` and
  `TurnstileResult` types
- Calling the admin entrypoint, as `adminRpc(env.ADMIN).ping(requestContextOf(request))`: `adminRpc`,
  `requestContextOf`, `RPC`, `SUBMISSION`, and the `PingResult`, `RequestContext`, `StatusResult`,
  `SubmitResult` and `VisitorRpc` types; the same client has `submit` and `status`
- `BLOCK_PREVIEW`, and the `SiteEnv` type of the Worker's bindings

### `@studiobimo/backstage/site/hono`

The site Worker in one call, and its Hono middleware.

- `createSite`, which owns routing, the edge cache, security headers, the block preview, media, the
  stylesheet, the sitemap and robots, and the 404 and error responses
  ([ADR-0016](docs/adr/0016-create-site.md)), with the `CreateSiteOptions`, `SiteApp`, `SiteHead`,
  `SitePreview` and `ContentSecurityPolicyAdditions` types
- `renderInShell`, which renders a consumer route inside the site document (slots, head,
  stylesheet and language switcher from the published snapshot), with the `ShellOptions` type
- `observe`, `reportError`, `respondHealthy`, `OBSERVABILITY`

### `@studiobimo/backstage/render`

Renders blocks and slots with React: `Blocks`, `renderSlots`, `RichText`, `RenderProvider`,
`useBrand`, `useDefaultLocale`, `useImage`, `useLocale`, `useLocalized`, `useLogo`, `useSettings`, and the `RenderContext` and
`RenderedImage` types.

## Internal entry

`@studiobimo/backstage/internal` is **internal and not covered by SemVer.** It holds the schemas,
constants and helpers that the admin SPA shares with the admin Worker, and this repo's tests import
it. It can change in any release, so import it only from code released together with the package.
It is browser-safe: it reaches no database and no Hono.

## Licence

Proprietary. This is a private repository and a private package
([ADR-0006](docs/adr/0006-private-package.md)); see [LICENSE](LICENSE).
