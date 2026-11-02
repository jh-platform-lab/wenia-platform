#!/usr/bin/env bash
# Verificacion reproducible de la plataforma. Todo lo que corre aqui es LOCAL: no usa credenciales
# ni toca AWS. Lo que requiere AWS o una persona se lista aparte, sin ejecutarse, para no mezclar
# lo verificado con lo que no.
#
# Requiere: docker y git (todo lo demas corre dentro de contenedores).
# Uso:  bash scripts/verify.sh            comprobaciones rapidas
#       bash scripts/verify.sh --kind     ademas despliega un servicio en un cluster Kind local
#       bash scripts/verify.sh --save     ademas guarda el resultado en evidence/local/08-verify.txt
# Variables: TEMPLATES_REPO y API_REPO (URLs de los repos que se clonan).
# check() invoca las funciones c_* y cleanup() se dispara con trap: shellcheck no ve esas llamadas.
# shellcheck disable=SC2329
set -uo pipefail

KIND=0
SAVE=0
for arg in "$@"; do
  case "$arg" in
    --kind) KIND=1 ;;
    --save) SAVE=1 ;;
    *) echo "Opcion desconocida: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_REPO="${TEMPLATES_REPO:-https://github.com/jh-platform-lab/backstage-templates.git}"
API_REPO="${API_REPO:-https://github.com/jh-platform-lab/onboarding-api.git}"
WORK="$(mktemp -d)"
LOGS="$WORK/logs"
mkdir -p "$LOGS"

cleanup() {
  # Los contenedores corren como root: se borra desde un contenedor para no dejar archivos ajenos.
  docker run --rm -v "$WORK:/w" alpine sh -c 'rm -rf /w/* /w/.[!.]*' >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

RESULTS=()
FAILED=0

# check <ambito> <nombre> <funcion>: ejecuta la funcion, guarda su salida y registra el resultado.
check() {
  local scope="$1" name="$2" fn="$3"
  local log="$LOGS/${fn}.log"
  printf '>> [%s] %s ... ' "$scope" "$name"
  if "$fn" >"$log" 2>&1; then
    echo "OK"
    RESULTS+=("OK|$scope|$name")
  else
    echo "FALLO"
    echo "   --- ultimas lineas de $log"
    tail -n 15 "$log" | sed 's/^/   | /'
    RESULTS+=("FALLO|$scope|$name")
    FAILED=1
  fi
}

skip() { RESULTS+=("$1|$2|$3"); }

# ---------------------------------------------------------------- preparacion
echo "== Preparando (clonando repos publicos en un directorio temporal)"
git clone -q --depth 1 "$TEMPLATES_REPO" "$WORK/templates" || { echo "No se pudo clonar $TEMPLATES_REPO"; exit 1; }
git clone -q --depth 1 "$API_REPO" "$WORK/api" || { echo "No se pudo clonar $API_REPO"; exit 1; }

render() { # render <lenguaje> <tipo> <carpeta>
  docker run --rm -e HOME=/tmp -v "$ROOT/scripts:/s:ro" -v "$WORK/templates:/t:ro" -v "$WORK:/o" node:24-slim sh -c \
    "cd /tmp && npm install --silent --no-audit --no-fund nunjucks@3.2.4 && NODE_PATH=/tmp/node_modules node /s/render-skeleton.js /t/templates /o/$3 $1 $2"
}

# ---------------------------------------------------------------- comprobaciones LOCALES
c_ansible() {
  bash "$ROOT/scripts/ansible-demo.sh" | tee "$LOGS/ansible-full.txt"
  # La ultima linea "changed=" corresponde a la segunda ejecucion y debe ser 0.
  grep -o 'changed=[0-9]*' "$LOGS/ansible-full.txt" | tail -n 1 | grep -qx 'changed=0'
}

c_api() {
  docker run --rm -v "$WORK/api:/app" -w /app python:3.12-slim sh -c \
    'export PIP_ROOT_USER_ACTION=ignore PYTHONDONTWRITEBYTECODE=1
     pip install -q --no-cache-dir -r requirements-dev.txt && pytest -q -p no:cacheprovider && bandit -r app -q'
}

c_render_python() { render python k8s gen-python; }
c_render_nodejs() { render nodejs k8s gen-nodejs; }
c_render_lambda() { render python lambda gen-python-lambda; }

c_python_tests() {
  docker run --rm -v "$WORK/gen-python:/app" -w /app python:3.12-slim sh -c \
    'export PIP_ROOT_USER_ACTION=ignore PYTHONDONTWRITEBYTECODE=1
     pip install -q --no-cache-dir -r requirements-dev.txt && pytest -q -p no:cacheprovider && bandit -r app -q'
}

c_node_tests() {
  docker run --rm -v "$WORK/gen-nodejs:/app" -w /app node:24-slim sh -c \
    'npm ci --silent --no-audit --no-fund && npm test && npm audit --omit=dev --audit-level=high'
}

c_terraform() {
  local dir
  for dir in terraform observability/newrelic; do
    local tf=(docker run --rm -v "$WORK/gen-python-lambda/$dir:/w" -w /w hashicorp/terraform:1.12)
    "${tf[@]}" fmt -check -diff || return 1
    "${tf[@]}" init -backend=false -input=false >/dev/null || return 1
    "${tf[@]}" validate || return 1
  done
}

c_checkov() {
  docker run --rm -v "$WORK/gen-python-lambda/terraform:/tf" bridgecrew/checkov:3.4.0 \
    -d /tf --framework terraform --compact
}

c_images() {
  local dir="$WORK/gen-python" id code
  docker build -q -f "$dir/Dockerfile" -t wenia-verify:k8s "$dir" >/dev/null || return 1
  docker build -q -f "$dir/Dockerfile.lambda" -t wenia-verify:lambda "$dir" >/dev/null || return 1
  id="$(docker run -d --rm -p 18099:8000 wenia-verify:k8s)" || return 1
  sleep 4
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18099/health)"
  docker stop "$id" >/dev/null 2>&1
  docker rmi -f wenia-verify:k8s wenia-verify:lambda >/dev/null 2>&1
  [ "$code" = "200" ]
}

c_kind() {
  # kind-deploy.sh usa siempre --context explicito: nunca toca el contexto activo de kubectl.
  local previous
  previous="$(kubectl config current-context 2>/dev/null || true)"
  (cd "$WORK/gen-python" && KIND_CLUSTER=wenia-verify LOCAL_PORT=18098 bash scripts/kind-deploy.sh)
  local rc=$?
  kind delete cluster --name wenia-verify >/dev/null 2>&1
  [ -n "$previous" ] && kubectl config use-context "$previous" >/dev/null 2>&1
  return "$rc"
}

echo
echo "== Comprobaciones locales"
check LOCAL "Ansible: segunda ejecucion con changed=0" c_ansible
check LOCAL "onboarding-api: pruebas pytest y bandit" c_api
check LOCAL "Plantilla: renderiza Python (k8s)" c_render_python
check LOCAL "Plantilla: renderiza Node.js (k8s)" c_render_nodejs
check LOCAL "Plantilla: renderiza Python (lambda)" c_render_lambda
check LOCAL "Servicio Python generado: pytest y bandit" c_python_tests
check LOCAL "Servicio Node.js generado: npm test y npm audit" c_node_tests
check LOCAL "Terraform: fmt, init y validate (infra y New Relic)" c_terraform
check LOCAL "Terraform: checkov" c_checkov
check LOCAL "Imagenes K8S y Lambda se construyen; K8S responde /health" c_images
if [ "$KIND" = "1" ]; then
  check LOCAL "Tipo K8S: despliegue en Kind y curl /health" c_kind
else
  skip OMITIDO LOCAL "Tipo K8S en Kind (usa --kind; evidencia en evidence/local/07-k8s-kind.txt)"
fi

# ---------------------------------------------------------------- lo que NO se ejecuta aqui
skip REQUIERE-AWS AWS "Terraform apply del servicio Lambda y de ECR/OIDC (evidence/aws/)"
skip REQUIERE-AWS AWS "CD: publicar imagen en ECR y actualizar la Lambda"
skip REQUIERE-AWS AWS "Function URL responde desde internet"
skip MANUAL MANUAL "Scaffolder: caso valido, nombre duplicado y fallo con rollback (evidence/local/, ver README de evidence)"
skip MANUAL MANUAL "New Relic con cuenta real (requiere licencia)"

# ---------------------------------------------------------------- resumen
summary() {
  echo
  echo "== Resumen ($(date '+%Y-%m-%d %H:%M'))"
  printf '%-16s %-7s %s\n' ESTADO AMBITO COMPROBACION
  local row
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r status scope name <<<"$row"
    printf '%-16s %-7s %s\n' "$status" "$scope" "$name"
  done
  echo
  if [ "$FAILED" = "0" ]; then
    echo "Todas las comprobaciones locales ejecutadas pasaron."
  else
    echo "Hay comprobaciones locales que fallaron."
  fi
}

if [ "$SAVE" = "1" ]; then
  mkdir -p "$ROOT/evidence/local"
  summary | tee "$ROOT/evidence/local/08-verify.txt"
else
  summary
fi
exit "$FAILED"
