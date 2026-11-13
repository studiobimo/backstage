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

## Bindings and variables

The admin Worker answers every request except `/api/health` with a 500, and logs which binding
is missing, when a required binding is not declared. Declare them in every environment of `wrangler.jsonc`:
`env.production` does not inherit bindings or vars from the top level.

Admin Worker, typed as `AdminEnv` from `@studiobimo/backstage/admin`:

| Name                 | Kind                   | Required | Purpose                                                      |
| -------------------- | ---------------------- | -------- | ------------------------------------------------------------ |
| `DB`                 | D1 database            | yes      | pages, settings, media records (`make -C .devtools migrate`) |
| `SITE`               | KV namespace           | yes      | published snapshots, shared with the site Worker             |
| `MEDIA`              | R2 bucket              | yes      | uploaded images, shared with the site Worker                 |
| `ASSETS`             | static assets          | yes      | the admin SPA                                                |
| `SITE_ORIGIN`        | variable               | no       | the site's origin, so the page editor can frame its preview  |
| `ACCESS_TEAM_DOMAIN` | secret                 | deployed | Cloudflare Access team domain                                |
| `ACCESS_AUD`         | secret                 | deployed | Cloudflare Access application audience                       |
| `DEV_AUTH`           | local `.dev.vars` only | no       | `true` skips Access on localhost; refused on a deployed host |

Site Worker, typed as `SiteEnv` from `@studiobimo/backstage/site`:

| Name           | Kind         | Required | Purpose                                                |
| -------------- | ------------ | -------- | ------------------------------------------------------ |
| `SITE`         | KV namespace | yes      | published snapshots, written by the admin Worker       |
| `MEDIA`        | R2 bucket    | yes      | uploaded images, served under `/media`                 |
| `ADMIN_ORIGIN` | variable     | no       | the admin's origin, so it may frame the block previews |

## Public API

`@studiobimo/backstage` has five public entries. Their names, types and behaviour follow
[SemVer](https://semver.org), and a breaking change ships with a migration note
([ADR-0015](docs/adr/0015-entry-points-and-semver.md)). Anything not listed here is not covered, even
if it is reachable.

### `@studiobimo/backstage`

What a site author writes. It reaches no database and no Hono.

- Blocks and layouts: `defineBlock`, `defineLayout`, `defineRegistry`, `defineComponents`, `LAYOUT`, `SLOT`
- Fields: `image`, `link`, `localized`, `richText`, `isBlank`
- Shared constants: `API_ERROR`, `MEDIA`
- Types: `ApiError`, `Block`, `BlockComponents`, `BlockDefinition`, `ComponentMap`, `LayoutComponents`,
  `LayoutDefinition`, `LayoutProps`, `Locale`, `LocaleConfig`, `Registry`, `RegistryOptions`, `RichTextDoc`

### `@studiobimo/backstage/admin`

The client's admin Worker. The only entry that reaches D1.

- `createAdmin`, and the `AdminEnv` type of its bindings
- `ensureUser`, `writeSiteBlock`, `writeSiteSettings`, which seed a database

### `@studiobimo/backstage/site`

The client's site Worker, which reads what the admin publishes. It reaches no database and no Hono.

- Reading published pages: `findPublished`, `findSiteSnapshot`, `findTranslations`, and the `KvReader` type
- Routing: `parseRoute`, `pathOf`, `routeOf`, and the `Route` type
- The KV layout: `routeKey`, `snapshotKey`, `siteSnapshotKey`, `SNAPSHOT`, `snapshotRecords`,
  `snapshotSchema`, `siteSnapshotSchema`, and the `PageBlock` and `Snapshot` types
- SEO: `SEO`, `alternateLinks`, `canonicalUrl`, `EMPTY_PUBLISHED_INDEX`, `publishedIndexSchema`,
  `upsertIntoIndex`, `readPublishedPages`, `respondWithRobots`, `respondWithSitemap`, and the
  `AlternateLink` type
- Responses: `renderHtml`, `respondWithMedia`, `defaultEdgeCache`, `EDGE_CACHE`, `withEdgeCache`, and the
  `Deferrable`, `EdgeCache`, `MediaObject` and `MediaReader` types
- Locales: `localeName`, `LOCALE_NAME`, `switcherLabel`, `SWITCHER_LABEL`
- `BLOCK_PREVIEW`, and the `SiteEnv` type of the Worker's bindings

### `@studiobimo/backstage/site/hono`

Hono middleware for the site Worker: `observe`, `reportError`, `respondHealthy`, `OBSERVABILITY`.

### `@studiobimo/backstage/render`

Renders blocks and slots with React: `Blocks`, `renderSlots`, `RichText`, `RenderProvider`,
`useDefaultLocale`, `useImage`, `useLocale`, `useLocalized`, and the `RenderContext` and
`RenderedImage` types.

## Internal entry

`@studiobimo/backstage/internal` is **internal and not covered by SemVer.** It holds the schemas,
constants and helpers that the admin SPA shares with the admin Worker, and this repo's tests import
it. It can change in any release, so import it only from code released together with the package.
It is browser-safe: it reaches no database and no Hono.

## Licence

Proprietary. This is a private repository and a private package
([ADR-0006](docs/adr/0006-private-package.md)); see [LICENSE](LICENSE).
