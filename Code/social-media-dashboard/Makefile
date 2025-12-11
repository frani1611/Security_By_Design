# Makefile to build images and deploy the social-media-dashboard to Kubernetes
# Usage: make help

REGISTRY ?= myregistry.local:5000
TAG ?= latest
BACKEND_IMAGE ?= $(REGISTRY)/social-backend:$(TAG)
FRONTEND_IMAGE ?= $(REGISTRY)/social-frontend:$(TAG)
NAMESPACE ?= social-media-dashboard
SECRET_NAME ?= social-media-dashboard-secrets
DOCKER ?= docker
KUBECTL ?= kubectl
ENV_FILE ?= backend/.env

.PHONY: help build backend frontend push deploy k8s-deploy k8s-delete \
	compose certs k8s-create-namespace k8s-set-images local-run

help:
	@echo "Makefile targets (run from repository folder 'Code/social-media-dashboard')"
	@echo
	@echo "  build           - build both backend and frontend Docker images"
	@echo "  backend         - build backend image ($(BACKEND_IMAGE))"
	@echo "  frontend        - build frontend image ($(FRONTEND_IMAGE))"
	@echo "  push            - push both images to $(REGISTRY)"
	@echo "  certs           - generate TLS certs (runs backend/generate-certs.js)"
	@echo "  secrets         - create Kubernetes secrets from .env (uses $(SECRET_NAME))"
	@echo "  k8s-create-namespace - ensure Kubernetes namespace exists"
	@echo "  k8s-deploy       - apply all manifests from k8s/ into namespace"
	@echo "  k8s-set-images   - set images on deployments to built image tags (reads image-*.txt if present)"
	@echo "  deploy           - build, push, create namespace and deploy to Kubernetes"
	@echo "  deploy-local     - apply manifests and set images using image-*.txt or env (for local clusters)"
	@echo "  k8s-delete       - delete k8s resources for this project (namespace & manifests)"
	@echo "  compose          - run docker-compose locally (useful for dev)"
	@echo "  local-run        - alias for compose"
	@echo
	@echo "Variables you can override: REGISTRY, TAG, NAMESPACE, DOCKER, KUBECTL, ENV_FILE, SECRET_NAME"

build: backend frontend

backend:
	@echo "Building backend image: $(BACKEND_IMAGE)"
	$(DOCKER) build -t $(BACKEND_IMAGE) -f backend/Dockerfile backend

frontend:
	@echo "Building frontend image: $(FRONTEND_IMAGE)"
	$(DOCKER) build -t $(FRONTEND_IMAGE) -f frontend/Dockerfile frontend

push:
	@echo "Pushing images to $(REGISTRY)"
	$(DOCKER) push $(BACKEND_IMAGE)
	$(DOCKER) push $(FRONTEND_IMAGE)

certs:
	@echo "Generating TLS certs using backend/generate-certs.js"
	node backend/generate-certs.js

secrets: k8s-create-secrets

# Create Kubernetes secrets from a local .env file. The secret will be named $(SECRET_NAME)
# Expects a `.env` file in the repository root with KEY=VALUE lines.

k8s-create-secrets:
	@echo "Creating Kubernetes secrets in namespace '$(NAMESPACE)' from $(ENV_FILE)"
	@test -f $(ENV_FILE) || (echo "Error: ENV file '$(ENV_FILE)' not found" >&2; exit 1)
	@$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

	# read values from ENV_FILE (robust to = in values with cut -d'=' -f2-)
	@CLOUD_NAME=$$(grep -m1 '^CLOUDINARY_CLOUD_NAME=' $(ENV_FILE) | cut -d'=' -f2-); \
	CLOUD_KEY=$$(grep -m1 '^CLOUDINARY_API_KEY=' $(ENV_FILE) | cut -d'=' -f2-); \
	CLOUD_SECRET=$$(grep -m1 '^CLOUDINARY_API_SECRET=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$CLOUD_NAME" ] || [ -n "$$CLOUD_KEY" ] || [ -n "$$CLOUD_SECRET" ]; then \
		echo "- creating/updating cloudinary-secret"; \
		$(KUBECTL) create secret generic cloudinary-secret -n $(NAMESPACE) --from-literal=CLOUDINARY_CLOUD_NAME="$$CLOUD_NAME" --from-literal=CLOUDINARY_API_KEY="$$CLOUD_KEY" --from-literal=CLOUDINARY_API_SECRET="$$CLOUD_SECRET" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	else \
		echo "- skipping cloudinary-secret (no CLOUDINARY_* values found in $(ENV_FILE))"; \
	fi

	@JWT_VAL=$$(grep -m1 '^JWT_SECRET=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$JWT_VAL" ]; then \
		echo "- creating/updating jwt-secret"; \
		$(KUBECTL) create secret generic jwt-secret -n $(NAMESPACE) --from-literal=secret="$$JWT_VAL" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	else \
		echo "- skipping jwt-secret (no JWT_SECRET in $(ENV_FILE))"; \
	fi

	@DB_USER=$$(grep -m1 '^DB_ADMIN=' $(ENV_FILE) | cut -d'=' -f2-); \
	DB_PASS=$$(grep -m1 '^DB_PASSWORD=' $(ENV_FILE) | cut -d'=' -f2-); \
	DB_NAME_VAL=$$(grep -m1 '^DB_NAME=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$DB_USER" ] && [ -n "$$DB_PASS" ]; then \
		URI_VAL="mongodb://$$DB_USER:$$DB_PASS@mongodb:27017/$$DB_NAME_VAL"; \
		echo "- creating/updating mongodb-secret"; \
		$(KUBECTL) create secret generic mongodb-secret -n $(NAMESPACE) --from-literal=username="$$DB_USER" --from-literal=password="$$DB_PASS" --from-literal=uri="$$URI_VAL" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	else \
		echo "- skipping mongodb-secret (DB_ADMIN/DB_PASSWORD missing in $(ENV_FILE))"; \
	fi

	# optional regcred for private registry pulls
	@if [ -n "$(REGISTRY_USER)" ] && [ -n "$(REGISTRY_PASSWORD)" ]; then \
		echo "- creating/updating regcred for registry $(REGISTRY)"; \
		$(KUBECTL) create secret docker-registry regcred -n $(NAMESPACE) --docker-server="$(REGISTRY)" --docker-username="$(REGISTRY_USER)" --docker-password="$(REGISTRY_PASSWORD)" --docker-email="$(REGISTRY_EMAIL)" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	else \
		echo "- skipping regcred (set REGISTRY_USER and REGISTRY_PASSWORD to create it)"; \
	fi

k8s-create-namespace:
	@echo "Ensuring namespace '$(NAMESPACE)' exists"
	$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

k8s-deploy:
	@echo "Applying manifests from k8s/ to namespace $(NAMESPACE)"
	$(KUBECTL) apply -n $(NAMESPACE) -f k8s/

# After applying manifests, ensure deployments use the correct images produced by this Makefile
k8s-set-images:
	@echo "Setting images on deployments (backend & frontend) in namespace $(NAMESPACE)"
	# These commands assume deployments are named 'backend' and 'frontend' and container names match.
	# If your deployment or container names differ, adjust these commands or set explicit names here.
	@IMG_BACKEND="$(BACKEND_IMAGE)"; \
	if [ -f image-backend.txt ]; then \
		IMG_BACKEND=$$(cat image-backend.txt); \
	fi; \
	IMG_FRONTEND="$(FRONTEND_IMAGE)"; \
	if [ -f image-frontend.txt ]; then \
		IMG_FRONTEND=$$(cat image-frontend.txt); \
	fi; \
	if [ -z "$$IMG_BACKEND" ] || [ -z "$$IMG_FRONTEND" ]; then \
		echo "Error: image variables are empty. Set BACKEND_IMAGE/FRONTEND_IMAGE or provide image-backend.txt / image-frontend.txt" >&2; exit 1; \
	fi; \
	echo "Setting backend image to: $$IMG_BACKEND"; \
	echo "Setting frontend image to: $$IMG_FRONTEND"; \
	$(KUBECTL) set image -n $(NAMESPACE) deployment/backend backend=$$IMG_BACKEND --record || true; \
	$(KUBECTL) set image -n $(NAMESPACE) deployment/frontend frontend=$$IMG_FRONTEND --record || true

deploy: build push k8s-create-namespace k8s-create-secrets k8s-deploy k8s-set-images

deploy-local: k8s-create-namespace k8s-create-secrets k8s-deploy k8s-set-images
	@echo "Deployed locally using images from image-*.txt or environment variables. Ensure the cluster can pull these images."

k8s-delete:
	@echo "Deleting manifests and namespace for $(NAMESPACE)"
	-$(KUBECTL) delete -n $(NAMESPACE) -f k8s/ --ignore-not-found
	-$(KUBECTL) delete namespace $(NAMESPACE) --ignore-not-found || true

compose:
	@echo "Starting docker-compose (local dev)"
	docker-compose -f docker-compose.yml up --build

local-run: compose

# Convenience target to quickly run everything locally (without pushing to registry)
# Builds images and applies manifests but does NOT push images. Useful for local clusters
# where local docker daemon is shared with the cluster (e.g., kind with --image-repository mirrors)
local-deploy: build k8s-create-namespace k8s-create-secrets k8s-deploy k8s-set-images
