# Backstage documentation

This folder is the source of truth for what Backstage is and why it is built the way it is.

- [Product requirements](PRD.md): the problem, the users, and every story with its acceptance
- [Roadmap](ROADMAP.md): milestones, their stories and exit criteria
- [Risks](RISKS.md): risks with mitigations, and assumptions
- Research:
  - [A hosted Backstage](research/hosted-backstage.md): the central `cms.bimo.dev` idea, and why it is set aside
  - [React on the site worker](research/react-server-rendering.md): server rendering measured against the free plan's limits
- Architecture decision records:
  - [ADR-0001: Two Workers per site, an admin and a site](adr/0001-two-workers.md)
  - [ADR-0002: Deploy into each client's own Cloudflare account](adr/0002-client-account.md)
  - [ADR-0003: Content types are defined in code, and the admin builds its forms from them](adr/0003-blocks-in-code.md)
  - [ADR-0004: Publishing writes a snapshot to KV, and the site renders it on the Worker](adr/0004-publish-to-kv.md)
  - [ADR-0005: Cloudflare Access first, magic link later](adr/0005-access-then-magic-link.md)
  - [ADR-0006: A private repo, and a package on GitHub Packages](adr/0006-private-package.md)
  - [ADR-0007: English and Spanish from the start](adr/0007-two-locales.md)
  - [ADR-0008: The org's profiles inside a workspace, with coss ui and lineup's styling](adr/0008-workspace-profiles-and-styling.md)
