# ADR-0007: English and Spanish from the start

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The studio and its first clients work in English and Spanish. Adding localization later would
mean migrating every stored field and every route.

## Decision

- **UI strings** in the admin and in each site's own components come from i18next, through
  react-i18next, with `en` and `es` catalogues, as in lineup. `eslint-plugin-i18next` fails on
  hardcoded strings. It runs under the profile's ESLint, and oxlint can run the same plugin.
- **Content**: a field wrapped in `localized()` stores one value per locale, and every other
  field is shared. Pages have a slug for each locale.
- **Routes**: the default locale is served at `/` and the other at `/<locale>/`. Pages carry
  `hreflang` links, and an empty localized value falls back to the default locale.
- Locales are configured per site, in the registry, so adding a third needs no schema change. The
  site declares them once, in `defineRegistry` (see "Configuring locales" below).

## Configuring locales

- **Where:** `defineRegistry(blocks, { locales: ['es', 'en'], defaultLocale: 'es' })`. Omitted,
  they are `['en', 'es']` with `en` as the default, so a site that declares nothing is unchanged.
  The first locale is the default when `defaultLocale` is left out. An empty list, a repeated
  code, a code that is not a lowercase language tag (`en`, `pt-br`), or a default that is not in
  the list throws when the registry is defined.
- **The default locale is served at `/`**, the others under `/<locale>/`. A site with one locale
  has no prefixes, no `hreflang` alternates beyond itself, and no locale switcher.
- **Who reads it:** the registry is the only source. The admin Worker builds its request schemas,
  KV keys, published index and missing-translation counts from it. The admin SPA gets the same
  object from `GET /api/v1/config`, loaded once and cached for the session. The site reads it
  from its own registry and passes it to `parseRoute`, `pathOf`, `findTranslations` and
  `respondWithSitemap`, whose config argument defaults to `en` and `es`.
- **Requests carry exactly the configured locales.** The page, SEO and media-alt request schemas
  are functions of the locales (`pageInputSchema(locales)`), so a body with a missing or extra
  locale is refused at the boundary. Response and stored shapes accept any locale code.
- **The default locale comes first** in the list the admin and the editor see, so tabs always
  start on it.
- **Changing locales on a site that already has content is not automatic.** Stored pages keep the
  locale rows they were created with. Adding a locale needs a data migration that adds rows for
  each page, then a republish of every page and the site. Removing one leaves orphaned rows and
  snapshots, which are ignored. Declare the locales when the site is created.

The site Worker reads the registry's locales only in a release that includes
[#270](https://github.com/studiobimo/backstage/issues/270). `apps/site` is on the published `0.1.0`,
so its site keeps `en` and `es` until the next release
([#271](https://github.com/studiobimo/backstage/issues/271)).

## Consequences

- Every block author has to choose which fields are localized.
- The editor needs a locale switcher, and a way to show missing translations (LOC-2).
- Snapshots are written per locale, which doubles the KV writes for each publish.
