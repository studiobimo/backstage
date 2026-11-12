# Set up a client project

- **Status:** Started. The Cloudflare account steps are still to be written, in [#36](https://github.com/studiobimo/backstage/issues/36).
- **Issue:** [#281](https://github.com/studiobimo/backstage/issues/281) wrote the database section.

This guide takes a client project from an empty Cloudflare account to a working admin and site.
Only the database migrations are written so far.

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
