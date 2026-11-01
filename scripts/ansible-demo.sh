#!/usr/bin/env bash
# Demuestra la idempotencia del playbook: lo corre dos veces sobre una copia limpia
# (como un clon recien hecho) dentro de un contenedor. No toca tu repositorio.
# Esperado: la primera ejecucion cambia cosas; la segunda termina con changed=0.
# Uso: bash scripts/ansible-demo.sh
set -euo pipefail

cd "$(dirname "$0")/.."
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Un clon recien hecho: sin .env.local, .envrc, .gitignore ni bit ejecutable en los scripts.
mkdir -p "$WORK/ansible" "$WORK/scripts"
cp ansible/prepare-env.yml ansible/inventory.ini ansible/requirements.txt "$WORK/ansible/"
cp .env.local.example .envrc.example .nvmrc "$WORK/"
cp scripts/aws-login.sh scripts/check-env.sh scripts/gh-login.sh "$WORK/scripts/"
chmod 644 "$WORK"/scripts/*.sh

docker run --rm -v "$WORK:/work" -w /work python:3.12-slim bash -c '
  pip install -q --no-cache-dir --root-user-action=ignore -r ansible/requirements.txt 2>&1 | grep -v "notice" || true
  export ANSIBLE_NOCOLOR=1 ANSIBLE_LOCALHOST_WARNING=False ANSIBLE_INVENTORY_UNPARSED_WARNING=False
  echo "=== Primera ejecucion (clon limpio)"
  ansible-playbook -i ansible/inventory.ini ansible/prepare-env.yml
  echo
  echo "=== Segunda ejecucion (debe terminar con changed=0)"
  ansible-playbook -i ansible/inventory.ini ansible/prepare-env.yml
'
