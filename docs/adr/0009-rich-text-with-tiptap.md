# ADR-0009: Rich text is edited with Tiptap and stored as a fixed JSON document

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

BLK-2 needs a rich text field. Writing an editor is out of scope, so the admin needs an existing
library. The two candidates were Tiptap (on ProseMirror) and Lexical (from Meta). What the field
stores matters as much as the editor: the site renders it on the server with no client
JavaScript (PUB-3), the API validates every save with the block's zod schema (ADR-0003), and
editors must not be able to break the design.

## Decision

- **The editor is Tiptap 3**, with StarterKit narrowed to what a marketing site shows: paragraphs,
  headings at levels 2 and 3, bold, italic, links, hard breaks, bulleted and numbered lists, and
  quotes. Lists and quotes hold paragraphs only, so they cannot nest. The admin loads the editor
  lazily, in its own chunk.
- **`richText()` stores the ProseMirror JSON document** and validates it with a zod schema of
  exactly those nodes and marks (`packages/backstage/src/rich-text.ts`). That schema is not
  recursive, so its JSON Schema has no `$ref` and the admin reads it back with
  `z.fromJSONSchema` like every other field.
- **A link's address must start with `https://`, `http://`, `mailto:`, `tel:`, `/` or `#`.** The
  schema and the editor share one pattern, `RICH_TEXT.safeHref`, so no stored link can run a
  script.
- **The site renders the document with `@tiptap/static-renderer`** to React on the server, with no
  client JavaScript. That work belongs to rendering published pages (PUB-3), which also checks the
  site worker's bundle size with the renderer in it.
- No HTML is stored, so nothing has to be sanitized on render.

## Consequences

- A new node or mark means a release of Backstage: the schema, the editor and the renderer change
  together.
- Content is a document, not a string, so a block reads it through the renderer rather than
  printing it.
- Lexical was not chosen: it is pre-1.0, and rendering its state on the server needs headless
  Lexical plus a renderer of our own.
