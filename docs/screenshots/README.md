# M1 admin screenshots

Captured on 2026-11-09 from `main`. Everything except the page editor screens is from 22d4175; those were recaptured at be08695 (#162), which added the block form, with the local admin (`make -C .devtools dev`,
`DEV_AUTH=true`) and Playwright. Seed data: four pages (Home, About, Services, Contact, each with `en`
and `es` titles and a hero block), two uploaded images, and Home published.

File names are `<nn>-<screen>--<variant>.png`. Variants: `desktop-light`, `desktop-dark` (1440 px wide),
`mobile-light`, `mobile-dark` (360 px wide). Long screens are taken on a tall viewport (1900 px desktop,
2600 px mobile) because the app scrolls inside its shell, so a full-page capture would cut them off.

## Captured

| # | Screen | Variants |
| --- | --- | --- |
| 01 | Dashboard (`/`) | all four |
| 02 | Pages list | all four |
| 03 | New page sheet | all four |
| 04 | New page sheet with validation errors | all four |
| 05 | Page editor, English | all four |
| 07 | Page editor, add block menu | all four |
| 13 | Page editor, hero block expanded (English) | all four |
| 14 | Page editor, hero block expanded (Spanish, with the English copy and Copy English) | all four |
| 08 | Media (upload) | all four |
| 09 | Media picker dialog (social image) | all four |
| 10 | Site settings (general, header, footer slots) | all four |
| 11 | Not found | all four |
| 12 | Type specimen (`/type`, a dev page) | all four |
| 15 | Page editor with unsaved changes | all four |
| 16 | Leave-with-unsaved-changes dialog | all four |
| 17 | Delete page dialog | desktop-light, desktop-dark, mobile-light |
| 18 | Page details sheet | desktop-light, desktop-dark, mobile-light |
| 19 | Media upload with alt text tabs | desktop-light, desktop-dark, mobile-light |
| 20 | Media upload, decorative image | desktop-light, desktop-dark, mobile-light |
| 21 | Page editor, published (hero open) | all four |
| 22 | Pages list with a published page | desktop-light, desktop-dark, mobile-light |

## Missing screens and gaps

Found while capturing. Nothing here was changed.

1. **No media library.** `/media` is the upload form only. The grid exists only inside the picker dialog
   (09). Browse, search, alt text editing and delete-in-use (MED-3, Should) have no screen. The breadcrumb
   there reads "Home" instead of "Media".
2. **Dashboard is empty.** A title and a tagline, with no recent pages, drafts, publish state or shortcuts.
3. **No block picker preview.** The add block menu is a plain list of block names, with no description or
   thumbnail (BLK-6, Should).
4. **No preview.** There is no preview action or screen (PRV-1 and PRV-2 are not in M1).
5. **No sign-in, access denied or user screens.** Auth is Cloudflare Access plus `DEV_AUTH` in M1, so
   nothing to show. Magic link and user management (AUT-3, AUT-4) come later.
6. **No collections screens (COL-1 to COL-5).** Not in M1.
7. **No error and edge states.** I did not capture the stale-version alert, the save-failed alert, a
   publish validation refusal or the unpublish confirm. They exist in code (`stale-alert.tsx`,
   `save-failed-alert.tsx`, `publish-panel.tsx`) and need forced states.
8. **No rendered site.** The public pages (hero in `en` and `es`, the 404) come from the site worker,
   which the admin dev server does not run, so they are not here.
9. **Empty settings.** Site name, description and slots are blank in the shots, as this install has none
    saved. A filled version would help the design work.
10. **Small visual issues seen:** the sticky Save button on Settings sits over the last field of a
    section; Settings and Media show a single sub item in the sidebar ("General", "Uploads").
