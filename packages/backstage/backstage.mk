BACKSTAGE_ADMIN_DIR ?= apps/admin
BACKSTAGE_D1_BINDING ?= DB
BACKSTAGE_LOCAL_STATE ?= .dev-state

.PHONY: migrate
migrate: ## Apply the Backstage package's D1 migrations (REMOTE=1 for the deployed database, ENV=<env> for an environment)
	cd $(ROOT)/$(BACKSTAGE_ADMIN_DIR) && $(MISE) exec -- pnpm exec wrangler d1 migrations apply $(BACKSTAGE_D1_BINDING) $(if $(REMOTE),--remote,--local --persist-to $(ROOT)/$(BACKSTAGE_LOCAL_STATE)) $(if $(ENV),--env $(ENV))
