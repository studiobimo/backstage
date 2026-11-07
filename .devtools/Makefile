# The app gen.mjs and the shared targets build. apps/site is a second app; its own targets come with it.
APP_DIR := apps/admin

include base.mk
include vite.mk

# Nothing imports these yet, so tsc would not reach them through the admin app.
TSC_PROJECTS += ../../apps/site ../../packages/backstage
