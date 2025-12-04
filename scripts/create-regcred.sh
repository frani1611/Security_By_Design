#!/usr/bin/env bash
set -euo pipefail

usage(){
  cat <<EOF
Usage: $0 <namespace> <docker-username> <docker-password> [email]
Example: $0 default myuser mytoken me@example.com
This will create (or update) a docker-registry secret named 'regcred' in the given namespace.
EOF
}

if [ "$#" -lt 3 ]; then
  usage
  exit 1
fi

NAMESPACE="$1"
DOCKER_USERNAME="$2"
DOCKER_PASSWORD="$3"
DOCKER_EMAIL="${4:-example@example.com}"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username="$DOCKER_USERNAME" \
  --docker-password="$DOCKER_PASSWORD" \
  --docker-email="$DOCKER_EMAIL" \
  -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Created/updated secret 'regcred' in namespace '$NAMESPACE'"
