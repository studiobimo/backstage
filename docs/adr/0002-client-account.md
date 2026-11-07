# ADR-0002: Deploy into each client's own Cloudflare account

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The studio does not want to hold client content, or to be responsible for it. One option was a
central admin that connects to each client's storage, which is set out in the
[research note](../research/hosted-backstage.md). A Worker can only bind to storage in its own
account, so that option would need every client's API token.

## Decision

The same code is deployed **into each client's Cloudflare account**: both Workers, plus D1, R2
and KV. The client owns the account and the studio is a member. Reuse comes from the package
([ADR-0006](0006-private-package.md)), not from shared hosting.

## Consequences

- Client content never touches a studio account. Ending a contract hands nothing over, because
  the client already holds everything.
- Each client needs a Cloudflare account and a domain on it. The setup guide covers both (PKG-4).
- The studio cannot see across clients. Upgrades are done one site at a time, through Dependabot.
- Backups go to the client's own R2 (OPS-1).
