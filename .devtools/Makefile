# The apps the shared targets build, check and deploy, one after the other.
APPS := apps/admin apps/site

# ADR-0008: this repository has no development environment and no develop branch. It deploys
# nothing itself, and a consumer does its own deploys.
DEPLOY_ENVS := production

include base.mk
include vite.mk
include ../packages/backstage/backstage.mk

BUNDLE_TOTAL_KIB@apps/admin := 660

# The site has no client bundle, so its budget is the Worker's. It is one file, so the chunk limit
# is the file's size. Gzipped it is React (68 KiB) and zod (about 50 KiB, it validates each snapshot
# and block), measured at 158 KiB when published pages were first rendered. See
# docs/research/react-server-rendering.md; #9 can move it. coss's Button adds about 16 KiB
# (Base UI's render hooks, class-variance-authority, the Spinner icon and the stylesheet).
BUNDLE_DIR@apps/site := dist/backstage_site
BUNDLE_CHUNK_KIB@apps/site := 950
BUNDLE_TOTAL_KIB@apps/site := 210

.PHONY: dev
dev: ## Apply local D1 migrations, then run the admin (5173) and site (5174) dev servers; stops if a port is busy
	$(MISE) exec -- bash $(ROOT)/.devtools/scripts/dev.sh

.PHONY: e2e
e2e: build ## Playwright: the publish loop through both Workers, and an axe scan of the page editor
	cd $(ROOT) && $(MISE) exec -- pnpm exec playwright test -c e2e/playwright.config.ts

SEED_SCRIPT := $(ROOT)/.devtools/scripts/seed.mjs

.PHONY: seed
seed: ## Fill the running local admin with sample posts and pages through its API (needs make dev)
	cd $(ROOT) && $(MISE) exec -- node $(SEED_SCRIPT) seed

.PHONY: unseed
unseed: ## Remove the sample posts and pages that seed created (needs make dev)
	cd $(ROOT) && $(MISE) exec -- node $(SEED_SCRIPT) unseed

PACK_CHECK_SCRIPT := $(ROOT)/.devtools/scripts/pack-check.mjs

.PHONY: pack-check
pack-check: ## Pack packages/backstage, install the tarball in a throwaway project, type-check and import every published entry point
	cd $(ROOT) && $(MISE) exec -- node $(PACK_CHECK_SCRIPT)

FULL_CI_TARGETS += pack-check
