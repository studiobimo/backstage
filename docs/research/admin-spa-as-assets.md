# The admin SPA as worker assets, from a package

- **Status:** Done. Confirms the packaging in [ADR-0006](../adr/0006-private-package.md) and
  [PKG-2](../PRD.md).
- **Date:** 2026-11-07
- **Issue:** [#4](https://github.com/studiobimo/backstage/issues/4)

## The question

The package ships the admin SPA prebuilt ([PKG-2](../PRD.md)). Can a client's admin worker serve
it as its static assets straight from `node_modules/@studiobimo/backstage`, and what does the
client's Wrangler config look like?

## Answer

**Yes. One `assets.directory` line points Wrangler at the package.** The client's `apps/admin`
has no Vite build and no copy step.

```jsonc
// apps/admin/wrangler.jsonc in a client project
{
  "name": "acme-admin",
  "main": "worker/index.ts",
  "compatibility_date": "2026-10-24",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./node_modules/@studiobimo/backstage/dist/client",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/*", "!/assets/*", "!/block-thumbnails/*", "!/favicon.svg"]
  }
}
```

This is the config a client uses now, the same as `apps/admin/wrangler.jsonc` in this repository.
The experiment below ran with `"run_worker_first": ["/api/*"]` and no `binding`; see
[the update](#update-the-worker-now-serves-the-html) for why that changed. Use the `binding` and
the `run_worker_first` list above, not `["/api/*"]`.

```ts
// apps/admin/worker/index.ts
import { createAdmin } from '@studiobimo/backstage/admin'
import { registry } from '../../../registry'

export default createAdmin(registry)
```

The package's side is a `files` entry that includes `dist`, with the built SPA at `dist/client`.
It is the output of `apps/admin`'s own `vite build`, so the SPA is built once in this repository
and not again in any client.

## What was tried

A stand-in package, `@studiobimo/backstage`, holding the real `apps/admin` build (9 files, 404 KiB)
at `dist/client` and a one-function worker. `pnpm pack` made the tarball, and a client project
installed it with `pnpm add`, the way GitHub Packages delivers it. Two layouts: a single project,
and a pnpm workspace where `apps/admin` depends on the package, as the template's will. Wrangler
4.156.0, the version this repository pins.

| Check                                                | Result                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `wrangler deploy --dry-run` reads the directory      | Read the package's files through pnpm's symlink, in both layouts                     |
| `wrangler dev`: `/` and `/assets/*.js`               | 200, from the package                                                                |
| `wrangler dev`: a client route such as `/some/route` | 200, `index.html` (single-page fallback)                                             |
| `wrangler dev`: `/api/*`                             | The client's worker answered, and `/api/nope` was the worker's 404, not `index.html` |
| `.assetsignore` shipped in the package               | Honoured: `/.assetsignore` is not served as a file                                   |
| A `_headers` file shipped in the package             | Applied to `/`, with its `Content-Security-Policy`                                   |

## Two things that follow

1. **The security headers ship with the package.** In the experiment `run_worker_first` was
   `["/api/*"]` (superseded, see the update below), so the worker never saw the HTML and cannot add headers to it. The Content-Security-Policy for the
   SPA ([M0 exit criteria](../ROADMAP.md)) has to be a `_headers` file in `dist/client`. It works
   from the package, and the client cannot loosen it without editing `node_modules`. The worker
   sets its own headers on `/api/*`, as `secureHeaders()` does now. `_headers` does not apply to
   responses a worker returns.
2. **Nothing client-specific can be built into the SPA.** `apps/admin` bakes its name, description
   and canonical URL into `index.html` from `src/config/site.ts` at build time, so the shipped page
   says "Backstage" and `backstage.example.com`. The SPA must take the client's name and anything
   else that varies from `/api` at runtime and set `document.title` itself. Build-time metadata is
   harmless in the package, and should not be relied on.

## Update: the worker now serves the HTML

`/blocks` frames the site, so the SPA's policy needs `frame-src <site origin>`, which differs per
client and cannot ship in `_headers`. The client's `assets` config therefore adds
`"binding": "ASSETS"` and `run_worker_first` of `["/*", "!/assets/*", ...]`. The admin worker
fetches the page from `ASSETS` and appends `frame-src` from its `SITE_ORIGIN` var to the policy.
The rest of the policy still ships in `_headers`.

## What this does not tell us

- **Nothing was deployed.** This repository deploys nothing
  ([ADR-0008](../adr/0008-workspace-profiles-and-styling.md)). `wrangler deploy --dry-run` read the
  files but uploads none, so the upload itself, the asset limits for the free plan and the
  `_headers` limits were not exercised. The SPA is 9 files and 404 KiB, far below any limit we
  know of. The first deployed consumer ([M3](../ROADMAP.md)) confirms it.
- **Only pnpm was tried.** With npm or yarn the package may be hoisted to the repository root,
  and then the path needs `../../` in front. The template uses pnpm, which links the package into
  `apps/admin/node_modules`, so the path above holds.
- **The package was a stand-in.** It has the real SPA but not the real worker. Whether Wrangler
  bundles the finished `createAdmin` and its dependencies cleanly is a question for the package
  work in [M2](../ROADMAP.md).

## Recommendations

1. **Use the config above as the `backstage` profile's `wrangler.jsonc`** (PKG-3). It has no Vite
   plugin: the client's admin is a plain Wrangler project.
2. **Put the CSP in `dist/client/_headers`** when the admin shell gets its policy, and test that
   the file is in the packed tarball (`pnpm pack` then `tar tzf`).
3. **Make the SPA read its name and metadata from `/api`**, not from `src/config/site.ts`, before
   M2 publishes it.
4. **Keep the SPA and the worker in one package version.** They are installed together, so the
   SPA never calls an API a different version of the worker serves.
