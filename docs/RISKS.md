# Risks and assumptions

Reviewed at the start of each milestone. A risk is closed by linking the change or ADR that
settled it. Open questions are not listed here: each one is an issue, in the milestone that needs
the answer.

## Risks

| # | Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| 1 | KV allows 1,000 writes a day on the free plan | Heavy editing, or many previews, runs out of writes for the day | Only publishing and previewing write to KV, and saving a draft writes to D1. One publish is one write. Usage is shown in the admin | Open |
| 2 | Cloudflare Access asks for a payment card even on the free plan, and some clients will not add one | That client cannot sign in to the admin | Magic link in M5 ([ADR-0005](adr/0005-access-then-magic-link.md)) | Open |
| 3 | The package token leaks from a client's CI or Workers Builds | Someone outside the studio installs Backstage | The token only has `read:packages`, is kept per client as a secret and is never committed. Rotating it is documented ([ADR-0006](adr/0006-private-package.md)) | Open |
| 4 | The client's Cloudflare account is outside the studio's control | A deleted account, a lapsed domain or an owner who leaves loses the site | Daily backups to R2 and a content export (OPS-1, OPS-2). The setup guide names the client as owner and the studio as a member | Open |
| 5 | Changing a block's schema breaks saved content | Pages stop opening in the admin, or stop publishing | Every block carries a schema version and a `migrate` function, and publish validates before writing (BLK-5) | Open |
| 6 | React rendering on the server makes the site worker too big or too slow for the free plan | Requests fail, or a paid plan is needed | A size budget in CI and edge caching (PUB-4). Spike in M0 | Open |
| 7 | The edge cache cannot be purged for every location on the free plan | A change takes a while to appear | A short `s-maxage` with stale-while-revalidate; PUB-1 promises two minutes, not instant | Accepted |
| 8 | coss ui is young and may lack some parts | Missing parts have to be built | Components are copied into the repo, as in lineup | Accepted |
| 9 | The styling is copied from lineup until a shared source exists | The copies drift apart | An issue on `studiobimo/lineup` asks for the styling to move to a shared source | Open |
| 10 | The repo is private on GitHub Free: there are no rulesets, and Actions minutes are metered | `main` is not protected by rules, and CI costs minutes | Hooks and the agent guard still enforce the conventions locally, and CI stays small | Accepted |

## Assumptions

| Assumption | If wrong |
| --- | --- |
| Marketing sites change a few times a week, not a few times an hour | The free KV write limit (risk 1) becomes the constraint, and a paid plan or another store is needed |
| Clients are willing to own a Cloudflare account | The studio hosts them in its own account, which needs a new ADR |
| Two locales are enough for the first clients | Locales are configuration, so adding one is cheap |
| Editors are fine with forms and a list of blocks rather than visual editing | A live preview pane moves up from M4 |
