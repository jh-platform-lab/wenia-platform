#!/usr/bin/env bash
# Despliega el servicio en un cluster Kind local y lo prueba con curl.
# Requiere docker, kind y kubectl. No toca ningun otro cluster: todos los comandos de
# kubectl usan --context explicito (kind-${CLUSTER}), nunca el contexto activo.
#
# Uso:  bash scripts/kind-deploy.sh            despliega y prueba
#       bash scripts/kind-deploy.sh --delete   borra el cluster local
set -euo pipefail

NAME="onboarding-api"
CLUSTER="${KIND_CLUSTER:-local-dev}"
CTX="kind-${CLUSTER}"
PORT="${LOCAL_PORT:-8080}"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ "${1:-}" = "--delete" ]; then
  kind delete cluster --name "$CLUSTER"
  exit 0
fi

if ! kind get clusters | grep -qx "$CLUSTER"; then
  kind create cluster --name "$CLUSTER"
fi

docker build -t "${NAME}:local" .
kind load docker-image "${NAME}:local" --name "$CLUSTER"

kubectl --context "$CTX" apply -f k8s/
# Fuerza el reinicio para tomar la imagen recien cargada (misma etiqueta :local).
kubectl --context "$CTX" rollout restart deployment/"$NAME"
kubectl --context "$CTX" rollout status deployment/"$NAME" --timeout=120s

kubectl --context "$CTX" port-forward service/"$NAME" "${PORT}:80" >/dev/null 2>&1 &
pf=$!
trap 'kill $pf 2>/dev/null || true' EXIT
sleep 3

echo "--- GET /health"
curl -fsS "http://127.0.0.1:${PORT}/health"
echo
echo "--- OK: ${NAME} responde dentro de Kind (contexto ${CTX})"
