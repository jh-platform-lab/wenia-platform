# onboarding-api

API de onboarding de servicios para la plataforma

| | |
|---|---|
| Equipo propietario | `platform-team` |
| Tipo de servicio | `lambda` |
| Lenguaje | Python 3.12 (FastAPI) |
| Versión de la plantilla | `1.6.6` (anotación `wenia.io/template-version` del catálogo) |

## Qué se creó

| Archivo o carpeta | Para qué sirve |
|---|---|
| `app/main.py` | Servicio FastAPI: `/health` y una ruta por cada operación del formulario |
| `openapi.yaml`, `catalog-info.yaml` | Contrato de la API y registro en el catálogo de Backstage (Component y API) |
| `Dockerfile` | Imagen para Kubernetes: usuario sin privilegios, `HEALTHCHECK`, agente de New Relic |
| `Dockerfile.lambda` | Imagen para AWS Lambda (adaptador Mangum) |
| `tests/` | Pruebas unitarias con pytest |
| `.github/workflows/ci.yml` | **CI**: valida, no publica nada |
| `.github/workflows/cd.yml` | **CD**: publica la imagen y despliega (solo en `main`) |
| `k8s/` | Deployment (2 réplicas, probes, `securityContext` restrictivo) y Service para el tipo Kubernetes |
| `scripts/kind-deploy.sh` | Despliega `k8s/` en un cluster Kind local y lo prueba con curl |
| `terraform/` | ECR, rol OIDC de CD y, para Lambda, la función con su URL pública |
| `observability/newrelic/` | Alertas y dashboard de New Relic como código |
| `newrelic.ini` | Configuración del agente APM (servicio sobre Kubernetes) |

Rutas generadas (devuelven `501 Not implemented` hasta que escribas su lógica):

| Método | Ruta | Operación |
|---|---|---|
| GET | `/health` | `health` (ya implementada) |
| GET | `/health` | `health` |
| GET | `/services` | `list-services` |
| POST | `/services` | `create-service` |
| GET | `/services/{name}` | `get-service` |
| DELETE | `/services/{name}` | `delete-service` |
| GET | `/services/{name}/status` | `service-status` |

## Desarrollar

```bash
python3.12 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload          # http://127.0.0.1:8000/docs
```


Para implementar una ruta, edita su función en `app/main.py`, actualiza `openapi.yaml` si cambia el contrato y agrega su prueba en `tests/`.

## Verificar

| Qué | Comando |
|---|---|
| Pruebas | `pytest -q` |
| Seguridad del código | `bandit -r app` |
| Dependencias vulnerables | `pip-audit -r requirements.txt` |
| Secretos en el repo | `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 detect --source /repo --no-banner` |
| Imagen (K8S) | `docker build -f Dockerfile -t onboarding-api . && docker run --rm -p 8000:8000 onboarding-api` |
| Imagen (Lambda) | `docker build -f Dockerfile.lambda -t onboarding-api-lambda .` |
| Kubernetes (local) | `bash scripts/kind-deploy.sh` crea el cluster Kind `local-dev`, despliega y hace `curl /health`; `--delete` lo borra |
| Terraform | en `terraform/`: `terraform fmt -check`, `terraform init -backend=false`, `terraform validate` |

El CI ejecuta lo mismo en cada PR: `test`, `terraform`, `secrets` e `image` (con escaneo Trivy de HIGH y CRITICAL).

## Operar

### Primer despliegue (una sola vez)

1. En `terraform/`: `terraform init && terraform apply`. Crea el repositorio ECR y el rol de CD. **La Lambda aún no existe** (no hay imagen todavía).
2. En GitHub, **Settings → Secrets and variables → Actions → Variables**: crea `AWS_ROLE_ARN` con el valor de `terraform output cd_role_arn`.
3. Haz push a `main`. El CD construye y publica la imagen. En Lambda, el último paso falla porque la función no existe: es lo esperado.
4. `terraform apply -var image_uri=<url ECR>:<sha del commit>` crea la función y su URL pública (`terraform output function_url`).

Desde entonces cada push a `main` publica una imagen etiquetada con el SHA y, en Lambda, actualiza el código de la función. Terraform ignora la imagen (`ignore_changes`) para no revertir lo que despliega el CD.

### Según el tipo de servicio

| Tipo | Qué hace el CD hoy |
|---|---|
| `lambda` | Publica la imagen en ECR y ejecuta `update-function-code` |
| `k8s` | Publica la imagen en ECR. En local, `scripts/kind-deploy.sh` despliega `k8s/` en Kind. El paso de despliegue a EKS del CD sigue siendo un marcador hasta que exista el cluster |

### Observabilidad

| Dónde | Qué ver |
|---|---|
| Logs | Kubernetes: `kubectl logs`. Lambda: grupo de CloudWatch `/aws/lambda/onboarding-api` |
| Salud | `GET /health` |
| New Relic (K8S) | Define `NEW_RELIC_LICENSE_KEY` desde un Secret. Sin licencia el servicio arranca igual y el agente queda desactivado |
| Alertas y dashboard | En `observability/newrelic/`: `export TF_VAR_api_key=NRAK-...` y `terraform apply -var account_id=<id>` |

New Relic para Lambda requiere la extensión de New Relic, que no se incluye en la imagen: hoy ese tipo se observa con CloudWatch.

## Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Una ruta responde `501 Not implemented` | Es el stub generado | Escribe la lógica en `app/main.py` |
| CI: falla `secrets` | Gitleaks encontró un secreto | Revoca la credencial, elimínala del historial y vuelve a empujar. No basta con borrar el archivo |
| CI: falla `pip-audit` | Dependencia con vulnerabilidad conocida | Sube la versión en `requirements.txt` y prueba de nuevo |
| CI: `image` falla en "Set up job" | Etiqueta de una acción de GitHub inexistente | Revisa la versión del `uses:` en el workflow |
| CI: `image` falla en Trivy | Vulnerabilidad HIGH o CRITICAL con arreglo disponible | Actualiza la imagen base o la dependencia |
| CD: `Could not assume role` | Falta `AWS_ROLE_ARN`, o el rol no confía en este repo y entorno | Revisa la variable y que el entorno sea `production`; el rol solo acepta `repo:<org>/onboarding-api:environment:production` |
| CD: falla "Deploy Lambda" la primera vez | La función aún no existe | Haz el paso 4 del primer despliegue |
| Terraform no crea la Lambda | `image_uri` vacío a propósito | Pasa `-var image_uri=<url ECR>:<sha>` |
| La URL de la Lambda responde 403 | Faltan los dos permisos públicos de la URL | Reaplica Terraform: `FunctionURLAllowPublicAccess` y `FunctionURLAllowInvokeAction` |
| Kind: el pod queda en `ImagePullBackOff` | La imagen `onboarding-api:local` no está cargada en el cluster | Vuelve a correr `bash scripts/kind-deploy.sh` (construye y la carga con `kind load`) |
| El contenedor queda `unhealthy` | `/health` no responde | `docker logs <contenedor>` y revisa el arranque del servidor (uvicorn) |
| New Relic no muestra datos | Falta `NEW_RELIC_LICENSE_KEY` | Define el Secret y reinicia; el log del agente (`New Relic Python Agent`) indica si arrancó |

## Evolución de la plantilla

Este servicio se creó con la versión `1.6.6` de la plantilla `python-service`. La anotación `wenia.io/template-version` en `catalog-info.yaml` permite saber qué servicios están desactualizados cuando la plantilla cambie.
