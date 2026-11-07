# The apps the shared targets build, check and deploy, one after the other. apps/site joins
# the list when its worker lands; until then it has nothing to build.
APPS := apps/admin

include base.mk
include vite.mk

# Nothing imports these yet, so tsc would not reach them through the admin app.
TSC_PROJECTS += ../../apps/site ../../packages/backstage

# This project has no develop branch: pull requests and development deploys both use main, and
# production still ships from a release. deploy.yml's push trigger names develop, so it stays
# idle; run it from Actions on main instead.
DEPLOY_BRANCH_development := main
