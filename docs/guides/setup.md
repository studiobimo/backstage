# Set up a client project

- **Status:** Started. The Cloudflare account steps are still to be written, in [#36](https://github.com/studiobimo/backstage/issues/36).
- **Issue:** [#281](https://github.com/studiobimo/backstage/issues/281) wrote the database section.

This guide takes a client project from an empty Cloudflare account to a working admin and site.
Only the database migrations are written so far, plus the notes below on what a consumer hits.
Still missing: the site Worker's `wrangler.jsonc`, the Vite plugin setup, the Content-Security-Policy,
the deploy flow, and a consumer template to copy.

## Apply the package's migrations

The package ships its D1 migrations in `migrations/` and a make target, `backstage.mk`, that runs
`wrangler d1 migrations apply` against them. Both come from `node_modules`, so a client project
points at them there instead of keeping a copy.

Point the D1 binding in the admin Worker's `wrangler.jsonc` at the package's directory:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "client-name",
      "database_id": "<id from wrangler d1 create>",
      "migrations_dir": "node_modules/@studiobimo/backstage/migrations"
    }
  ]
}
```

Include the make target with `-include`, not `include`:

```make
-include node_modules/@studiobimo/backstage/backstage.mk
```

In a pnpm workspace the package is linked under the app that depends on it, for example
`apps/admin/node_modules/@studiobimo/backstage`, so that path does not exist at the root. Include
it from there instead:

```make
-include apps/admin/node_modules/@studiobimo/backstage/backstage.mk
```

`backstage.mk` also uses two variables it does not define, so set them before the `-include`:
`ROOT`, the repository's absolute root, and `MISE`, the command that runs a tool at its pinned
version (`mise`, or `mise exec --` if your Makefile already prefixes it). For example:

```make
ROOT := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
MISE := mise
```

Adjust `ROOT` if the Makefile is not at the repository root, as in `.devtools/Makefile`. The recipe
runs `cd $(ROOT)/$(BACKSTAGE_ADMIN_DIR) && $(MISE) exec -- pnpm exec wrangler ...`.

A plain `include` fails on a fresh clone, because the file is not in `node_modules` until
`make install` has run, and `make install` is the target that would put it there. `-include` skips
the missing file and reads it on the next run.

Then `make migrate` applies them to the local database, `make migrate REMOTE=1` to the deployed one,
and `ENV=<env>` picks a Wrangler environment. `BACKSTAGE_ADMIN_DIR` (default `apps/admin`) is where
`wrangler.jsonc` lives and `BACKSTAGE_D1_BINDING` (default `DB`) is the binding name.

A new package release can add migrations. Run `make migrate` after updating the package; Wrangler
applies only the ones the database has not seen.

`packages/backstage/test/pack.test.ts` runs exactly this against the packed tarball, so the steps
above are checked on every pull request.

## Things a consumer runs into

- **Admin assets config.** Use `"binding": "ASSETS"` and
  `"run_worker_first": ["/*", "!/assets/*", "!/block-thumbnails/*", "!/favicon.svg"]`, as in
  [the research note](../research/admin-spa-as-assets.md).
- **Access variables.** `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are plain `vars`
  ([Cloudflare Access](cloudflare-access.md)). The CI token is `BACKSTAGE_PACKAGE_TOKEN`, not
  `GITHUB_TOKEN` ([package token](package-token.md)).
- **Do not name a package script `deploy`.** `pnpm deploy` is a built-in command, so
  `pnpm deploy` runs the built-in and not your script; use `pnpm run deploy`, or pick another name
  such as `ship`.
- **Exported types.** With `composite` or `declaration` on, exporting a block schema or registry
  that uses `link()` needs `LinkInput` and `ResolvedLink` to be nameable, or TypeScript reports
  TS2883 or TS4023. Import both from `@studiobimo/backstage`.
- **Block preview assets are SVG only.** `createSite({ preview: { assets } })` serves each entry at
  its path with `Content-Type: image/svg+xml`, so it is for SVGs. For fonts, images or anything
  else, give the site Worker a static `assets` binding in its `wrangler.jsonc` and serve the files
  from there (not tried end to end here).
- **What `createSite` renders around your layout.** Besides the layout and its slots, it appends an
  unstyled `<nav aria-label="...">` language switcher after them (labelled `Language`, or `Idioma`
  on a Spanish page; only when the site has more than one locale), and every page, including the
  block preview, renders an `<h1>` of the page title before the blocks. Neither is in a slot, so
  style the nav from your stylesheet, and leave the page title out of your blocks' own headings if
  you do not want two `h1`s. There is no option to turn either off yet.

## Protect a public form with Turnstile

1. Create a Turnstile widget in the Cloudflare dashboard and note its site key and secret key.
2. Store the secret on the site Worker, never in the repository:
   `pnpm exec wrangler secret put TURNSTILE_SECRET` (add `--env <env>` for a deployed environment).
   The site key is public and can sit in `vars` or in your block's markup.
3. Pass `turnstile: true` to `createSite`. It adds `https://challenges.cloudflare.com` to
   `script-src` and `frame-src` and nothing else, so the widget script loads and its iframe
   renders under the package's policy. The rest of the policy is unchanged, and
   `contentSecurityPolicy` still takes the other additions.

   ```ts
   export default createSite({ components, stylesheet, turnstile: true })
   ```

4. Render the widget in your form: load `https://challenges.cloudflare.com/turnstile/v0/api.js`
   and add `<div class="cf-turnstile" data-sitekey="...">`. The widget adds a
   `cf-turnstile-response` field to the form.
5. Verify on the server before acting on the submission. `verifyTurnstile` is exported from
   `@studiobimo/backstage/site` and does not depend on Hono:

   ```ts
   const result = await verifyTurnstile({
     token: form.get('cf-turnstile-response')?.toString(),
     secret: c.env.TURNSTILE_SECRET,
     ip: c.req.header('CF-Connecting-IP')
   })
   if (!result.success) return respondWithError(c, API_ERROR.forbidden)
   ```

   `result.reason` is `missing-token`, `rejected` or `unavailable` (siteverify could not be reached
   or answered something unexpected). Treat all three as a refusal.
