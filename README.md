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
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## Licence

Proprietary. This is a private repository and a private package
([ADR-0006](docs/adr/0006-private-package.md)); see [LICENSE](LICENSE).
