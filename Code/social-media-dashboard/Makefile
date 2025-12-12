################################################################################
# Minimal Makefile focused on k3d local deployment (GHCR -> k3d -> kubernetes)
# Kept targets: pulling GHCR images, ensuring k3d cluster, importing images,
# creating secrets, applying k8s manifests, setting images and waiting for rollout.
################################################################################

DOCKER ?= docker
K3D ?= k3d
KUBECTL ?= kubectl

NAMESPACE ?= social-media-dashboard
K3D_CLUSTER ?= social-cluster
ENV_FILE ?= backend/.env

# Read GHCR credentials from the ENV file by default so users don't need to
# export them into their shell. These can still be overridden by passing
# GHCR_USER/GHCR_TOKEN/GHCR_EMAIL on the `make` command line or environment.
GHCR_USER ?= $(shell grep -m1 '^GHCR_USER=' $(ENV_FILE) || true | cut -d'=' -f2-)
GHCR_TOKEN ?= $(shell grep -m1 '^GHCR_TOKEN=' $(ENV_FILE) || true | cut -d'=' -f2-)
GHCR_EMAIL ?= $(shell grep -m1 '^GHCR_EMAIL=' $(ENV_FILE) || true | cut -d'=' -f2-)
# GHCR image owner/tag (required for pull step)
OWNER ?=
TAG ?= latest
IMG_BACKEND_GHCR ?= ghcr.io/$(OWNER)/social-media-dashboard:$(TAG)
IMG_FRONTEND_GHCR ?= ghcr.io/$(OWNER)/social-media-dashboard-frontend:$(TAG)

.PHONY: help pull-ghcr cluster-k3d start-k3d certmanager-k3d k8s-create-secrets k8s-create-regcred \
	k8s-deploy k8s-set-images load-k3d deploy-k3d wait-k3d k3d-up clean status logs

help:
	@echo "Makefile (k3d-focused) – available targets:"
	@echo "  make k3d-up OWNER=<ghcr-owner> TAG=<tag>    # full flow: pull, cluster, import, deploy, wait"
	@echo "  make pull-ghcr OWNER=<ghcr-owner> TAG=<tag> # pull GHCR images locally"
	@echo "  make cluster-k3d                          # ensure k3d cluster and namespace exist"
	@echo "  make start-k3d                            # create k3d cluster (if missing)"
	@echo "  make load-k3d                             # import images into k3d"
	@echo "  make deploy-k3d                           # apply k8s manifests and set images"
	@echo "  make k8s-create-secrets                   # create secrets from $(ENV_FILE)"

	@echo "  make clean                                # delete k3d cluster $(K3D_CLUSTER)"
	@echo

# Pull images from GHCR into local docker (non-fatal if missing)
pull-ghcr:
	@if [ -z "$(OWNER)" ]; then \
		echo "Error: OWNER not set. Usage: make pull-ghcr OWNER=<ghcr-owner> TAG=<tag>" >&2; exit 1; \
	fi
	@echo "[k3d] Pulling: $(IMG_BACKEND_GHCR) and $(IMG_FRONTEND_GHCR)"
	@$(DOCKER) pull $(IMG_BACKEND_GHCR) || true
	@$(DOCKER) pull $(IMG_FRONTEND_GHCR) || true

# Ensure k3d cluster exists and namespace created
cluster-k3d:
	@command -v $(K3D) >/dev/null 2>&1 || (echo "Error: k3d not installed. Install from https://k3d.io" >&2; exit 1)
	@if ! $(K3D) cluster list | grep -q "^$(K3D_CLUSTER)\b"; then \
		$(K3D) cluster create $(K3D_CLUSTER) --port "80:80@loadbalancer" --port "443:443@loadbalancer" --wait; \
	else \
		echo "k3d cluster '$(K3D_CLUSTER)' already exists"; \
	fi
	@$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

# Create k3d cluster (alias)
start-k3d: cluster-k3d

# Optional: install cert-manager to support TLS if manifests rely on it
certmanager-k3d:
	@echo "[k3d] Installing cert-manager (best-effort)"
	@$(KUBECTL) apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml || true
	@$(KUBECTL) wait --namespace cert-manager --for=condition=available deployment/cert-manager --timeout=180s || true

# Create Kubernetes secrets from a local .env file. The secret will be named 'social-media-dashboard-secrets'
k8s-create-secrets:
	@echo "[k3d] Creating Kubernetes secrets in namespace '$(NAMESPACE)' from $(ENV_FILE)"
	@test -f $(ENV_FILE) || (echo "Error: ENV file '$(ENV_FILE)' not found" >&2; exit 1)
	@$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

	# cloudinary
	@CLOUD_NAME=$$(grep -m1 '^CLOUDINARY_CLOUD_NAME=' $(ENV_FILE) | cut -d'=' -f2-); \
	CLOUD_KEY=$$(grep -m1 '^CLOUDINARY_API_KEY=' $(ENV_FILE) | cut -d'=' -f2-); \
	CLOUD_SECRET=$$(grep -m1 '^CLOUDINARY_API_SECRET=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$CLOUD_NAME" ] || [ -n "$$CLOUD_KEY" ] || [ -n "$$CLOUD_SECRET" ]; then \
		$(KUBECTL) create secret generic cloudinary-secret -n $(NAMESPACE) --from-literal=CLOUDINARY_CLOUD_NAME="$$CLOUD_NAME" --from-literal=CLOUDINARY_API_KEY="$$CLOUD_KEY" --from-literal=CLOUDINARY_API_SECRET="$$CLOUD_SECRET" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	fi

	# jwt
	@JWT_VAL=$$(grep -m1 '^JWT_SECRET=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$JWT_VAL" ]; then \
		$(KUBECTL) create secret generic jwt-secret -n $(NAMESPACE) --from-literal=secret="$$JWT_VAL" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	fi

	# mongodb: always use the local in-cluster MongoDB URI for development
	@DB_USER=$$(grep -m1 '^DB_ADMIN=' $(ENV_FILE) | cut -d'=' -f2-); \
	DB_PASS=$$(grep -m1 '^DB_PASSWORD=' $(ENV_FILE) | cut -d'=' -f2-); \
	DB_NAME_VAL=$$(grep -m1 '^DB_NAME=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -z "$$DB_NAME_VAL" ]; then DB_NAME_VAL="Security_By_Design"; fi; \
	if [ -n "$$DB_USER" ] && [ -n "$$DB_PASS" ]; then \
		URI_VAL="mongodb://$$DB_USER:$$DB_PASS@mongodb:27017/$$DB_NAME_VAL?authSource=admin"; \
		echo "[k3d] Creating mongodb-secret using local mongodb service"; \
		$(KUBECTL) create secret generic mongodb-secret -n $(NAMESPACE) --from-literal=DB_ADMIN="$$DB_USER" --from-literal=DB_PASSWORD="$$DB_PASS" --from-literal=username="$$DB_USER" --from-literal=password="$$DB_PASS" --from-literal=uri="$$URI_VAL" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	fi

	# google oauth
	@GOOGLE_CLIENT_ID=$$(grep -m1 '^GOOGLE_CLIENT_ID=' $(ENV_FILE) | cut -d'=' -f2-); \
	GOOGLE_CLIENT_SECRET=$$(grep -m1 '^GOOGLE_CLIENT_SECRET=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$GOOGLE_CLIENT_ID" ] && [ -n "$$GOOGLE_CLIENT_SECRET" ]; then \
		echo "[k3d] Creating google-oauth-secret"; \
		$(KUBECTL) create secret generic google-oauth-secret -n $(NAMESPACE) --from-literal=GOOGLE_CLIENT_ID="$$GOOGLE_CLIENT_ID" --from-literal=GOOGLE_CLIENT_SECRET="$$GOOGLE_CLIENT_SECRET" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	fi

	# Ensure Docker registry secret 'regcred' is created (if GHCR credentials present)
	@echo "[k3d] Ensuring Docker registry secret 'regcred' (if GHCR credentials present)"
	@$(MAKE) k8s-create-regcred || true

# Atlas SRV support removed — Makefile always creates a local in-cluster MongoDB secret for development

# Create Docker registry secret for GHCR if credentials present in $(ENV_FILE)
.PHONY: k8s-create-regcred
k8s-create-regcred:
	@GHCR_USER_VAL=$$(grep -m1 '^GHCR_USER=' $(ENV_FILE) | cut -d'=' -f2-); \
	GHCR_TOKEN_VAL=$$(grep -m1 '^GHCR_TOKEN=' $(ENV_FILE) | cut -d'=' -f2-); \
	GHCR_EMAIL_VAL=$$(grep -m1 '^GHCR_EMAIL=' $(ENV_FILE) | cut -d'=' -f2-); \
	if [ -n "$$GHCR_USER_VAL" ] && [ -n "$$GHCR_TOKEN_VAL" ]; then \
		echo "[k3d] Creating/updating Docker registry secret 'regcred' in namespace $(NAMESPACE)"; \
		$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
		$(KUBECTL) create secret docker-registry regcred -n $(NAMESPACE) --docker-server=ghcr.io --docker-username="$$GHCR_USER_VAL" --docker-password="$$GHCR_TOKEN_VAL" --docker-email="$$GHCR_EMAIL_VAL" --dry-run=client -o yaml | $(KUBECTL) apply -f -; \
	else \
		echo "[k3d] GHCR credentials not provided in $(ENV_FILE) (GHCR_USER/GHCR_TOKEN) — skipping regcred creation"; \
	fi

# Ensure regcred is created (if credentials available) when creating all secrets


# Apply manifests from k8s/ into the namespace
k8s-deploy:
	@echo "[k3d] Applying k8s manifests to namespace $(NAMESPACE)"
	@$(KUBECTL) apply -n $(NAMESPACE) -f k8s/

# Set images on deployments; reads image-*.txt if present
k8s-set-images:
	@IMG_BACKEND=""; if [ -f image-backend.txt ]; then IMG_BACKEND=$$(cat image-backend.txt); fi; \
	IMG_FRONTEND=""; if [ -f image-frontend.txt ]; then IMG_FRONTEND=$$(cat image-frontend.txt); fi; \
	if [ -z "$$IMG_BACKEND" ] || [ -z "$$IMG_FRONTEND" ]; then \
		echo "Error: image-backend.txt or image-frontend.txt missing or empty" >&2; exit 1; \
	fi; \
	$(KUBECTL) set image -n $(NAMESPACE) deployment/backend backend=$$IMG_BACKEND --record || true; \
	$(KUBECTL) set image -n $(NAMESPACE) deployment/frontend frontend=$$IMG_FRONTEND --record || true

# Import images into k3d so cluster can pull them
load-k3d:
	@echo "[k3d] Importing images into cluster $(K3D_CLUSTER)"
	@IMG_BACKEND="$(IMG_BACKEND_GHCR)"; IMG_FRONTEND="$(IMG_FRONTEND_GHCR)"; \
	for img in $$IMG_BACKEND $$IMG_FRONTEND; do \
		if [ -n "$$img" ]; then \
			$(K3D) image import $$img -c $(K3D_CLUSTER) || true; \
		fi; \
	done

# Apply manifests and set images to GHCR values
deploy-k3d:
	@echo "[k3d] Writing GHCR image refs to image-*.txt"
	@echo $(IMG_BACKEND_GHCR) > image-backend.txt || true
	@echo $(IMG_FRONTEND_GHCR) > image-frontend.txt || true
	@echo "[k3d] Replacing IMAGE_PLACEHOLDER values in k8s manifests (frontend first)"
	@sed -i "s#IMAGE_PLACEHOLDER_FRONTEND#$(IMG_FRONTEND_GHCR)#g" k8s/*.yaml || true
	@sed -i "s#IMAGE_PLACEHOLDER#$(IMG_BACKEND_GHCR)#g" k8s/*.yaml || true
	@$(MAKE) k8s-deploy || true
	@$(MAKE) k8s-set-images || true

# Wait for rollouts
wait-k3d:
	@kubectl rollout status deployment/backend -n $(NAMESPACE) --timeout=300s || true
	@kubectl rollout status deployment/frontend -n $(NAMESPACE) --timeout=300s || true

# Full flow: pull GHCR, ensure cluster, optional cert-manager, create secrets, import images, deploy and wait
k3d-up: pull-ghcr cluster-k3d certmanager-k3d k8s-create-secrets load-k3d deploy-k3d wait-k3d
	@echo "[k3d] k3d-up finished — check services/ingress and pod status"

# Delete k3d cluster
clean:
	@echo "[k3d] Deleting k3d cluster $(K3D_CLUSTER)"
	-@$(K3D) cluster delete $(K3D_CLUSTER) || true

# Convenience: show basic status and logs
status:
	@echo "Pods:"; $(KUBECTL) get pods -n $(NAMESPACE) || true
	@echo "Services:"; $(KUBECTL) get svc -n $(NAMESPACE) || true

logs:
	@kubectl logs -n $(NAMESPACE) -l app=social-media-dashboard --tail=100 -f || true


compose:
	@echo "Starting docker-compose (local dev)"
	docker-compose -f docker-compose.yml up --build

local-run: compose

# Convenience target to quickly run everything locally (without pushing to registry)
# Builds images and applies manifests but does NOT push images. Useful for local clusters
# where local docker daemon is shared with the cluster (e.g., kind with --image-repository mirrors)
local-deploy: build k8s-create-namespace k8s-create-secrets k8s-deploy k8s-set-images
