# The apps the shared targets build, check and deploy, one after the other.
APPS := apps/admin apps/site

# ADR-0008: this repository has no development environment and no develop branch. It deploys
# nothing itself, and a consumer does its own deploys.
DEPLOY_ENVS := production

include base.mk
include vite.mk

# The site has no client bundle, so its budget is the Worker's: 150 KiB gzipped, about twice
# the measured React renderer (docs/research/react-server-rendering.md). #9 can move it.
BUNDLE_DIR@apps/site := dist/backstage_site
BUNDLE_TOTAL_KIB@apps/site := 150
