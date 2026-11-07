# A hosted Backstage at cms.bimo.dev

- **Status:** Set aside. Not on the roadmap.
- **Date:** 2026-11-07

## The idea

One central admin at `cms.bimo.dev` for every client, run as a product, with each client
connecting their own D1, R2 and KV so that the studio never stores their content.

## Why it is set aside

- **A Worker can only bind to storage in its own account.** A central admin would need a
  Cloudflare API token from every client, to call D1, R2 and KV over the REST API.
- **Holding those tokens is worse than holding the content.** One leak would give access to
  every client's account, not just their site.
- **The REST API is slower and has lower limits than bindings.** Every save would become a
  request across the internet.
- **It needs tenants, billing and support.** That is a product to run, not a CMS to ship.

Deploying the same package into each client's account gives the reuse without any of this
([ADR-0002](../adr/0002-client-account.md)).

## What would bring it back

- Clients who want the studio to host them. A multi-tenant admin with storage in the studio's
  account would then fit better than bring-your-own storage.
- Enough clients that per-account deploys become the bottleneck.

Either one needs an ADR before work starts.
