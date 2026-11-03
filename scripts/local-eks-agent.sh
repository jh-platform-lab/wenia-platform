#!/usr/bin/env bash
# Agente de despliegue local: simula el paso "EKS" del CD de los servicios de tipo Kubernetes.
#
# El CD corre en los servidores de GitHub y no puede llegar a un Docker local. Este agente hace
# lo mismo que un controlador GitOps en el cluster: vigila ECR y, cuando un servicio de tipo
# `k8s` publica una imagen nueva (la etiqueta es el SHA del commit), la despliega en Kind con el
# script que trae el propio repositorio del servicio (`scripts/kind-deploy.sh --ecr <sha>`).
#
# Requiere: aws (sesion SSO de wenia-reto), gh, git, docker, kind y kubectl.
# Uso:  bash scripts/local-eks-agent.sh            vigila cada 30 s hasta Ctrl+C
#       bash scripts/local-eks-agent.sh --once     una sola pasada
#       bash scripts/local-eks-agent.sh --dry-run  muestra que haria, sin desplegar
#       bash scripts/local-eks-agent.sh --reset    olvida lo ya desplegado
# Variables: ORG (jh-platform-lab), INTERVAL (30), AWS_REGION (us-east-1), WENIA_ACCOUNT_ID.
set -uo pipefail

ORG="${ORG:-jh-platform-lab}"
INTERVAL="${INTERVAL:-30}"
REGION="${AWS_REGION:-us-east-1}"
EXPECTED_ACCOUNT="${WENIA_ACCOUNT_ID:-875062865815}"
MANAGEMENT_ACCOUNT="786567028012"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/wenia-local-cd"
STATE_FILE="$STATE_DIR/deployed.txt"

ONCE=0
DRY=0
for arg in "$@"; do
  case "$arg" in
    --once) ONCE=1 ;;
    --dry-run) DRY=1; ONCE=1 ;;
    --reset) rm -f "$STATE_FILE"; echo "Estado borrado."; exit 0 ;;
    *) echo "Opcion desconocida: $arg" >&2; exit 2 ;;
  esac
done

log() { printf '%s  %s\n' "$(date +%H:%M:%S)" "$*"; }

for cmd in aws gh git docker kind kubectl; do
  command -v "$cmd" >/dev/null || { echo "Falta el comando: $cmd" >&2; exit 1; }
done

# Guarda de cuenta: nunca desplegar con credenciales de otra cuenta.
ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [ -z "$ACCOUNT" ]; then
  echo "Sin sesion AWS. Corre: bash scripts/aws-login.sh" >&2
  exit 1
fi
if [ "$ACCOUNT" = "$MANAGEMENT_ACCOUNT" ] || [ "$ACCOUNT" != "$EXPECTED_ACCOUNT" ]; then
  echo "Cuenta AWS inesperada ($ACCOUNT). Se esperaba $EXPECTED_ACCOUNT (perfil wenia-reto)." >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
touch "$STATE_FILE"

deployed_tag() { awk -v n="$1" '$1 == n { print $2 }' "$STATE_FILE"; }

remember() {
  grep -v "^$1 " "$STATE_FILE" >"$STATE_FILE.tmp" || true
  echo "$1 $2" >>"$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# Tipo de servicio: el CD y este agente leen el mismo archivo del repo (deploy/service-type).
service_type() {
  gh api "repos/$ORG/$1/contents/deploy/service-type" -H "Accept: application/vnd.github.raw" 2>/dev/null | tr -d '[:space:]'
}

# Etiqueta de la imagen mas reciente (el CD etiqueta con el SHA del commit).
latest_tag() {
  aws ecr describe-images --region "$REGION" --repository-name "$1" \
    --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' --output text 2>/dev/null
}

deploy() {
  local name="$1" tag="$2" work
  work="$(mktemp -d)"
  log "[$name] clonando el repo y desplegando la imagen $tag en Kind"
  if git clone -q --depth 1 "https://github.com/$ORG/$name.git" "$work/$name" \
    && (cd "$work/$name" && bash scripts/kind-deploy.sh --ecr "$tag"); then
    remember "$name" "$tag"
    log "[$name] desplegado: kubectl --context kind-wenia-eks get deploy $name"
  else
    log "[$name] FALLO el despliegue (se reintentara en la proxima pasada)"
  fi
  rm -rf "$work"
}

pass() {
  local repos name type tag
  repos="$(aws ecr describe-repositories --region "$REGION" --query 'repositories[].repositoryName' --output text 2>/dev/null)"
  [ -n "$repos" ] || { log "ECR sin repositorios"; return; }
  for name in $repos; do
    type="$(service_type "$name")"
    if [ "$type" != "k8s" ]; then
      [ "$DRY" = 1 ] && log "[$name] tipo '${type:-desconocido}': se omite"
      continue
    fi
    tag="$(latest_tag "$name")"
    if [ -z "$tag" ] || [ "$tag" = "None" ]; then
      continue
    fi
    if [ "$(deployed_tag "$name")" = "$tag" ]; then
      [ "$DRY" = 1 ] && log "[$name] ya desplegado ($tag)"
      continue
    fi
    if [ "$DRY" = 1 ]; then
      log "[$name] desplegaria la imagen $tag"
    else
      deploy "$name" "$tag"
    fi
  done
}

log "Agente local de despliegue (cuenta $ACCOUNT, org $ORG, cada ${INTERVAL}s). Ctrl+C para salir."
while true; do
  pass
  [ "$ONCE" = 1 ] && break
  sleep "$INTERVAL"
done
