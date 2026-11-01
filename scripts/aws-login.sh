#!/usr/bin/env bash
# Verifica la sesion SSO del profile wenia-reto (cuenta hija del reto) y la renueva si
# expiro. Se niega a seguir si el profile apunta a la management account.
# Uso: ./scripts/aws-login.sh
set -euo pipefail

PROFILE="${AWS_PROFILE:-wenia-reto}"
MANAGEMENT_ACCOUNT_ID="786567028012"

if [ "${PROFILE}" = "taxops-admin" ]; then
  echo "⛔ AWS_PROFILE=taxops-admin es la management account, no la del reto."
  echo "   ¿Corriste esto fuera de Wenia/, o direnv no cargo? Esperado: wenia-reto."
  exit 1
fi

if ! aws configure list-profiles | grep -qx "${PROFILE}"; then
  echo "⛔ El profile '${PROFILE}' no existe en ~/.aws/config."
  echo "   Crealo con: aws configure sso   (nombre: ${PROFILE}, region: us-east-1)"
  exit 1
fi

echo "→ Verificando sesion AWS SSO (profile: ${PROFILE})..."

if ! aws sts get-caller-identity --profile "${PROFILE}" >/dev/null 2>&1; then
  echo "⏳ Sesion expirada o no iniciada — abriendo el navegador para reautorizar..."
  aws sso login --profile "${PROFILE}"
fi

ACCOUNT_ID="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text)"

if [ "${ACCOUNT_ID}" = "${MANAGEMENT_ACCOUNT_ID}" ]; then
  echo "⛔ El profile '${PROFILE}' resuelve a la management account (${ACCOUNT_ID})."
  echo "   Revisa sso_account_id en ~/.aws/config: debe ser el ID de wenia-reto."
  exit 1
fi

echo "✅ Sesion activa en la cuenta ${ACCOUNT_ID}:"
aws sts get-caller-identity --profile "${PROFILE}" --output table
