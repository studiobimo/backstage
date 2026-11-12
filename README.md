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

## Licence

Proprietary. This is a private repository and a private package
([ADR-0006](docs/adr/0006-private-package.md)); see [LICENSE](LICENSE).
