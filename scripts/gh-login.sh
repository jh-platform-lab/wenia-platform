#!/usr/bin/env bash
# Verifica la sesion de gh en el GH_CONFIG_DIR aislado (cuenta personal, separada del gh
# de trabajo) y comprueba que la org del reto sea visible.
# Uso: ./scripts/gh-login.sh
set -euo pipefail

if [ -z "${GH_CONFIG_DIR:-}" ]; then
  echo "⛔ GH_CONFIG_DIR no esta seteado — ¿corriste esto fuera de personal-projects/, o direnv"
  echo "   no cargo? Sin el, gh usaria la config de trabajo."
  exit 1
fi

ORG="${GITHUB_ORG:-jh-platform-lab}"

echo "→ Verificando sesion gh aislada (GH_CONFIG_DIR: ${GH_CONFIG_DIR})..."

if ! gh auth status >/dev/null 2>&1; then
  echo "⏳ Sin sesion en este directorio aislado — abriendo el navegador para autorizar..."
  echo "   Usa tu cuenta personal (jaimehenao8126), no la de trabajo."
  gh auth login --hostname github.com --git-protocol https --web
fi

gh auth status

if gh api user/orgs --jq '.[].login' | grep -qx "${ORG}"; then
  echo "✅ Org '${ORG}' visible para esta cuenta."
else
  echo "⛔ Esta cuenta no ve la org '${ORG}'. ¿Iniciaste sesion con la cuenta equivocada?"
  exit 1
fi
