# Backstage documentation

This folder is the source of truth for what Backstage is and why it is built the way it is.

- [Product requirements](PRD.md): the problem, the users, and every story with its acceptance
- [Roadmap](ROADMAP.md): milestones, their stories and exit criteria
- [Risks](RISKS.md): risks with mitigations, and assumptions
- Guides:
  - [Put the admin behind Cloudflare Access](guides/cloudflare-access.md): the Zero Trust setup and what the worker checks
  - [Install the package with a read-only token](guides/package-token.md): `.npmrc`, CI, Workers Builds and rotation
  - [Set up a client project](guides/setup.md): the migrations (`migrations_dir` and the `-include` line); the rest is [#36](https://github.com/studiobimo/backstage/issues/36)
  - [Upgrade notes](guides/upgrading.md): when to republish every page after an upgrade
- Research:
  - [A hosted Backstage](research/hosted-backstage.md): the central `cms.bimo.dev` idea, and why it is set aside
  - [React on the site worker](research/react-server-rendering.md): server rendering measured against the free plan's limits
  - [The admin SPA as worker assets](research/admin-spa-as-assets.md): serving the prebuilt SPA from `node_modules`, and the Wrangler config
- Architecture decision records:
  - [ADR-0001: Two Workers per site, an admin and a site](adr/0001-two-workers.md)
  - [ADR-0002: Deploy into each client's own Cloudflare account](adr/0002-client-account.md)
  - [ADR-0003: Content types are defined in code, and the admin builds its forms from them](adr/0003-blocks-in-code.md)
  - [ADR-0004: Publishing writes a snapshot to KV, and the site renders it on the Worker](adr/0004-publish-to-kv.md)
  - [ADR-0005: Cloudflare Access first, magic link later](adr/0005-access-then-magic-link.md)
  - [ADR-0006: A private repo, and a package on GitHub Packages](adr/0006-private-package.md)
  - [ADR-0007: English and Spanish from the start](adr/0007-two-locales.md)
  - [ADR-0008: The org's profiles inside a workspace, with coss ui and lineup's styling](adr/0008-workspace-profiles-and-styling.md)
  - [ADR-0009: Rich text is edited with Tiptap and stored as a fixed JSON document](adr/0009-rich-text-with-tiptap.md)
  - [ADR-0010: The header and footer are blocks in named global slots](adr/0010-global-slots.md)
  - [ADR-0011: A page chooses a layout from a list in the registry](adr/0011-page-layouts.md)
  - [ADR-0012: Block preview is a frame the site serves](adr/0012-block-preview-frame.md)
  - [ADR-0013: The sitemap index is rebuilt from D1 on every publish, unpublish and delete](adr/0013-sitemap-index-from-d1.md)
  - [ADR-0014: Republishing every page runs as server-driven batches](adr/0014-republish-all-in-batches.md)
  - [ADR-0015: The package has six entries, and SemVer covers only the public ones](adr/0015-entry-points-and-semver.md)
  - [ADR-0016: The package owns the site Worker, and a site overrides only what is its own](adr/0016-create-site.md)
  - [ADR-0017: Collections are defined like blocks, entries are rows, and pages depend on entries](adr/0017-collections.md)
