# Risks and assumptions

Reviewed at the start of each milestone. A risk is closed by linking the change or ADR that
settled it. Open questions are not listed here: each one is an issue, in the milestone that needs
the answer.

## Risks

| # | Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| 1 | KV allows 1,000 writes a day on the free plan | Heavy publishing, or many previews once they exist, runs out of writes for the day | Only publishing, unpublishing and deleting a published page, or an entry of a collection with a route, write to KV (so do previews: one write each, a single `preview:<token>` key holding every locale, expiring after an hour), and saving a draft writes to D1. With two locales a publish is five writes (a snapshot and a route per locale, and the sitemap index, rebuilt once from D1 per [ADR-0013](adr/0013-sitemap-index-from-d1.md)); unpublishing or deleting a published page is five as well (four deletes, which count as writes, and the index). A renamed slug adds a delete for each stale route. An entry with a route costs the same as a page ([ADR-0017](adr/0017-collections.md)). Publishing the site is two writes, one `site:<locale>` snapshot per locale. At five writes the free plan allows 200 publishes a day. "Republish all" shows its write count before it starts ([ADR-0014](adr/0014-republish-all-in-batches.md)); an ordinary publish shows none | Open |
| 2 | Cloudflare Access asks for a payment card even on the free plan, and some clients will not add one | That client cannot sign in to the admin | Magic link in M5 ([ADR-0005](adr/0005-access-then-magic-link.md)) | Open |
| 3 | The package token leaks from a client's CI or Workers Builds | Someone outside the studio installs Backstage | The token only has `read:packages`, is kept per client as a secret and is never committed. Rotating it is documented ([ADR-0006](adr/0006-private-package.md)) | Open |
| 4 | The client's Cloudflare account is outside the studio's control | A deleted account, a lapsed domain or an owner who leaves loses the site | Daily backups to R2 and a content export (OPS-1, OPS-2). The setup guide names the client as owner and the studio as a member | Open |
| 5 | Changing a block's schema breaks saved content | Pages stop opening in the admin, or stop publishing | Every block carries a schema version and a `migrate` function, and publish validates before writing (BLK-5) | Open |
| 6 | React rendering on the server makes the site worker too big or too slow for the free plan | Requests fail, or a paid plan is needed | A size budget in CI and edge caching (PUB-4). Measured in M0: five blocks bundle to 68 KiB gzipped and render in about 6 ms cold and 0.1 ms warm. Cold isolates are the one thing to watch, so re-measure on the first deployed consumer ([research](research/react-server-rendering.md)) | Accepted. Reopened for a hydrating consumer, which re-measures it in its own repository |
| 7 | The edge cache cannot be purged for every location on the free plan | A change takes a while to appear | A short `s-maxage` with stale-while-revalidate; PUB-1 promises two minutes, not instant | Accepted |
| 8 | coss ui is young and may lack some parts | Missing parts have to be built | Components are copied into the repo, as in lineup | Accepted |
| 9 | The styling is copied from lineup until a shared source exists | The copies drift apart | An issue on `studiobimo/lineup` asks for the styling to move to a shared source | Open |
| 10 | The repo is private on GitHub Free: there are no rulesets, and Actions minutes are metered | `main` is not protected by rules, and CI costs minutes | Hooks and the agent guard still enforce the conventions locally, and CI stays small | Accepted |
| 11 | TanStack Start, the framework a hydrating site uses ([ADR-0004](adr/0004-publish-to-kv.md)), is unproven: this repository only tests Hono | A consumer that needs interactivity finds package fixes late, or the starter's choices do not carry over | The first consumer on Start proves the swap, and a round of package fixes is expected from it. The starter is revisited once two consumers are on Start | Open |
| 12 | A hydrating site needs a looser Content-Security-Policy (`script-src` with a nonce, and inline style attributes for motion) | The starter's strict policy does not fit that site, and a looser one weakens the site's defences | Each consumer sets its own policy in its own repository. The starter keeps `script-src 'none'`. Measured in that consumer, not here | Open |

## Assumptions

| Assumption | If wrong |
| --- | --- |
| Marketing sites change a few times a week, not a few times an hour | The free KV write limit (risk 1) becomes the constraint, and a paid plan or another store is needed |
| Clients are willing to own a Cloudflare account | The studio hosts them in its own account, which needs a new ADR |
| Two locales are enough for the first clients | Locales are configuration, so adding one is cheap |
| Editors are fine with forms and a list of blocks rather than visual editing | A live preview pane moves up from M4 |
