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
- Locales are configured per site, so adding a third needs no schema change.

## Consequences

- Every block author has to choose which fields are localized.
- The editor needs a locale switcher, and a way to show missing translations (LOC-2).
- Snapshots are written per locale, which doubles the KV writes for each publish.
