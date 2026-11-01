#!/usr/bin/env bash
# Comprobacion rapida antes de tocar AWS o GitHub en el reto: identidad de git, gh y
# cuenta de AWS. No escribe nada. Sale con error si algo apunta a la cuenta equivocada.
# Uso: bash scripts/check-env.sh
# Definido en: Wenia/docs/plan.md, fila "Entorno (direnv)".
set -uo pipefail

MANAGEMENT_ACCOUNT_ID="786567028012"
FAIL=0

fail() { echo "⛔ $1"; FAIL=1; }
ok()   { echo "✅ $1"; }

echo "AWS_PROFILE    : ${AWS_PROFILE:-<vacio>}"
echo "AWS_REGION     : ${AWS_REGION:-<vacio>}"
echo "GITHUB_ORG     : ${GITHUB_ORG:-<vacio>}"
echo "GH_CONFIG_DIR  : ${GH_CONFIG_DIR:-<vacio>}"
echo

# git: debe ser la identidad personal, nunca la de trabajo
EMAIL="$(git config user.email 2>/dev/null || true)"
case "${EMAIL}" in
  *@ba.com) fail "git user.email es el de trabajo (${EMAIL})" ;;
  "")       fail "git user.email vacio" ;;
  *)        ok "git user.email = ${EMAIL}" ;;
esac

# aws: debe resolver a una cuenta distinta de la management
if [ "${AWS_PROFILE:-}" = "wenia-reto" ]; then
  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
  if [ -z "${ACCOUNT_ID}" ]; then
    fail "sin sesion AWS: corre ./scripts/aws-login.sh"
  elif [ "${ACCOUNT_ID}" = "${MANAGEMENT_ACCOUNT_ID}" ]; then
    fail "AWS resuelve a la management account (${ACCOUNT_ID})"
  else
    ok "AWS cuenta ${ACCOUNT_ID} (wenia-reto)"
  fi
else
  fail "AWS_PROFILE deberia ser wenia-reto (direnv no cargo?)"
fi

# gh: sesion activa en el directorio aislado
if [ -z "${GH_CONFIG_DIR:-}" ]; then
  fail "GH_CONFIG_DIR vacio (direnv no cargo?)"
elif GH_USER="$(gh api user --jq .login 2>/dev/null)"; then
  ok "gh como ${GH_USER}"
else
  fail "sin sesion gh: corre ./scripts/gh-login.sh"
fi

exit "${FAIL}"
