# The apps the shared targets build, check and deploy, one after the other.
APPS := apps/admin apps/site

# ADR-0008: this repository has no development environment and no develop branch. It deploys
# nothing itself, and a consumer does its own deploys.
DEPLOY_ENVS := production

include base.mk
include vite.mk

BUNDLE_TOTAL_KIB@apps/admin := 585

# The site has no client bundle, so its budget is the Worker's. It is one file, so the chunk limit
# is the file's size. Gzipped it is React (68 KiB) and zod (about 50 KiB, it validates each snapshot
# and block), measured at 158 KiB when published pages were first rendered. See
# docs/research/react-server-rendering.md; #9 can move it. coss's Button adds about 16 KiB
# (Base UI's render hooks, class-variance-authority, the Spinner icon and the stylesheet).
BUNDLE_DIR@apps/site := dist/backstage_site
BUNDLE_CHUNK_KIB@apps/site := 900
BUNDLE_TOTAL_KIB@apps/site := 185

.PHONY: e2e
e2e: build ## Playwright: the publish loop through both Workers, and an axe scan of the page editor
	pnpm exec playwright test -c e2e/playwright.config.ts
