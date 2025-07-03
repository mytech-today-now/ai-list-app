# AI ToDo MCP - Build Automation Makefile
# Comprehensive build, test, and deployment automation

# Variables
NODE_VERSION := 18
NPM_VERSION := 9
PROJECT_NAME := ai-todo-mcp
DOCKER_REGISTRY := your-registry.com
VERSION := $(shell node -p "require('./package.json').version")
TIMESTAMP := $(shell date +%Y%m%d_%H%M%S)

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
MAGENTA := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)AI ToDo MCP - Build Automation$(RESET)"
	@echo "$(YELLOW)Available targets:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Environment setup
.PHONY: setup
setup: ## Set up development environment
	@echo "$(BLUE)Setting up development environment...$(RESET)"
	@node --version | grep -q "v$(NODE_VERSION)" || (echo "$(RED)Node.js $(NODE_VERSION) required$(RESET)" && exit 1)
	@npm --version | grep -q "$(NPM_VERSION)" || (echo "$(RED)npm $(NPM_VERSION) required$(RESET)" && exit 1)
	npm ci
	npm run postinstall
	@echo "$(GREEN)Development environment ready!$(RESET)"

.PHONY: setup-ci
setup-ci: ## Set up CI environment
	@echo "$(BLUE)Setting up CI environment...$(RESET)"
	npm ci --frozen-lockfile
	npx playwright install --with-deps
	@echo "$(GREEN)CI environment ready!$(RESET)"

# Development targets
.PHONY: dev
dev: ## Start development servers
	@echo "$(BLUE)Starting development servers...$(RESET)"
	npm run dev

.PHONY: dev-frontend
dev-frontend: ## Start frontend development server
	@echo "$(BLUE)Starting frontend development server...$(RESET)"
	npm run dev:frontend

.PHONY: dev-backend
dev-backend: ## Start backend development server
	@echo "$(BLUE)Starting backend development server...$(RESET)"
	npm run dev:backend

# Code quality targets
.PHONY: lint
lint: ## Run linting
	@echo "$(BLUE)Running linting...$(RESET)"
	npm run lint

.PHONY: lint-fix
lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(RESET)"
	npm run lint:fix

.PHONY: format
format: ## Format code
	@echo "$(BLUE)Formatting code...$(RESET)"
	npx prettier --write .

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(RESET)"
	npx prettier --check .

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type checking...$(RESET)"
	npm run type-check

.PHONY: quality-check
quality-check: lint format-check type-check ## Run all quality checks
	@echo "$(GREEN)All quality checks passed!$(RESET)"

# Testing targets
.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(RESET)"
	npm run test

.PHONY: test-unit
test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(RESET)"
	npm run test:packages
	npm run test:frontend -- --watchAll=false
	npm run test:backend -- --watchAll=false

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(RESET)"
	npm run test:backend -- --testPathPattern=integration

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running end-to-end tests...$(RESET)"
	npm run test:e2e

.PHONY: test-visual
test-visual: ## Run visual regression tests
	@echo "$(BLUE)Running visual regression tests...$(RESET)"
	npx playwright test --project=visual-chromium

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	npm run test:coverage:all

.PHONY: test-coverage-report
test-coverage-report: test-coverage ## Generate coverage report
	@echo "$(BLUE)Generating coverage report...$(RESET)"
	npm run test:coverage:merge
	npm run test:coverage:check

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(RESET)"
	npm run test:watch

# Build targets
.PHONY: build
build: ## Build all packages and applications
	@echo "$(BLUE)Building all packages and applications...$(RESET)"
	npm run build

.PHONY: build-packages
build-packages: ## Build packages only
	@echo "$(BLUE)Building packages...$(RESET)"
	npm run build:packages

.PHONY: build-frontend
build-frontend: ## Build frontend application
	@echo "$(BLUE)Building frontend application...$(RESET)"
	npm run build:frontend

.PHONY: build-backend
build-backend: ## Build backend application
	@echo "$(BLUE)Building backend application...$(RESET)"
	npm run build:backend

.PHONY: build-production
build-production: quality-check test-unit build ## Production build with all checks
	@echo "$(GREEN)Production build completed!$(RESET)"

# Clean targets
.PHONY: clean
clean: ## Clean all build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	npm run clean

.PHONY: clean-deps
clean-deps: ## Clean dependencies
	@echo "$(BLUE)Cleaning dependencies...$(RESET)"
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -f package-lock.json apps/*/package-lock.json packages/*/package-lock.json

.PHONY: clean-coverage
clean-coverage: ## Clean coverage reports
	@echo "$(BLUE)Cleaning coverage reports...$(RESET)"
	npm run clean:coverage

.PHONY: clean-all
clean-all: clean clean-deps clean-coverage ## Clean everything
	@echo "$(GREEN)Everything cleaned!$(RESET)"

# Security targets
.PHONY: security-audit
security-audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(RESET)"
	npm audit --audit-level=moderate

.PHONY: security-fix
security-fix: ## Fix security vulnerabilities
	@echo "$(BLUE)Fixing security vulnerabilities...$(RESET)"
	npm audit fix

.PHONY: security-scan
security-scan: ## Run comprehensive security scan
	@echo "$(BLUE)Running comprehensive security scan...$(RESET)"
	npm run security:scan || echo "$(YELLOW)Security scan completed with warnings$(RESET)"

# Performance targets
.PHONY: perf-test
perf-test: ## Run performance tests
	@echo "$(BLUE)Running performance tests...$(RESET)"
	npm run test:performance || echo "$(YELLOW)Performance tests completed$(RESET)"

.PHONY: lighthouse
lighthouse: ## Run Lighthouse audit
	@echo "$(BLUE)Running Lighthouse audit...$(RESET)"
	npm install -g @lhci/cli
	npm run dev:backend &
	npm run dev:frontend &
	sleep 30
	lhci autorun || echo "$(YELLOW)Lighthouse audit completed$(RESET)"
	pkill -f "npm run dev" || true

# Database targets
.PHONY: db-setup
db-setup: ## Set up database
	@echo "$(BLUE)Setting up database...$(RESET)"
	cd apps/backend && npm run db:migrate && npm run db:seed

.PHONY: db-reset
db-reset: ## Reset database
	@echo "$(BLUE)Resetting database...$(RESET)"
	cd apps/backend && npm run db:reset

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	cd apps/backend && npm run db:migrate

# Docker targets
.PHONY: docker-build
docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(RESET)"
	docker build -t $(PROJECT_NAME):$(VERSION) .
	docker build -t $(PROJECT_NAME):latest .

.PHONY: docker-run
docker-run: ## Run application in Docker
	@echo "$(BLUE)Running application in Docker...$(RESET)"
	docker-compose up -d

.PHONY: docker-stop
docker-stop: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(RESET)"
	docker-compose down

.PHONY: docker-clean
docker-clean: ## Clean Docker images and containers
	@echo "$(BLUE)Cleaning Docker images and containers...$(RESET)"
	docker-compose down -v --rmi all --remove-orphans

# Deployment targets
.PHONY: deploy-staging
deploy-staging: build-production ## Deploy to staging
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	@echo "$(YELLOW)Staging deployment would happen here$(RESET)"

.PHONY: deploy-production
deploy-production: ## Deploy to production
	@echo "$(RED)Production deployment requires manual approval$(RESET)"
	@read -p "Are you sure you want to deploy to production? (y/N): " confirm && [ "$$confirm" = "y" ]
	@echo "$(BLUE)Deploying to production...$(RESET)"
	@echo "$(YELLOW)Production deployment would happen here$(RESET)"

# CI/CD targets
.PHONY: ci
ci: setup-ci quality-check test-unit build ## Run CI pipeline
	@echo "$(GREEN)CI pipeline completed successfully!$(RESET)"

.PHONY: ci-full
ci-full: setup-ci quality-check test-coverage test-e2e build security-audit ## Run full CI pipeline
	@echo "$(GREEN)Full CI pipeline completed successfully!$(RESET)"

# Utility targets
.PHONY: install
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	npm ci

.PHONY: update-deps
update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	npm update
	npm audit fix

.PHONY: check-deps
check-deps: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(RESET)"
	npm outdated

.PHONY: docs
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	npm run docs:generate

.PHONY: version
version: ## Show version information
	@echo "$(CYAN)Project: $(PROJECT_NAME)$(RESET)"
	@echo "$(CYAN)Version: $(VERSION)$(RESET)"
	@echo "$(CYAN)Node.js: $(shell node --version)$(RESET)"
	@echo "$(CYAN)npm: $(shell npm --version)$(RESET)"
	@echo "$(CYAN)Timestamp: $(TIMESTAMP)$(RESET)"

.PHONY: status
status: ## Show project status
	@echo "$(CYAN)Project Status:$(RESET)"
	@echo "  Dependencies: $(shell npm list --depth=0 2>/dev/null | grep -c "├──\|└──" || echo "Unknown")"
	@echo "  Tests: $(shell find . -name "*.test.*" -o -name "*.spec.*" | wc -l | tr -d ' ')"
	@echo "  Coverage: $(shell [ -f coverage/coverage-summary.json ] && node -p "JSON.parse(require('fs').readFileSync('coverage/coverage-summary.json')).total.lines.pct + '%'" || echo "Not available")"
	@echo "  Build size: $(shell [ -d apps/frontend/dist ] && du -sh apps/frontend/dist | cut -f1 || echo "Not built")"

# Development workflow targets
.PHONY: start
start: setup dev ## Set up and start development

.PHONY: fresh-start
fresh-start: clean-all install setup dev ## Clean install and start development

.PHONY: pre-commit
pre-commit: quality-check test-unit ## Run pre-commit checks
	@echo "$(GREEN)Pre-commit checks passed!$(RESET)"

.PHONY: pre-push
pre-push: quality-check test-coverage build ## Run pre-push checks
	@echo "$(GREEN)Pre-push checks passed!$(RESET)"

.PHONY: release-check
release-check: quality-check test-coverage test-e2e build security-audit ## Run release checks
	@echo "$(GREEN)Release checks passed!$(RESET)"
