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
- **No comments** in code files. Code that seems to need one gets a well-named helper or clearer
  names instead. A suppression (`eslint-disable`, `@ts-ignore`, `# noqa`) is a finding too: fix
  what the linter flags. `.uncomment.toml` sets what `uncomment` checks, in the pre-commit hook.
- **One source of truth.** Domain logic, validation rules, schemas and configuration values live
  in exactly one place, in application code, tests, build scripts and workflows alike. Replace
  duplication with shared functions or modules: fewer lines through consolidation, never through
  clever one-liners. `make -C .devtools check` runs jscpd (`.jscpd.json`), and knip where there
  is a `package.json`.
- **Repo health:** the `repo-health` workflow runs these and more (lizard: functions under 80
  lines) over every tracked file. A finding fails it unless `.repo-health/baseline.json` lists it
  with an open issue, and each pull request resolves at least one listed finding while any are
  left. Changing an analyser's config needs the `repo-health-config-change` label.
- **Constants by domain:** grouped in objects, `DOMAIN.group.name`, not `DOMAIN_GROUP_NAME`.
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

### Code style: no comments, one source of truth

This overrides "Comments say why, not what" in the Vite block below.

- **No comments.** Never write an inline or block comment in a code file: no `//`, `/* */`,
  `/** */`, `{/* */}`, JSON comments in `wrangler.jsonc`, or `#` lines in `.dev.vars.example` and
  `_headers`. Directives a tool reads (`eslint-disable`, `@ts-expect-error`, `TODO`, `FIXME`)
  are the only exception, and each needs a real reason.
- **Refactor instead of explaining.** If code seems to need a comment, extract it into a
  well-named helper or give the values excessively clear, descriptive names. The reason for a
  decision belongs in `docs/` (an ADR), the PR description or the commit message.
- **Strip comments with [uncomment](https://github.com/goldziher/uncomment)** before
  committing: `uncomment -d -r -f --exclude '**/routeTree.gen.ts' --exclude '**/components/ui/**' apps packages`
  (`-d -r -f` also removes doc, TODO and FIXME comments). It is pinned in the author's mise;
  review the diff, since it leaves empty `{}` JSX expressions and can keep a comment line it
  matches to a directive pattern.
- **Single source of truth.** Domain logic, validation rules, schemas and configuration values
  live in exactly one canonical place and are imported everywhere else.
- **Eliminate duplication.** Replace copy-pasted snippets and repeated calculations with a shared
  function, class or utility. Run `jscpd` and `knip` and act on what they report. This covers
  application code, tests, build scripts and workflow configuration alike.
- **Fewer lines through consolidation,** never through obfuscated one-liners. Clarity and
  maintainability come first.
- **Constants and configuration are grouped by domain in objects,** read as
  `DOMAIN.group.name`, never as `DOMAIN_GROUP_NAME`:

  ```ts
  export const SESSION = { cookie: { name: 'session', maxAgeSeconds: 3600 } } as const
  ```

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

With more than one app, list them in `APPS` instead (`APPS := apps/admin apps/site`). `build`,
`typecheck`, `budget`, `clean` and the host's `types` and `deploy` then run once per app and stop
at the first that fails; `dev` and `preview` take the first. `APP=apps/site` narrows any of them
to one app. Give an app its own budget with `BUNDLE_DIR@apps/site`, `BUNDLE_CHUNK_KIB@apps/site`
or `BUNDLE_TOTAL_KIB@apps/site`. `gen.mjs` writes the first app.

Every other package extends the same presets as the app, so it gets every shared check without
opting in to each. ESLint uses the nearest config to each file, and `make -C .devtools` finds a
package by its `src/`, not from a list:

- **ESLint:** `react` is the app's `app` without what only a Vite app has (Fast Refresh, the
  router). A hardcoded string in a `.tsx` file fails in any package.
- **Vitest:** `base` is the React setup: jsdom, `globals`, the React plugin, `src/test/setup.ts`
  when there is one. `make test` runs a package with no `vitest.config.ts` on it as it is.
- **tsc:** `make typecheck` runs `tsc -b` in a package that has a `src/`, and fails when it has
  no `tsconfig.json`. No list to edit.
- **Apps:** a package with a `vite.config.ts` that is not in `APPS` (or `APP_DIR`) fails
  `make budget`, so an app cannot go without a build and a budget.

A new package needs a `package.json`, and these two files for the default case:

```js
// packages/<name>/eslint.config.js
import { defineConfig } from 'eslint/config'

import { react } from '../../.devtools/vite/eslint.js'

export default defineConfig([react])
```

```json
// packages/<name>/tsconfig.json
{ "extends": "../../.devtools/vite/tsconfig.package.json" }
```

What is particular to a package is an override in its own config, where it can be seen. A package
that is not React, or is exempt, turns off what does not apply:

```js
// packages/<name>/eslint.config.js: a library with no UI
export default defineConfig([react, { rules: { 'i18next/no-literal-string': 'off' } }])
```

```json
// packages/<name>/tsconfig.json: runs in Node, not a browser
{
  "extends": "../../.devtools/vite/tsconfig.package.json",
  "compilerOptions": { "lib": ["ES2023"], "types": ["node", "vitest/globals"] }
}
```

```ts
// packages/<name>/vitest.config.ts: only when the default is not enough
import { defineConfig, mergeConfig } from 'vitest/config'

import { base } from '../../.devtools/vite/vitest.ts'

export default mergeConfig(base, defineConfig({ test: { environment: 'node' } }))
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
  a parallel one. knip fails on unused files, exports and dependencies; `knip.json` exempts the
  shadcn/ui primitives and the dependencies a new app has before its first feature.

### Commands

```sh
make -C .devtools install   # the packages pnpm-lock.yaml pins
make -C .devtools dev       # Vite dev server on http://localhost:5173
make -C .devtools ci        # build, types, ESLint, knip, jscpd, Prettier, tests, budget, audit
make -C .devtools fmt       # Prettier over the web sources
```
<!-- <<< template:vite -->

<!-- >>> template:cloudflare -->
## Hosting: Cloudflare Workers

The `cloudflare` profile keeps this section and `.devtools/host/` in step with the template.
The shared Vite, Vitest, ESLint and make configs load their Cloudflare parts from there, so
the project's own config files never name the host. `wrangler.jsonc`, `.dev.vars.example`
and `worker/` are the project's. In a workspace they sit in each app's directory (`APP_DIR`, or
every entry of `APPS`), so run `wrangler` there.

- **One Worker serves the app.** Static files come from `dist/client`, and any path that is
  not a file falls back to `index.html` for the router. Only `/api/*` runs the Hono app in
  `worker/index.ts`. `make -C .devtools dev` runs it in workerd beside the client, with
  the bindings in `wrangler.jsonc` simulated locally.
- **Environments.** The top level of `wrangler.jsonc` is local development. Deploys go to
  `env.development` or `env.production`, as `<name>-development` and `<name>-production`.
  Neither inherits bindings or vars from the top level, so restate them in each. A project
  with no development environment or `develop` branch sets `DEPLOY_ENVS := production` in
  `.devtools/Makefile`, and keeps only `env.production`.
- **Deploy with `make -C .devtools deploy ENV=<env>`.** The environment is fixed when the
  app is built, not when it is deployed. The target builds and deploys in one step;
  `wrangler deploy` after a plain build ships local development's bindings. It refuses to
  run from any branch but the one its environment ships from: `develop` for development,
  `main` for production.
- **`deploy.yml` runs the same target:** on a push to `develop` to development, and to
  production when `release.yml` calls it for a release. A run from Actions defaults to the
  first environment in `DEPLOY_ENVS`. It needs a repository variable,
  `CLOUDFLARE_ACCOUNT_ID`, and in each of its GitHub environments a `CLOUDFLARE_API_TOKEN`
  secret, from the "Edit Cloudflare Workers" template and limited to the account. Don't also
  connect Workers Builds, or every push deploys twice.
- **Secrets** are never committed. List their names in `.dev.vars.example`. Put local
  values in `.dev.vars`, and deployed ones with
  `pnpm exec wrangler secret put <NAME> --env <env>`.
- **The `Env` type** is `worker/worker-configuration.d.ts`, generated from `wrangler.jsonc`
  by `make -C .devtools types` and ignored by git. `typecheck` runs it first.
- **Worker tests** sit beside the code as `worker/**/*.test.ts`. They call
  `app.request(path, init, env)` with `env` from `getPlatformProxy()`, and run in Node, not
  workerd. Code that imports a `cloudflare:*` module is tested through its binding.
- **One schema per concept** holds across the boundary: a route validates its input with
  the feature's schema from `src/features/<name>/schema.ts`, or from a workspace's shared
  package.
<!-- <<< template:cloudflare -->

## Admin UI/UX (this project's own rules)

These sit outside the template's managed blocks, so they are this repo's to edit. They apply to
every change under `apps/admin/src`.

### Before building any UI

- **Start the shadcn MCP first.** `.mcp.json` registers it (`pnpm --filter backstage-admin exec
shadcn mcp`). At the start of any UI/UX task, check that its tools are loaded; if they are
  not, say so and fall back to the CLI from `apps/admin`: `pnpm exec shadcn search @coss -q
<term>`, `pnpm exec shadcn view @coss/<name>` and `pnpm exec shadcn add @coss/<name>`. Never
  skip the registry search because the tools are missing.
- **Search the `@coss` registry before writing a component.** Look for the component and for a
  matching block (`p-<name>-N`) as a pattern. Hand-build only what the registry has no answer
  for, and say what you searched.
- **Never hand-edit `src/components/ui/**`.** Add or regenerate it with `shadcn add`.
- **Do not change the stack silently.** TanStack Form, Query, Router, zod, i18next and coss/Base
  UI are the stack. A new dependency, or a deviation from anything the owner decided, is asked
  about first, with the trade-off in a sentence or two.

### Patterns that are decided

- **Locales are never stacked.** A field that exists per locale is edited one locale at a time
  behind tabs or the locale switcher, with a marker on a locale that is missing or invalid
  (LOC-2). Never repeat a full set of inputs per locale in one view.
- **Typed forms.** Values are typed from the zod schema in `@studiobimo/backstage`; no
  `unknown`-typed form values or untyped getters and setters.
- **Reordering** uses dnd-kit with drag handles, keyboard sorting, announcements and touch.
- **Use the real components:** `field`, `fieldset`, `input-group`, `number-field`, `select`,
  `switch`, `tabs`, `alert-dialog`, `empty`, `tooltip`, `collapsible` and the rest of `@coss`,
  never a raw `<input>`, `<select>` or hand-rolled dialog. A confirmation that destroys data is
  an `alert-dialog`.
- **Derive what can be derived,** such as a slug from a title, and let the editor override it.
- **No boxed-in-boxed layouts.** Group with spacing, headings and separators, not nested
  borders.

### Done means looked at

- Open the change in the browser at 360 px and at desktop width, in light and dark, and report
  what you saw. Exercise the real flow (create, error, save), not only the happy path.
- Every action works from the keyboard, with a label for a screen reader (PAG-6).
- Strings come from `en` and `es` catalogs with identical keys; no inline text.
- Say what you tested and what you did not.

### Working notes

- The preview tool may fail to start `make` with a `getcwd` error. Start the dev server from the
  repo root with `make -C .devtools dev` and use the port it prints.
- Local admin needs `apps/admin/.dev.vars` with `DEV_AUTH=true` and the migration applied
  (`pnpm exec wrangler d1 migrations apply DB --local`, from `apps/admin`). The file is
  gitignored. Tests that expect a refused request clear `DEV_AUTH` themselves.
- Keep scope to the issue. Features the PRD lists as separate stories (for example SEO fields,
  PAG-3) get their own issue and PR.
