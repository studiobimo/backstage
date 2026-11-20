# Set up a client project

- **Status:** Started. The Cloudflare account steps are still to be written, in [#36](https://github.com/studiobimo/backstage/issues/36).
- **Issue:** [#281](https://github.com/studiobimo/backstage/issues/281) wrote the database section.

This guide takes a client project from an empty Cloudflare account to a working admin and site.
Only the database migrations are written so far, plus the notes below on what a consumer hits.
Still missing: the site Worker's `wrangler.jsonc`, the Vite plugin setup, the deploy flow, and a
consumer template to copy.

## Apply the package's migrations

The package ships its D1 migrations in `migrations/` and a make target, `backstage.mk`, that runs
`wrangler d1 migrations apply` against them. Both come from `node_modules`, so a client project
points at them there instead of keeping a copy.

Point the D1 binding in the admin Worker's `wrangler.jsonc` at the package's directory:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "client-name",
      "database_id": "<id from wrangler d1 create>",
      "migrations_dir": "node_modules/@studiobimo/backstage/migrations"
    }
  ]
}
```

Include the make target with `-include`, not `include`:

```make
-include node_modules/@studiobimo/backstage/backstage.mk
```

In a pnpm workspace the package is linked under the app that depends on it, for example
`apps/admin/node_modules/@studiobimo/backstage`, so that path does not exist at the root. Include
it from there instead:

```make
-include apps/admin/node_modules/@studiobimo/backstage/backstage.mk
```

`backstage.mk` also uses two variables it does not define, so set them before the `-include`:
`ROOT`, the repository's absolute root, and `MISE`, the command that runs a tool at its pinned
version (`mise`, or `mise exec --` if your Makefile already prefixes it). For example:

```make
ROOT := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
MISE := mise
```

Adjust `ROOT` if the Makefile is not at the repository root, as in `.devtools/Makefile`. The recipe
runs `cd $(ROOT)/$(BACKSTAGE_ADMIN_DIR) && $(MISE) exec -- pnpm exec wrangler ...`.

A plain `include` fails on a fresh clone, because the file is not in `node_modules` until
`make install` has run, and `make install` is the target that would put it there. `-include` skips
the missing file and reads it on the next run.

Then `make migrate` applies them to the local database, `make migrate REMOTE=1` to the deployed one,
and `ENV=<env>` picks a Wrangler environment. `BACKSTAGE_ADMIN_DIR` (default `apps/admin`) is where
`wrangler.jsonc` lives and `BACKSTAGE_D1_BINDING` (default `DB`) is the binding name.

A new package release can add migrations. Run `make migrate` after updating the package; Wrangler
applies only the ones the database has not seen.

`packages/backstage/test/pack.test.ts` runs exactly this against the packed tarball, so the steps
above are checked on every pull request.

## Mount a client app on a route

A route that needs a client app, such as a seat picker on `/reserve`, renders inside the site
document with `renderInShell`. It takes the header and footer slots, the stylesheet, the head
(title, description, canonical, hreflang, theme color) and the language switcher from the published
site snapshot of its locale, exactly as a content page does, and the security headers stay as they
are.

```tsx
import { createSite, renderInShell } from '@studiobimo/backstage/site/hono'

export default createSite({
  components,
  stylesheet,
  contentSecurityPolicy: { scriptSrc: ["'self'"], connectSrc: ["'self'"] },
  routes: (app) => {
    app.get('/reserve', (c) =>
      renderInShell(c, {
        locale: 'en',
        title: 'Reserve a seat',
        description: 'Pick your seat on the floor plan.',
        body: <div id="reserve-root" data-venue="main-hall" />,
        scripts: ['/reserve/app.js'],
        translations: { es: '/es/reserve' }
      })
    )
  }
})
```

- **`body`** is any React node. Pass the client's configuration through `data-*` attributes on a
  mount element, because inline scripts stay blocked.
- **`scripts`** are same-origin paths, served from the site's `ASSETS` binding and loaded as
  `<script type="module">`. A full URL or a protocol-relative one throws.
- **CSP additions.** `scriptSrc: ["'self'"]` lets the bundle run. Add `connectSrc: ["'self'"]` (or
  the API origin) when the client calls `fetch`, because the default policy blocks it. Styles set at
  run time, such as an inline `style` attribute, need `styleSrc` to allow them. Nothing allows
  inline scripts, so the bundle cannot rely on them. `contentSecurityPolicy` takes `styleSrc`,
  `imgSrc`, `fontSrc`, `mediaSrc`, `connectSrc`, `scriptSrc` and `frameSrc`. `turnstile: true` merges
  its origin into your `scriptSrc` and `frameSrc` rather than replacing them.
- **`translations`** maps other locales to the path of the same route. It adds the `hreflang`
  alternates and the switcher links; leave it out for a route that exists in one locale.
- Register the route in `routes`, which runs before the catch-all page route, and serve the bundle
  from your own route or static assets.

## Enhance server-rendered blocks with a script

For a small interactive piece, such as an order cart on a menu page or an image carousel, keep the
server-rendered HTML as the source of truth and let a module script enhance it. The block renders
its data into `data-*` attributes, because inline scripts and inline JSON stay blocked, and the
script finds them and attaches behaviour.

```tsx
const menu = defineBlock({ name: 'menu', schema, clientScript: '/cart.js' })

const Menu = ({ items }) => (
  <ul data-cart>
    {items.map((item) => (
      <li key={item.id} data-sku={item.sku} data-price={item.price}>
        {item.name}
      </li>
    ))}
  </ul>
)
```

```ts
document.querySelectorAll('[data-cart]').forEach(enhanceCart)
```

- **`clientScript`** on a block loads the script, as `<script type="module">`, only on documents
  where the block appears, once however many instances there are. The block in a header or footer
  slot counts.
- **`createSite({ scripts: ['/analytics.js'] })`** loads a script on every document: pages, entry
  pages, the block preview and `renderInShell` routes. It is deduplicated against block scripts.
- **Paths** are same-origin (`/cart.js`); a full URL or a protocol-relative one throws when the site
  or block is defined. Serve the file from the site's `ASSETS` binding.
- **CSP.** Declaring either one adds `'self'` to `script-src`. Nothing else in the policy changes,
  so add `connectSrc` yourself if the script calls `fetch`.
- **When to use which.** A script that enhances markup the server already rendered belongs here. A
  route that is an application, such as a seat picker, with its own mount element and bundle, uses
  `renderInShell` as in the section above.

## Things a consumer runs into

- **Admin assets config.** Use `"binding": "ASSETS"` and
  `"run_worker_first": ["/*", "!/assets/*", "!/block-thumbnails/*", "!/favicon.svg"]`, as in
  [the research note](../research/admin-spa-as-assets.md).
- **Access variables.** `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are plain `vars`
  ([Cloudflare Access](cloudflare-access.md)). The CI token is `BACKSTAGE_PACKAGE_TOKEN`, not
  `GITHUB_TOKEN` ([package token](package-token.md)).
- **Do not name a package script `deploy`.** `pnpm deploy` is a built-in command, so
  `pnpm deploy` runs the built-in and not your script; use `pnpm run deploy`, or pick another name
  such as `ship`.
- **Registry settings inside a block.** A block reads the published settings while it renders with
  `useSettings(settingsSchema)` from `@studiobimo/backstage/render`, passing the same schema the
  registry declares. It returns the parsed, typed settings, or `null` when none were published or
  they do not match the schema. Outside a block, `findRegistrySettings` reads them.
- **Exported types.** With `composite` or `declaration` on, exporting a block schema or registry
  that uses `link()` needs `LinkInput` and `ResolvedLink` to be nameable, or TypeScript reports
  TS2883 or TS4023. Import both from `@studiobimo/backstage`.
- **Block preview assets are SVG only.** `createSite({ preview: { assets } })` serves each entry at
  its path with `Content-Type: image/svg+xml`, so it is for SVGs. For fonts, images or anything
  else, give the site Worker a static `assets` binding in its `wrangler.jsonc` and serve the files
  from there (not tried end to end here).
- **What `createSite` renders around your layout.** Besides the layout and its slots, it appends an
  unstyled `<nav aria-label="...">` language switcher after them (labelled `Language`, or `Idioma`
  on a Spanish page; only when the site has more than one locale), and every page, including the
  block preview, renders an `<h1>` of the page title before the blocks. Neither is in a slot, so
  style the nav from your stylesheet, and leave the page title out of your blocks' own headings if
  you do not want two `h1`s. There is no option to turn either off yet.

## Take public submissions in a form

A form is declared in the registry ([ADR-0020](../adr/0020-forms-and-submissions.md)). The site
sends it to the admin through the entrypoint, and the owner reads it in the admin's D1.

1. Declare the form, and pass it to `defineRegistry` with `forms: [reservationForm]`:

   ```ts
   export const reservationForm = defineForm('reservation', {
     schema: z.object({
       seats: z.number().int().min(1),
       date: z.iso.date(),
       name: z.string().min(1)
     }),
     notify: { subject: 'New reservation request' },
     public: { statuses: ['confirmed'], fields: ['seats', 'date'] }
   })
   ```

2. Export the entrypoint from the admin Worker, built from the same registry:
   `export const AdminEntrypoint = createAdminEntrypoint(registry)`.
3. Set `TURNSTILE_SECRET` on the admin Worker (`pnpm exec wrangler secret put TURNSTILE_SECRET`),
   and follow the Turnstile section below for the widget on the site: the site holds no secret, and
   the admin verifies the token. For the owner notification,
   bind `EMAIL` and set `AUTH_EMAIL_FROM` and `OWNER_EMAIL` on the admin Worker.
4. Run `make migrate`: the package adds the `submissions` table.
5. Call it from the site Worker with the visitor's context, and keep the `token` it returns:

   ```ts
   const rpc = adminRpc(env.ADMIN)
   const sent = await rpc.submit(requestContextOf(request), 'reservation', payload, turnstileToken)
   if (!sent.ok) {
     const error = Object.values(API_ERROR).find(({ code }) => code === sent.code)!
     return c.json({ code: error.code, error: error.message, issues: sent.issues }, error.status)
   }
   const followed = await rpc.status(requestContextOf(request), sent.token)
   ```

   `status` returns the status and only the fields the form lists under `public.fields`.

### Label fields in each language

The admin shows each field's title and description from the schema. Without more, the title is the
humanised key (`slotMinutes` reads "Slot minutes") in every language. Declare labels per locale,
one or more, and the admin picks the one for its own language, then the one for the site's default
locale, then the plain `title`, then the humanised key. It applies to the registry settings schema
and to a form's schema, and to the title of an object, which is a group's heading.

```ts
import { labeled, localized } from '@studiobimo/backstage'

const settings = z.object({
  reservations: labeled(
    z.object({
      slotMinutes: labeled(z.number().int(), {
        en: { title: 'Slot length (minutes)', description: 'How often a table can start.' },
        es: { title: 'Intervalo (minutos)', description: 'Cada cuánto puede empezar una mesa.' }
      })
    }),
    { en: { title: 'Reservations' }, es: { title: 'Reservas' } }
  )
})
```

`labeled(schema, labels)` is `schema.meta({ ...schema.meta(), labels })`, so it keeps what a field
such as `localized()` already declares. A release of the package that has no `labeled` still works
with plain metadata, because the admin reads the `labels` key from the JSON schema:
`schema.meta({ ...schema.meta(), labels: { en: { title: '...' } } })`. A column of the form inbox
takes its heading from the same title.

### Weekly opening hours

`weeklyHours()` declares a field that the admin edits as a week. It stores a time zone, several
`open` and `close` ranges for each weekday and a list of dated exceptions:

```ts
const settings = z.object({ hours: weeklyHours() })

const stored = {
  timeZone: 'America/Tegucigalpa',
  week: { monday: [{ open: '09:00', close: '17:00' }], tuesday: [] /* through sunday */ },
  exceptions: [{ date: '2026-12-25', ranges: [] }]
}
```

Declare all seven days (`monday` to `sunday`); a day with no ranges is closed. The times are `HH:mm`
strings, a range may not open and close at the same minute, and an exception date appears once.
`timeZone` is an IANA name, and an exception replaces that date's ranges (an empty list closes it).
A range whose `close` is earlier than its `open` runs past midnight into the next day.

`weeklyHours` and these helpers come from `@studiobimo/backstage`, and the helpers also from
`@studiobimo/backstage/site` for client scripts. They read the stored value (`instant` is a `Date` or a
millisecond timestamp):

- `isOpenAt(hours, instant)` answers `'open'`, `'before-opening'` (closed now, opens later today) or
  `'closed'`.
- `nextOpening(hours, instant)` returns the `Date` of the next time a range starts, or `undefined`
  when none starts within 400 days.
- `slotsFor(hours, date, { step, leadTime, now })` lists the `Date` of each bookable start on a
  `YYYY-MM-DD` date, every `step` minutes inside its ranges. `leadTime` (minutes, default 0) drops
  starts earlier than `now` plus that lead time. A date that is not real, or a `step` that is not
  positive, returns an empty list.

The older shape, a week keyed by weekday with a boolean `closed` and string `opens` and `closes`
for each day, still renders as a day-by-day editor with a switch and times, but the helpers above do not read it.
Use `weeklyHours()` for new fields. Any other object renders as a plain group of labelled fields.

### Prices

`money()` stores a whole number of minor units (cents for USD, centavos for HNL), so totals never
drift through floating point. The currency is not part of the field: it is the registry setting
named `currency`, declared with `currency()`, which accepts the codes in `CURRENCY_CODES` (`USD`
and `HNL`) and defaults to `USD`.

```ts
const settings = z.object({ currency: currency() })
const price = defineBlock({ name: 'price', schema: z.object({ amount: money() }) })

function Price({ amount }: { amount: number }) {
  const formatMoney = useMoney()
  return <p>{formatMoney(amount)}</p>
}
```

The admin edits the field as a decimal amount in the saved currency. `useMoney()`, from
`@studiobimo/backstage/render`, formats with the page locale and the published `currency` setting,
and reads `USD` when the setting is missing. Client scripts call
`formatMoney(amount, currency, locale)` from `@studiobimo/backstage/site`. Supporting another
currency is one line in `MONEY.currencies`, with its minor-unit digits. The package converts
nothing between currencies.

### Rate limit a public write

Turnstile stops bots, not a person sending many requests. Put the Workers rate limiting binding in
front of the write, on the site Worker. Declare it in `wrangler.jsonc`, with a unique
`namespace_id` and a `period` of 10 or 60 seconds:

```jsonc
"ratelimits": [{ "name": "FORM_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }]
```

and call it before `rpc.submit`, keyed by the visitor's address:

```ts
const { success } = await env.FORM_LIMITER.limit({ key: requestContextOf(request).ip ?? 'unknown' })
if (!success) return respondWithError(c, API_ERROR.tooManyRequests)
```

The limit is per Cloudflare location and eventually consistent, so it slows abuse and does not
count exactly. The package does not do this itself yet.

## Protect a public form with Turnstile

1. Create a Turnstile widget in the Cloudflare dashboard and note its site key and secret key.
2. Store the secret on the **admin** Worker, never in the repository:
   `pnpm exec wrangler secret put TURNSTILE_SECRET` (add `--env <env>` for a deployed environment),
   run from the admin app. The site Worker never sees it. The site key is public and can sit in
   `vars` or in your block's markup.
3. Pass `turnstile: true` to `createSite`. It adds `https://challenges.cloudflare.com` to
   `script-src` and `frame-src`, merged with any `scriptSrc` and `frameSrc` you pass, so the widget
   script loads and its iframe renders under the package's policy. The rest of the policy is
   unchanged, and `contentSecurityPolicy` still takes the other additions.

   ```ts
   export default createSite({ components, stylesheet, turnstile: true })
   ```

4. Render the widget in your form: load `https://challenges.cloudflare.com/turnstile/v0/api.js`
   and add `<div class="cf-turnstile" data-sitekey="...">`. The widget adds a
   `cf-turnstile-response` field to the form.
5. Pass the token to the admin. `rpc.submit(context, form, payload, turnstileToken)` verifies it
   with `AdminEnv.TURNSTILE_SECRET` before storing anything, and a form that sets
   `turnstile: false` skips the check ([ADR-0020](../adr/0020-forms-and-submissions.md)). A missing
   secret refuses every submission. Read the token from the form's `cf-turnstile-response` field.
6. A route that is not a form submission can verify on the site with `verifyTurnstile`, exported
   from `@studiobimo/backstage/site` without Hono. That route is the only one that needs the secret
   on the site Worker:

   ```ts
   const result = await verifyTurnstile({
     token: form.get('cf-turnstile-response')?.toString(),
     secret: c.env.TURNSTILE_SECRET,
     ip: c.req.header('CF-Connecting-IP')
   })
   if (!result.success) return respondWithError(c, API_ERROR.forbidden)
   ```

   `result.reason` is `missing-token`, `rejected` or `unavailable` (siteverify could not be reached
   or answered something unexpected). Treat all three as a refusal.
