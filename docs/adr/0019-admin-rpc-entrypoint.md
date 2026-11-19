# ADR-0019: The site calls the admin through an RPC entrypoint

- **Status:** Accepted. Amends [ADR-0001](0001-two-workers.md) and
  [ADR-0015](0015-entry-points-and-semver.md).
- **Date:** 2026-11-18

## Context

Visitors now do things on the site that must be stored: a reservation form is the first (#470).
The data belongs in the admin's D1, which the site must not touch (PUB-6): the site has no D1
binding and no admin secret, and ADR-0001 says the two Workers share no service binding.

Options considered:

- **D1 on the site** breaks PUB-6.
- **A second D1 that the site writes and the admin reads** keeps two databases and still hands the
  site a database handle.
- **A Queue that the admin consumes** is asynchronous, so the visitor gets no immediate answer.
- **An RPC entrypoint on the admin, called through a service binding.** The site still has no
  database handle, the entrypoint cannot be reached over HTTP, and the call is synchronous.

## Decision

- **The admin Worker exports an `AdminEntrypoint`** (a `WorkerEntrypoint<AdminEnv>`), built by
  `createAdminEntrypoint(registry)` from `@studiobimo/backstage/admin/entrypoint`, the package's
  seventh entry. The consumer exports `export const AdminEntrypoint = createAdminEntrypoint(registry)`
  beside `export default createAdmin(registry)`, because the form methods need the registry. It is a separate entry because it imports
  `cloudflare:workers`, which Node cannot load: `./admin` stays loadable in tests and tooling.
  It is public and under SemVer, like the other `./admin` and `./site` names.
- **Its methods are few, validated and anonymous.** Every argument is parsed with zod inside the
  entrypoint, whatever the client already did. A method acts as an anonymous visitor and never
  as an editor: it takes no session, has no access to editor routes and writes only what a
  visitor may submit. The first method is `ping(context)`, which answers with the validated
  request context; #470 adds the form methods.
- **The site binds only to that entrypoint.** `services` names `entrypoint: "AdminEntrypoint"` in
  every environment, and never binds to the admin's default `fetch`, so the admin's HTTP surface
  and its Access policy stay out of reach of the site. The PUB-6 test asserts it for every site
  service binding, along with the admin's worker name in each environment (`<name>` at the top
  level, `<name>-production` in `env.production`).
- **The KV snapshot is still the only way the site reads content.** The entrypoint has no read
  method for pages, entries, settings or media. A change to that needs a new ADR.
- **The site calls through a typed client**, `adminRpc(env.ADMIN)`, exported from
  `@studiobimo/backstage/site`, which stays free of Hono and D1. It validates the context before
  the call and the answer after it, with the same schemas the entrypoint uses (`src/rpc.ts`).
- **The request context is passed explicitly.** A service binding call carries no visitor request,
  so the entrypoint cannot see the client IP or country. `requestContextOf(request)` reads the IP
  from `CF-Connecting-IP` and the country from `request.cf.country`, and every method takes the
  result as its first argument (`{ ip, country }`, each nullable), for Turnstile's `remoteip`
  and for rate limits. The entrypoint trusts it only as far as the site is trusted: it is a hint
  for abuse controls, never an authorisation.
- **Local development keeps two Vite dev servers.** `make -C .devtools dev` already runs the admin
  (5173) and the site (5174) as separate Vite processes with `@cloudflare/vite-plugin`, which
  resolves a service binding between processes through the dev registry, by worker name and
  entrypoint. The top-level binding names `backstage-admin`, so neither `wrangler dev` with
  several configs nor the plugin's `auxiliaryWorkers` (which would make the site a child of the
  admin) is needed. The registry is shared by every dev server on the machine, so two checkouts
  running at once can answer each other's binding: stop one before starting the other. The
  workerd test below is what proves the binding itself; the cross-process path is the plugin's
  documented behaviour and was not run for this ADR.
- **The round trip is tested in workerd** with wrangler's `createTestHarness`, which runs several
  Workers from inline configs in one test: `packages/backstage/test/rpc/` binds a site fixture to
  an admin fixture exactly as the template does and checks the call, the validation refusal and
  that the entrypoint answers no HTTP.

## Consequences

- ADR-0001's "they share no service binding" now reads: the site may bind to the admin's
  `AdminEntrypoint` and to nothing else. The two Workers still share no cookies, no origin and no
  code path, and the site still serves its last published snapshot if the admin is down; a method
  that needs the admin fails for that visitor only.
- ADR-0015's table gains a row: `./admin/entrypoint`, for the client's admin worker, reaches D1
  and workerd, SemVer yes. `./admin` and every other entry must not reach `cloudflare:`.
- The admin Worker's `main` becomes `worker/entry.ts`, which re-exports the app and the
  entrypoint, so the app's tests still import `worker/index.ts` in Node.
- A consumer deploys the admin before the site that binds to it, as Cloudflare requires.
- Each method added later is a minor release and an entry in the README.
