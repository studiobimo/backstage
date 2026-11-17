# ADR-0018: The logo and the theme color are site settings, handed to blocks by the renderer

- **Status:** Accepted
- **Date:** 2026-11-17

## Context

A site's logo appeared as a field of its footer block, and a header that wanted it would have
declared a second one. The theme color of the mobile browser bar had no home at all. Both are
brand data that every page shares and that several blocks and the document head read.

## Decision

- **`siteSettingsSchema` gains `logo` (an `image()`) and `themeColor` (a `hexColor()`).** Both are
  optional. `hexColor()` is a field kind of its own: `#rgb` or `#rrggbb`, trimmed and lowercased,
  rendered by the admin as a text input with a swatch of the current value, with no picker.
- **The site snapshot carries a `brand`** (`{ logo, themeColor }`), written on every publish of
  the site. A snapshot published before this change has none and reads as an empty brand, so the
  snapshot `format` does not change. The logo is a media reference like the default social image:
  it is listed in the snapshot's `media`, checked for existing at publish time and refused as
  `unknown_media` when it left the library.
- **Blocks read the brand through the render context.** `renderSlots` passes `site.brand` to each
  slot's `RenderProvider`, and `useBrand()` and `useLogo()` (the logo resolved against the media,
  like `useImage`) read it. A block no longer declares its own logo field.
- **The head emits `<meta name="theme-color">` and `<meta name="msapplication-TileColor">`** from
  `themeColor` when it is set, on pages and on entry pages. Open Graph has no color tag, so the
  one color serves the browser bar and the Windows tile, and the social image stays the
  `og:image` of the page or the site default.
- **Existing block content cannot be moved by a migration.** `migrate` sees one block's content
  and has no access to the settings, so a project that drops its footer's `logo` field loses the
  stored value when the block is next saved or published, and the editor uploads it again in the
  site settings. A project does this in the release after it bumps Backstage to the version that
  has the brand, and says so in its release notes.
