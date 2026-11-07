# The apps the shared targets build, check and deploy, one after the other. apps/site joins
# the list when its worker lands; until then it has nothing to build.
APPS := apps/admin

# ADR-0008: this repository has no development environment and no develop branch. It deploys
# nothing itself, and a consumer does its own deploys.
DEPLOY_ENVS := production

include base.mk
include vite.mk
