SCHEMA := schema/feature_flags.schema.json
NODE_MIN := 18
NPX_ENV  := npm_config_loglevel=error npm_config_update_notifier=false
AJV    := $(NPX_ENV) npx --yes -p ajv-cli@5.0.0 -p ajv-formats@3.0.1 ajv
FILE   ?= features/*/feature_flags.*.json

ifdef APP
FILE := features/$(APP)/feature_flags.*.json
endif

.PHONY: help validate check-names doctor
.DEFAULT_GOAL := help

help: ## List available commands
	@echo "Usage: make <command> [APP=<app>] [FILE=<path>]"; echo
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

validate: check-names ## Validate all flag files (APP=<app> for one app, FILE=<path> for one file)
	@$(AJV) validate --spec=draft2020 -c ajv-formats -s $(SCHEMA) -d "$(FILE)"

check-names: ## Check that files under features/ are named <app>/feature_flags.<dev|prod>.json
	@bad=$$(find features -type f | grep -Ev '^features/[a-z0-9_-]+/feature_flags\.(dev|prod)\.json$$'); \
	if [ -n "$$bad" ]; then echo "Unexpected files:"; echo "$$bad"; exit 1; fi

doctor: ## Check that the tools needed by validate are installed
	@fail=0; \
	for t in node npx find grep; do \
		if command -v $$t >/dev/null 2>&1; then echo "ok    $$t"; \
		else echo "MISS  $$t"; fail=1; fi; \
	done; \
	if command -v node >/dev/null 2>&1; then \
		v=$$(node -p 'process.versions.node.split(".")[0]'); \
		if [ "$$v" -ge $(NODE_MIN) ]; then echo "ok    node $$v (>= $(NODE_MIN))"; \
		else echo "FAIL  node $$v (need >= $(NODE_MIN))"; fail=1; fi; \
	fi; \
	if [ $$fail -eq 0 ]; then \
		if $(AJV) help >/dev/null 2>&1; then echo "ok    ajv-cli + ajv-formats (via npx)"; \
		else echo "FAIL  could not run ajv via npx (offline or npm registry blocked?)"; fail=1; fi; \
	fi; \
	if [ $$fail -eq 0 ]; then echo "All good."; else echo "Fix the above, then re-run make doctor."; exit 1; fi
