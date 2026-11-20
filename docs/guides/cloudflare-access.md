# Put the admin behind Cloudflare Access

- **Status:** Written from Cloudflare's documentation. A client consumer has since used it, and
  the user rules were corrected from that. A step it did not exercise is still unconfirmed.
- **Date:** 2026-11-07
- **Issue:** [#8](https://github.com/studiobimo/backstage/issues/8)
- **Story:** AUT-1, [ADR-0005](../adr/0005-access-then-magic-link.md)

Cloudflare Access is the default sign-in (`AUTH_MODE` unset or `access`). Magic link
(`AUTH_MODE=magic-link`, since 0.7.0) replaces it: a deployment runs one mode or the other, never
both, and in magic-link mode the Access variables and header are ignored. With Access, it is the
only thing between the internet and a client's admin. It does two jobs, and both are needed:

1. **Access keeps people out.** It sits in front of the admin's hostname and lets in only the
   people on its policy. This covers the SPA's files too, because Access answers before the
   request reaches the Worker or its static assets.
2. **The worker checks that Access did.** Every `/api/*` request must carry a valid
   `Cf-Access-Jwt-Assertion` header, signed by the client's Access. Without the check, anything
   that reaches the worker around Access, such as the `workers.dev` address, is trusted.

## What you need

- The client's Cloudflare account, with the admin worker deployed and a custom domain on it, such
  as `admin.example.com`. You are the studio, added as a member of that account
  ([risk 4](../RISKS.md)).
- Zero Trust set up on that account. It is free for up to 50 users, but Cloudflare asks for
  payment details even on the free plan, and some clients will not give them
  ([risk 2](../RISKS.md)). Magic link is the answer for those clients.

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

   | Action | Rule    | Selector | Value                                                |
   | ------ | ------- | -------- | ---------------------------------------------------- |
   | Allow  | Include | Emails   | The client's editors, and the studio's own addresses |

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

Check that they apply to every environment you deploy to; a Wrangler environment does not
inherit everything from the top level ([the `cloudflare` profile](../../AGENTS.md)).

### 5. Give the worker the team domain and the audience

Open the application again: **Zero Trust > Access controls > Applications**, **Edit**, then
**Additional settings** and copy the **Application Audience (AUD) Tag**. It never changes unless
the application is deleted and recreated.

Neither value is secret, so they are plain `vars` in the consumer's `wrangler.jsonc`, per
environment (the README's bindings table lists them as variables too). The worker reads them from
its environment, so a Wrangler secret would also work, but there is no reason to hide them:

```jsonc
"vars": {
  "ACCESS_TEAM_DOMAIN": "https://<team-name>.cloudflareaccess.com",
  "ACCESS_AUD": "<the AUD tag>"
}
```

These are the names the worker's check reads. Leave `DEV_AUTH` out of `wrangler.jsonc`: it is for
`.dev.vars` on a laptop only.

## What the worker checks

On every `/api/*` request, `packages/backstage/src/admin/auth.ts` does this:

- read the token from the `Cf-Access-Jwt-Assertion` header. Not the `CF_Authorization` cookie,
  which Cloudflare says is not guaranteed to be passed
- verify its signature against the keys at `<team domain>/cdn-cgi/access/certs`
- require the issuer to be the team domain and the audience to be `ACCESS_AUD`
- answer `403` if the header, either variable or a valid signature is missing
- look the verified email up in the `users` table, and answer `403` when it is not there: passing
  Access is not enough, an owner must have invited the person ([Who may sign in](#who-may-sign-in))

After that, `csrf()` rejects a form-type write (`multipart/form-data`,
`application/x-www-form-urlencoded` or `text/plain`, which is also what a request with no content
type counts as) whose `Origin` is another site. The JSON routes also answer `415` to a body that is
not `application/json`. Do not rely on the
`CF_Authorization` cookie's SameSite attribute for this: Cloudflare's reference gives it no
default, so it is your choice. In the Access application's cookie settings, set **SameSite** to
`Lax` or `Strict`.

The check runs before routing, so an unknown path gets `403` as well, not `404`. It does this itself because `ctx.access`, the shortcut Cloudflare offers for Workers, is not
passed to a worker that has static assets, which the admin does.

## Who may sign in

Access proves who a person is. The admin's `users` table says who may use it, as an `owner` or an
`editor`. Set `OWNER_EMAIL` on the admin Worker (a variable, one address or a comma-separated
list) before the first deploy: each address is an owner whenever it signs in, created or promoted
if need be, and can then invite everyone else on the Users page.

- **With `OWNER_EMAIL` unset and no users yet,** the first identity to pass Access, or the first
  person to open a magic link, becomes the owner. In magic-link mode the sign-in form sends a link
  to any address until a user exists. Set the variable so that this is never left to chance.
- **An identity that passes Access but is not in `users`** gets `403` on every `/api/*` request.
  Invite them, or add them to `OWNER_EMAIL`.

## Local development

Put `DEV_AUTH=true` in `.dev.vars` (see `.dev.vars.example`) and the check is skipped. The bypass
only works for requests to `localhost`, `127.0.0.1` or `[::1]`. On any other host, a worker with
`DEV_AUTH` set to `true` answers `500` to every `/api/*` request, even one with a valid token, so
a deploy that carries it is refused rather than left open (AUT-2). A test also fails if
`wrangler.jsonc` mentions `DEV_AUTH`.

## Check that it works

From a browser with no Access session, such as a private window:

1. Open `https://admin.example.com`. You should be sent to a login page on
   `<team-name>.cloudflareaccess.com`, not see the admin.
2. Sign in with an address on the policy. The admin should open, and `/api/health` should answer.
3. Sign in with an address that is not on the policy. Access should refuse you.
4. Open the worker's `workers.dev` address. It should not exist.

A request to `/api/*` with no, or a forged, `Cf-Access-Jwt-Assertion` header gets `403` from the
worker. `apps/admin/worker/auth.test.ts` covers it.

## When something goes wrong

- **Everyone is refused, or the login page loops.** The application has no Allow policy, or the
  policy does not match the address used to sign in.
- **The admin loads but every API call is `403`.** The person is not in `users` (see above), or
  `ACCESS_AUD` is stale, or `ACCESS_TEAM_DOMAIN`
  is wrong. Deleting and recreating the Access application gives it a new audience tag, so copy it
  again and redeploy.
- **The worker can't fetch the keys.** Check that the team domain is the exact
  `https://<team-name>.cloudflareaccess.com` with no trailing path.
- **A person leaves the client.** Remove them from the policy. Their session lasts until it
  expires, so revoke it in Zero Trust as well if it should end now.

## Sources

Read on 2026-11-07:
[Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[Zero Trust setup](https://developers.cloudflare.com/cloudflare-one/setup/).
