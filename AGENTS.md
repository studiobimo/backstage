# Agent guide: Backstage

Instructions for AI coding agents (Codex, Claude Code, and others) working in this repo.
`CLAUDE.md` only points here, so this file is the single source for every agent.

## Project

Lean, reusable CMS for studio marketing sites on Cloudflare's free tier.

Each site is two Workers: an admin (React SPA + Hono API over D1, R2 and KV) and a public site
that renders published snapshots from KV. The product docs are in `docs/`: read `docs/PRD.md`,
`docs/ROADMAP.md` and the ADRs before changing behaviour.

- What it is and how to use it: `README.md`
- Workflow and conventions in full: `CONTRIBUTING.md`
- Commit scopes: `core`, `admin`, `site`, `build`, `ci`, `docs`, `deps`, `devtools`. `.commitlintrc.yaml` enforces this
  list, so add a scope in both places.

## Layout

```text
.devtools/               Makefile (project targets), base.mk (shared targets), lefthook-base.yml (shared hooks)
  scripts/               agent-guard.sh, template-sync.sh, github-setup.sh, and this project's own scripts;
                         strings.sh holds every name and message the shared ones print
.github/workflows/       thin wrappers over studiobimo/.github reusable workflows
.claude/  .codex/        agent settings and the PreToolUse hook that runs agent-guard.sh
mise.toml  mise.lock     every tool the hooks and CI run, pinned; .mise/locks/ belongs with them
lefthook.yml             this project's hooks, on top of the shared ones
.commitlintrc.yaml       commit rules: commitlint's conventional config plus this project's scopes
AGENTS.md  CLAUDE.md     this guide; CLAUDE.md only imports it
```

<!-- Add the project's own directories above, one line each: path, then what lives there. -->

<!-- >>> template:rules -->
## Non-negotiables

These hold in every studiobimo repo. Git hooks, CI and an agent hook all enforce them, so a
violation is caught before it is reviewed.

- **Commits:** [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/),
  `<type>(<scope>): <summary>`. PRs are squash-merged, so the **PR title** must be one too.
  commitlint checks both against its conventional config: a lowercase summary with no full stop,
  at most 100 characters in the header and in each body line, and a scope from the project's list.
- **Issues:** titled the same way, like the commit that will close them: `fix: …`, `feat: …`,
  `docs: …`. The issue forms start the title with a type, and the `issue-title` workflow labels
  and comments on any issue whose title fails commitlint until it is fixed.
- **Branches:** [Conventional Branch](https://conventionalbranch.org/), `<type>/<description>`
  in lowercase with single hyphens, e.g. `feat/short-description`. Agents may use `claude/…` or
  `codex/…`.
- **PR size:** at most 20 changed files. Split bigger work with `gh stack`
  (`gh stack init`, `gh stack add`, `gh stack submit`).
- **Versioning:** SemVer, set by the project's release tooling. Never edit a version, create a
  tag, or write a `CHANGELOG.md` or release manifest by hand.
- **Pinning:** third-party GitHub Actions are pinned to full commit SHAs with the version in a
  comment; studiobimo's own reusable workflows are called at `@v1`. Every tool is pinned in
  `mise.toml` and locked in `mise.lock`. Dependabot does not read `mise.toml`: a tool is bumped by
  hand, then `make -C .devtools lock`, and `mise.toml`, `mise.lock` and `.mise/locks/` are
  committed together.
- **Workflows:** `permissions: {}` at the top, the minimum per job, `persist-credentials: false`
  on every checkout, secrets passed explicitly and never with `secrets: inherit`.
- **Say what you tested.** State what you ran and what it showed. If something could not be
  tested, say so plainly rather than implying it was.

A PreToolUse hook (`.devtools/scripts/agent-guard.sh`) blocks `gh pr create`, `gh stack submit`
and `git push` when the PR-size rule is violated, and blocks non-conventional branch names from
`git switch -c`, `git checkout -b`, `git worktree add -b`, `git branch` and `gh stack`.

## Where shared things live

Some files here are not this repo's to edit. Changing them locally only creates drift, which a
weekly workflow reports as an issue.

| To change | Edit it in | It reaches this repo by |
| --- | --- | --- |
| CI behaviour (lint, PR checks, release) | `studiobimo/.github`, `.github/workflows/` | the `@v1` tag moving |
| Branch and PR-size rules | `studiobimo/.github`, `.devtools/` | the `@v1` tag moving; lefthook refetches it daily |
| Shared hooks and tool versions | `studiobimo/project-template` | `make -C .devtools sync` |
| Files and blocks listed in the template's `.template/manifest`, and in the manifest of each profile in `.template-profiles` | `studiobimo/project-template` | `make -C .devtools sync` |

A managed block sits between `>>> template:<name>` and `<<< template:<name>` marker lines, like
this section. Edit outside the markers freely; inside them, change the template instead. If a
difference is deliberate, list the path in `.template-ignore` with a comment saying why. Entries
the manifest marks `required` cannot be ignored, and CODEOWNERS sends any change to the override
files to the fleet's owners.
<!-- <<< template:rules -->

## Commands

```sh
make -C .devtools setup   # once: pinned tools + git hooks
make -C .devtools check   # everything CI runs
make -C .devtools lint    # the pre-commit hook, on every file
make -C .devtools lock    # after changing a pinned version
make -C .devtools drift   # where this repo differs from the template
make -C .devtools sync    # pull the template's managed files
make -C .devtools github  # apply the org's GitHub settings and rulesets (CHECK=1 to compare)
make -C .devtools help    # all targets
```

## Conventions

<!-- What an agent cannot infer from the code: formatting it must not hand-apply, invariants,
where tests go, what cannot be tested locally. Keep each to one or two lines. -->

<!-- >>> template:vite -->
## Web app: Vite, React and TanStack

The `vite-react-tanstack` profile keeps this section, the shared configs in `.devtools/vite/`
and the scripts beside them in step with the template. The project's own `vite.config.ts`,
`vitest.config.ts`, `eslint.config.js` and `tsconfig*.json` import or extend those configs and
add only what is particular to it.

### Stack

- React 19 in StrictMode, TypeScript in `strict` mode, built with Vite.
- **Routing:** TanStack Router, file-based. A route is a file under `src/routes/`; the router
  plugin writes `src/routeTree.gen.ts` from them and splits each route into its own chunk.
- **Server state:** TanStack Query. **Forms:** TanStack Form. **Validation:** zod.
- **Strings:** i18next with react-i18next, from catalogs in `src/locales/`.
- **Styling:** Tailwind CSS v4, configured in `src/index.css`. Components: shadcn/ui in
  `src/components/ui/`, added with `pnpm exec shadcn add <name>`: the CLI is a devDependency,
  so the lockfile pins it like every other package (`pnpm add -D shadcn` in an older project).
- **Tests:** Vitest with Testing Library, next to the code as `*.test.ts(x)`.
- **Packages:** pnpm, pinned in `mise.toml`. Never add `package-lock.json` or `yarn.lock`.
- **Hosting** is another profile's job. Nothing in `src/` should know where the app runs:
  it reaches its backend over HTTP, at `/api`. A hosting profile writes `.devtools/host/`,
  and the shared Vite, Vitest, ESLint and make configs take its part from there.

### Layout

```text
src/
  routes/            file routes, kept thin: they load data and render a feature's page
  features/<name>/   flat: schema.ts, queries.ts, <name>-page.tsx and their tests
  locales/<lang>/    one JSON catalog per namespace: common.json, then one per feature
  i18n/config.ts     loads every catalog; locales.test.ts holds each language to the same keys
  components/ui/     shadcn/ui primitives; regenerate them, do not hand-edit them. ESLint and
                     Prettier leave them out
  components/        shared components; hooks/ and lib/ hold shared hooks and helpers
  config/site.ts     the site's name, description and URL, for index.html and the app
  routeTree.gen.ts   generated by the router plugin; committed, never edited
```

`@/` is `src/`. A feature folder stays flat, so one `ls` shows all of it. Only code that more
than one feature uses moves up to `components/`, `hooks/` or `lib/`.

In a workspace the app sits in `APP_DIR`, which `.devtools/Makefile` sets, and the layout above
is inside it. Its `package.json` lists what the app imports. The root's lists the tools that
`.devtools/` imports, since those resolve from the root. `.prettierignore` stays at the root.
Run `pnpm exec shadcn` from `APP_DIR`.

Every other package brings its own `eslint.config.js` and `vitest.config.ts`, on the shared
`base` of each, and adds what only it needs. ESLint uses the nearest config to each file, and
`make -C .devtools test` runs every package that has a Vitest config. `tsc` reaches a package
through its imports; for the rest, give it a `tsconfig.json` that extends
`.devtools/vite/tsconfig.base.json` and add it to `TSC_PROJECTS` in `.devtools/Makefile`, after
`include vite.mk`, as `../../packages/<name>`.

```js
// packages/<name>/eslint.config.js
import { defineConfig } from 'eslint/config'

import { base } from '../../.devtools/vite/eslint.js'

export default defineConfig([base, { rules: {} }])
```

```ts
// packages/<name>/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'

import { base } from '../../.devtools/vite/vitest.ts'

export default mergeConfig(base, defineConfig({ test: {} }))
```

### Conventions

- **Scaffold with the generator** rather than copying the nearest file: it writes code that
  is formatted, lint-clean and tested from the start. `pnpm gen` runs it too.

  ```sh
  node .devtools/scripts/gen.mjs feature invoices            # schema, query, page, test
  node .devtools/scripts/gen.mjs route /invoices --feature invoices
  node .devtools/scripts/gen.mjs route '/invoices/$invoiceId'
  node .devtools/scripts/gen.mjs component status-badge      # or: hook <name>
  ```

- **No inline strings.** Text a person reads, including `aria-label`, `title`, `alt` and
  `placeholder`, comes from a catalog through `t()`, even in an app with one language: it
  keeps copy in one place to review and makes a second language a new folder, not a
  rewrite. ESLint's `i18next/no-literal-string` enforces it. A feature's strings go in its
  own namespace, `useTranslation('<feature>')`; shared ones in `common`. A key with no
  string fails any test that renders it.
- **One schema per concept.** A feature's zod schema validates its form, its API responses
  and, on the server, its requests. Never write a second schema for the same payload. A
  workspace may keep shared schemas in a package instead of `src/features/<name>/schema.ts`.
- **Query options live with the feature.** `queries.ts` exports `queryOptions(...)`, so a
  route's `loader` can `ensureQueryData` what its page then reads with `useSuspenseQuery`.
- **Code-splitting.** Routes split themselves. Use `lazy()` with `<Suspense>` for heavy,
  rarely seen components (editors, charts, dialogs), never for small or above-the-fold
  ones. Vendor chunks are set in `.devtools/vite/vite.ts`. The bundle budget
  (`make -C .devtools budget`) is a signal to split, not a number to raise quietly.
- **Styling uses the design tokens.** No raw colour values outside `src/index.css`; use the
  semantic utilities (`bg-card`, `text-muted-foreground`).
- **Abstract before duplicating.** Extend an existing component or helper rather than adding
  a parallel one.
- **Comments say why, not what.** Names carry the meaning; a comment is for a workaround, an
  invariant or a trap.

### Commands

```sh
make -C .devtools install   # the packages pnpm-lock.yaml pins
make -C .devtools dev       # Vite dev server on http://localhost:5173
make -C .devtools ci        # build, types, ESLint, Prettier, tests, budget, audit
make -C .devtools fmt       # Prettier over the web sources
```
<!-- <<< template:vite -->
