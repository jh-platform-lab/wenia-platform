#!/usr/bin/env bash
# Construye la imagen de Backstage igual que el CI (image.yml): compila en el host y la
# empaqueta con packages/backend/Dockerfile. Requiere Node 24 (ver .nvmrc).
# Uso: bash scripts/build-backstage-image.sh [etiqueta]   (por defecto wenia/backstage:local)
set -euo pipefail

tag="${1:-wenia/backstage:local}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" != "24" ]; then
  echo "Se necesita Node 24 (hay $(node -v)). Usa: nvm use" >&2
  exit 1
fi

cd "$root/backstage"
yarn install --immutable
yarn tsc
yarn build:backend
docker build -f packages/backend/Dockerfile -t "$tag" .
echo "Imagen lista: $tag"
