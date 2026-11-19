# ADR-0020: Forms are declared in the registry and their submissions live in the admin's D1

- **Status:** Accepted. Builds on [ADR-0019](0019-admin-rpc-entrypoint.md).
- **Date:** 2026-11-18

## Context

A reservation request (#470) is the first thing a visitor sends that the owner must review. A
contact form and leads for bimo.dev have the same shape: a schema, a public write, validation,
storage, a status the owner changes, and a notification. The inbox that lists them is #471 and the
projection of confirmed ones into KV is #472, so what is stored has to serve all three.

## Decision

- **A form is declared like a collection**, with `defineForm(name, { schema, statuses, notify,
public })` and `defineRegistry(blocks, { forms })`. The schema is a `z.object` the admin can
  render (the same rule as a block), built from the existing field helpers. A field may refer to
  a collection with `entries(collection)`; the registry refuses a form that names an unknown
  collection, as it does for a block.
- **Statuses** default to `new`, `confirmed` and `declined`. The first one is what a new
  submission starts as. A form may declare its own list.
- **`public: { statuses, fields }`** is the one place a form says what a visitor may see.
  `fields` is the whitelist that `status(token)` returns, and it is the only thing it returns
  besides the status. `statuses` names the statuses whose submissions may be shown to other
  visitors, which is what #472 projects (for example confirmed seats); it plays no part in
  `status(token)`, where a visitor always sees their own status. Both default to empty, so a form
  exposes nothing unless it says so. The registry refuses a status or field that does not exist.
- **Turnstile is on by default**, a form opts out with `turnstile: false`. The secret is
  `TURNSTILE_SECRET` on the admin Worker, the visitor address comes from the request context
  (ADR-0019), and a missing secret refuses every submission rather than letting them through.
- **`submit` checks in this order:** the form exists, the payload parses against the schema (and
  stays under 16 KiB), Turnstile passes, every referenced entry is published, then it stores.
  Parsing comes first so that a mistake costs no call to Cloudflare and the visitor can correct
  it and retry with the same Turnstile token. A reference must be a chosen list of published
  entries of that collection; `latest` and unknown or draft ids are refused.
- **Refusals are answers, not exceptions.** A refusal that a visitor can cause returns
  `{ ok: false, code, issues }` with a code from `API_ERROR` (`not_found`, `invalid`,
  `turnstile_failed`), so the site can map it to a status and show field issues. An argument that
  fails the entrypoint's own validation (a bug in the caller) still throws, as ADR-0019 says.
- **One table, `submissions`**: `id`, `form`, `token_hash`, `payload` (JSON), `status`,
  `created_at`, `updated_at`, indexed by `(form, status, created_at)` for the inbox. It is a
  package migration (`0016_submissions.sql`), which the admin's `migrations_dir` already points at.
  The payload is what the schema parsed, so unknown keys are dropped.
- **The token is stored as a SHA-256 hash.** It is a bearer capability to read a visitor's own
  fields, so a leaked database must not hand them all out. The lookup hashes the presented token.
  The id is separate and never accepted in place of the token.
- **One function changes a status**, `setSubmissionStatus(d1, registry, id, status)`, which checks
  the status against the form's list and moves `updated_at`. #471 calls it from the admin API and
  #472 reads the rows it leaves. `listSubmissions` and `findSubmission` are exported beside it.
- **The notification is the owner's, optional and never blocking.** `notify: { to, subject }`
  sends one email per recipient (`to` defaults to the `OWNER_EMAIL` addresses) through the
  `Mailer`. A failure is logged without the payload and the submission is kept.
- **The mailer is general.** `Mailer.send({ to, subject, text }, env)` replaces
  `LoginMailer.sendLoginLink`; the login link builds its own message. `EMAIL` and
  `AUTH_EMAIL_FROM` serve both.
- **Rate limits are not built here.** A public write should sit behind the Workers rate limiting
  binding on the site; `docs/guides/setup.md` shows how. Turnstile and the per-visitor address in
  the context are what the package itself relies on.

## Consequences

- `AdminEntrypoint` is no longer a class the package exports: it needs the registry, so the
  consumer writes `export const AdminEntrypoint = createAdminEntrypoint(registry)`. The entrypoint
  was unreleased, so this is not a breaking change for a published version.
- `LoginMailer` and `LoginLinkMessage` are gone from `./admin`; a project that passed its own
  mailer to `createAdmin` changes it to `Mailer`. A major bump if the release tooling counts it.
- A project upgrading runs `make migrate`, and sets `TURNSTILE_SECRET` on the admin Worker for a
  form that keeps Turnstile on.
- Entries a submission refers to are checked when it is submitted, not later: unpublishing a dish
  does not change a stored preorder, and the inbox shows whatever the entry's id resolves to.
