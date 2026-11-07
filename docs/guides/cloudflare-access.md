# Put the admin behind Cloudflare Access

- **Status:** Written from Cloudflare's documentation, not yet walked through on an account. The
  first deployed consumer, bimo.dev's repository ([#40](https://github.com/studiobimo/backstage/issues/40)),
  confirms it and corrects what it finds.
- **Date:** 2026-11-07
- **Issue:** [#8](https://github.com/studiobimo/backstage/issues/8)
- **Story:** AUT-1, [ADR-0005](../adr/0005-access-then-magic-link.md)

Until magic-link sign-in lands (M5), Cloudflare Access is the only thing between the internet and
a client's admin. It does two jobs, and both are needed:

1. **Access keeps people out.** It sits in front of the admin's hostname and lets in only the
   people on its policy. This covers the SPA's files too, because the worker never sees them
   (`run_worker_first` is `["/api/*"]`).
2. **The worker checks that Access did.** Every `/api/*` request must carry a valid
   `Cf-Access-Jwt-Assertion` header, signed by the client's Access. Without the check, anything
   that reaches the worker around Access, such as the `workers.dev` address, is trusted.

## What you need

- The client's Cloudflare account, with the admin worker deployed and a custom domain on it, such
  as `admin.example.com`. You are the studio, added as a member of that account
  ([risk 4](../RISKS.md)).
- Zero Trust set up on that account. It is free for up to 50 users, but Cloudflare asks for
  payment details even on the free plan, and some clients will not give them
  ([risk 2](../RISKS.md)). Magic link (M5) is the answer for those clients.

## Steps

### 1. Create the Zero Trust organization

In the Cloudflare dashboard, open **Zero Trust** and complete the onboarding.

- Choose a **team name**. It becomes the team domain, `https://<team-name>.cloudflareaccess.com`.
  Keep this URL: the worker needs it. The name is also on **Zero Trust > Settings**.
- Pick the **Free** plan and enter payment details. You are not charged.

### 2. Add a way to sign in

Cloudflare adds its own identity provider by default, which only people with a Cloudflare account
can use. Add the **One-time PIN** login method (**Zero Trust > Integrations > Identity providers**)
so editors without one can sign in with a code sent to their email. A Google or Microsoft
provider works too, if the client uses one.

### 3. Create the Access application

1. Go to **Zero Trust > Access controls > Applications > Create new application**.
2. Choose **Self-hosted and private**.
3. Under **Add public hostname**, enter the admin's custom domain, such as `admin.example.com`.
   Use the hostname, not the worker: this is what puts the SPA's files behind Access as well.
4. Add a policy. An application with no policy denies everyone.

   | Action | Rule | Selector | Value |
   | --- | --- | --- | --- |
   | Allow | Include | Emails | The client's editors, and the studio's own addresses |

   Use **Emails ending in** instead if everyone at the client's domain should get in.
5. Save.

### 4. Turn off the other ways in

The admin worker is also reachable at its `workers.dev` address and at preview URLs, and neither
is covered by the hostname application. Turn them off in the consumer's `wrangler.jsonc`:

```jsonc
{
  "workers_dev": false,
  "preview_urls": false
}
```

Set them in each environment, because an environment inherits neither
([the `cloudflare` profile](../../AGENTS.md)).

### 5. Give the worker the team domain and the audience

Open the application again: **Zero Trust > Access controls > Applications**, **Edit**, then
**Additional settings** and copy the **Application Audience (AUD) Tag**. It never changes unless
the application is deleted and recreated.

Neither value is secret, so they are plain `vars` in the consumer's `wrangler.jsonc`, per
environment:

```jsonc
"vars": {
  "ACCESS_TEAM_DOMAIN": "https://<team-name>.cloudflareaccess.com",
  "ACCESS_AUD": "<the AUD tag>"
}
```

The names are the ones the worker's check is written against in M1 (AUT-1); that change confirms
them or replaces them here.

## What the worker checks

On every `/api/*` request the admin worker:

- reads the token from the `Cf-Access-Jwt-Assertion` header. Not the `CF_Authorization` cookie,
  which Cloudflare says is not guaranteed to be passed
- verifies its signature against the keys at `<team domain>/cdn-cgi/access/certs`
- requires the issuer to be the team domain and the audience to be `ACCESS_AUD`
- answers `403` if the header, either variable or a valid signature is missing

It does this itself because `ctx.access`, the shortcut Cloudflare offers for Workers, is not
passed to a worker that has static assets, which the admin does. Local development skips the
check when `DEV_AUTH` is set, and a deploy with it set is refused (AUT-2).

## Check that it works

From a browser with no Access session, such as a private window:

1. Open `https://admin.example.com`. You should be sent to a login page on
   `<team-name>.cloudflareaccess.com`, not see the admin.
2. Sign in with an address on the policy. The admin should open, and `/api/health` should answer.
3. Sign in with an address that is not on the policy. Access should refuse you.
4. Open the worker's `workers.dev` address. It should not exist.

From M1, a fourth check belongs here: a request to `/api/*` with no, or a forged,
`Cf-Access-Jwt-Assertion` header gets `403` from the worker. It is a unit test as well.

## When something goes wrong

- **Everyone is refused, or the login page loops.** The application has no Allow policy, or the
  policy does not match the address used to sign in.
- **The admin loads but every API call is `403`.** `ACCESS_AUD` is stale, or `ACCESS_TEAM_DOMAIN`
  is wrong. Deleting and recreating the Access application gives it a new audience tag, so copy it
  again and redeploy.
- **The worker can't fetch the keys.** Check that the team domain is the exact
  `https://<team-name>.cloudflareaccess.com` with no trailing path.
- **A person leaves the client.** Remove them from the policy. Their session lasts until it
  expires, so end it from **Zero Trust > Access controls > Applications**.

## Sources

Read on 2026-11-07:
[Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[Zero Trust setup](https://developers.cloudflare.com/cloudflare-one/setup/).
