#!/usr/bin/env bash
# Construye la imagen de Backstage igual que el CI (image.yml): compila en el host y la
# empaqueta con packages/backend/Dockerfile. Requiere Node 24 (ver .nvmrc).
# Uso: bash scripts/build-backstage-image.sh [etiqueta]   (por defecto wenia/backstage:local)
set -euo pipefail

tag="${1:-wenia/backstage:local}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

root_node() { node -p 'process.versions.node.split(".")[0]'; }

if [ "$(root_node)" != "24" ]; then
  # .nvmrc no cambia la version solo: se intenta activar con nvm antes de rendirse.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    nvm use --silent "$(tr -d 'v \n' <"$root/.nvmrc")" >/dev/null 2>&1 || true
    set -u
  fi
fi
if [ "$(root_node)" != "24" ]; then
  echo "Se necesita Node 24 (hay $(node -v)). Instala y activa con: nvm install && nvm use" >&2
  exit 1
fi

cd "$root/backstage"
yarn install --immutable
yarn tsc
yarn build:backend
docker build -f packages/backend/Dockerfile -t "$tag" .
echo "Imagen lista: $tag"
