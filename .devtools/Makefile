# The apps the shared targets build, check and deploy, one after the other. apps/site joins
# the list when its worker lands; until then it has nothing to build.
APPS := apps/admin

include base.mk
include vite.mk

# Nothing imports these yet, so tsc would not reach them through the admin app.
TSC_PROJECTS += ../../apps/site ../../packages/backstage
