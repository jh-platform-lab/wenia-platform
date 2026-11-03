# wenia-platform

Portal interno de autoservicio sobre **Backstage**. Desde un formulario genera un microservicio (Python, Node.js, Go o Java; desplegable en AWS Lambda o en Kubernetes) con repositorio, registro en el catálogo, Dockerfile, CI/CD, Terraform, observabilidad y documentación operativa. También genera infraestructura (S3, SQS) y abre PRs de gestión sobre servicios existentes.

Caso técnico "Platform Engineer". Este repo contiene el portal, sus acciones propias y la infraestructura base. Las plantillas viven en otro repo para que evolucionen por separado.

## Cómo encaja

```mermaid
flowchart LR
  U[Desarrollador] --> B[Backstage<br/>este repo]
  B -- lee --> T[backstage-templates<br/>nueve plantillas]
  B -- 1. wenia:check-duplicate --> G[(GitHub org<br/>jh-platform-lab)]
  B -- 2. crea el repo --> G
  B -- 3. wenia:register-or-rollback --> C[(Catálogo<br/>Component + API)]
  G --> S[Servicio generado<br/>CI + CD + Terraform]
  S -- imagen --> E[ECR]
  E --> L[Lambda o Kubernetes]
```

| Repo | Qué contiene |
|---|---|
| [`wenia-platform`](https://github.com/jh-platform-lab/wenia-platform) | Backstage, acciones propias del scaffolder, Ansible, `verify.sh`, evidencia |
| [`backstage-templates`](https://github.com/jh-platform-lab/backstage-templates) | Nueve plantillas, una carpeta por cada una (`templates/<nombre>/`) |
| [`onboarding-api`](https://github.com/jh-platform-lab/onboarding-api) | Servicio de ejemplo generado con la plantilla, con 6 endpoints reales |

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/documento-tecnico.md`](docs/documento-tecnico.md) ([PDF](docs/documento-tecnico.pdf)) | Arquitectura, decisiones, límites y qué medir |
| [`docs/guia-implementacion-local.md`](docs/guia-implementacion-local.md) | Cómo levantar y usar todo en local, paso a paso |
| [`docs/presentacion/`](docs/presentacion/presentacion.md) | Presentación del flujo con evidencias (`index.html` y versión Markdown) |
| [`docs/uso-ia.md`](docs/uso-ia.md) | Uso de IA en el desarrollo |
| [`evidence/`](evidence) | Capturas y salidas, separadas en `local/` y `aws/` |

## Plantillas

Cada plantilla es una carpeta autocontenida en `backstage-templates/templates/<nombre>/` (`template.yaml` + `skeleton/`). Backstage muestra una card por carpeta.

| Plantilla | Crea | Tipo |
|---|---|---|
| `python-service` | Servicio FastAPI | Repo nuevo |
| `nodejs-service` | Servicio Express | Repo nuevo |
| `go-service` | Servicio net/http (imagen distroless) | Repo nuevo |
| `java-service` | Servicio Spring Boot 3 (Java 21) | Repo nuevo |
| `s3-bucket` | Bucket S3 con KMS, versionado y TLS | Repo nuevo (Terraform) |
| `sqs-queue` | Cola SQS con DLQ, KMS y TLS | Repo nuevo (Terraform) |
| `update-service` | Actualiza archivos de plataforma de un servicio | PR en un servicio existente |
| `add-observability` | Añade alertas y dashboard de New Relic | PR en un servicio existente |
| `team-registration` | Registra un equipo en `catalog/teams/` | PR en este repo |

Para agregar una plantilla: crea su carpeta con `template.yaml` y `skeleton/`, pruébala creándola desde Backstage en local (`yarn start` lee tu carpeta al instante), anota el cambio en el `CHANGELOG.md` de `backstage-templates` y abre un PR. Backstage la descubre sola.

## Arrancar en local

Requisitos: Docker, Node 24 (`.nvmrc`) y un token de GitHub de la organización (ver `.env.local.example`).

```bash
cp .env.local.example .env.local        # completa POSTGRES_PASSWORD y GITHUB_TOKEN (no se sube a git)
```

| Forma | Comandos | Cuándo |
|---|---|---|
| Desarrollo (recarga en segundos) | `docker compose up -d postgres` y luego `cd backstage && yarn install && yarn start` | Cambiar código de Backstage |
| Todo en contenedores | `docker compose --profile app up -d` (baja la última imagen del CI desde GHCR) | Demostración; simula el despliegue en Kubernetes |

Abre http://localhost:3100, entra como invitado y ve a **Create**. Puertos propios del reto: web 3100, backend 7100, Postgres 5442.

### Ver cambios en Backstage

| Qué cambiaste | Con `yarn start` | Con el contenedor |
|---|---|---|
| Código de Backstage (Home, acciones, config) | Se ve solo, en segundos | Reconstruir la imagen (abajo) |
| Una plantilla o skeleton | Se ve al instante: lee tu carpeta local | Solo cuando está en `main`: lee de GitHub |
| `catalog/org.yaml` | Se ve en unos segundos | Solo cuando está en `main` |

Cada merge a `main` que toque `backstage/**` construye la imagen y la publica en `ghcr.io/jh-platform-lab/backstage` (`:<sha>` y `:latest`); un PR solo la construye para validarla. Para ver lo ya publicado: `docker compose --profile app up -d --force-recreate backstage`.

**Despliegue automático en local (opcional).** Con `docker compose --profile app --profile autodeploy up -d` se levanta también Watchtower: cada minuto revisa GHCR y, si el CI publicó una imagen nueva, recrea el contenedor de Backstage solo. Flujo completo: merge a `main` → el CI publica (unos 10 minutos) → Watchtower la detecta (hasta 1 minuto) → Backstage se actualiza. Solo toca los contenedores marcados con la etiqueta de Watchtower. Monta el socket de Docker, así que es para uso local; en un cluster esa tarea la haría ArgoCD.

Para ver una rama **sin esperar al CI**, construye la imagen en tu máquina y úsala:

```bash
bash scripts/build-backstage-image.sh              # activa Node 24 con nvm si hace falta
BACKSTAGE_IMAGE=wenia/backstage:local BACKSTAGE_PULL=never docker compose --profile app up -d --force-recreate backstage
```

Recarga con `Cmd+Shift+R` para saltarte la caché del navegador. Para iterar rápido usa `yarn start`.

`ansible-playbook -i ansible/inventory.ini ansible/prepare-env.yml` prepara los archivos locales y es idempotente: la segunda ejecución termina con `changed=0`.

## Qué hace el formulario

Valida antes de crear nada y cubre los cuatro casos del reto:

| Caso | Qué pasa |
|---|---|
| Solicitud válida | Crea el repo, lo registra en el catálogo y devuelve los enlaces |
| Solicitud inválida | El formulario rechaza el nombre (formato DNS, 3–40 caracteres) y no ejecuta ningún paso |
| Nombre duplicado | `wenia:check-duplicate` consulta el catálogo y GitHub; la tarea falla en el primer paso y no crea nada |
| Fallo durante la generación | Si el registro falla tras crear el repo, `wenia:register-or-rollback` borra el repo de esa tarea y deja la tarea fallida |

El rollback solo borra repos de la organización permitida, con nombre válido y creados hace menos de 15 minutos.

## Verificar

```bash
bash scripts/verify.sh --kind     # ~10 min; todo corre en contenedores
```

Ejecuta las pruebas de la API, renderiza la plantilla en Python y Node.js, corre sus pruebas, valida Terraform (`fmt`, `validate`, `checkov`), construye las imágenes, repite Ansible y despliega en Kind. Lo que requiere AWS o una persona se lista aparte sin ejecutarse. El mapa de requisitos y evidencias está en [`evidence/README.md`](evidence/README.md).

## Probar la API de ejemplo en local

`onboarding-api` tiene 6 endpoints (`/health`, `GET` y `POST /services`, `GET` y `DELETE /services/{name}`, `GET /services/{name}/status`). Tres formas, de menos a más completa:

```bash
git clone https://github.com/jh-platform-lab/onboarding-api && cd onboarding-api

# 1. Pruebas automáticas (11)
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt && python -m pytest -q

# 2. Servidor con recarga y Swagger en http://localhost:8000/docs
uvicorn app.main:app --port 8000 --reload

# 3. La misma imagen que se despliega
docker build -t onboarding-api . && docker run --rm -p 8000:8000 onboarding-api
```

Con el servidor arriba:

```bash
B=http://localhost:8000
curl $B/health                                                   # 200 {"status":"ok"}
curl -X POST $B/services -H 'content-type: application/json' \
  -d '{"name":"billing-api","owner":"platform-team"}'            # 201
curl -X POST $B/services -H 'content-type: application/json' \
  -d '{"name":"billing-api","owner":"platform-team"}'            # 409 duplicado
curl -X POST $B/services -H 'content-type: application/json' \
  -d '{"name":"Mi_Servicio","owner":"platform-team"}'            # 422 nombre inválido
curl $B/services/billing-api/status                              # 200
curl -X DELETE $B/services/billing-api                           # 204
curl $B/services/billing-api                                     # 404
```

La salida guardada de esta secuencia está en `evidence/local/05-onboarding-api-curl.txt`. El estado vive en memoria: se pierde al reiniciar.

## Simular EKS en local (agente de despliegue)

El CD de un servicio de tipo Kubernetes publica la imagen en ECR; corre en GitHub y no llega a tu Docker. `scripts/local-eks-agent.sh` cierra ese paso en local: vigila ECR y, cuando un servicio `k8s` publica una imagen nueva, la despliega en Kind con el `scripts/kind-deploy.sh --ecr <sha>` del propio repo del servicio.

```bash
bash scripts/aws-login.sh              # sesión SSO de wenia-reto
bash scripts/local-eks-agent.sh        # vigila cada 30 s (Ctrl+C para salir)
# --once una pasada · --dry-run muestra qué haría · --reset olvida lo desplegado
kubectl --context kind-wenia-eks get deploy,pods
```

Requiere `aws`, `gh`, `git`, `docker`, `kind` y `kubectl`. Se niega a correr si la cuenta de AWS no es `875062865815`. Los servicios de tipo `lambda` se omiten.

## Despliegue en AWS

Cuenta dedicada `875062865815` y presupuesto de 5 USD. El camino completo está probado con `onboarding-api` en Lambda (`evidence/aws/16-*`); `demo-final4` fue la primera prueba (`evidence/aws/10-*` a `15-*`).

**Una sola vez: bootstrap (`infra/bootstrap`, lo aplica una persona).** Crea el bucket de estado (cifrado con KMS), el proveedor OIDC de GitHub, la alerta de presupuesto y dos roles: `wenia-github-deployer` (CD, solo con el entorno `production`) y `wenia-github-planner` (solo lectura, para el `plan` de los PR). Las variables `AWS_ROLE_ARN`, `AWS_PLAN_ROLE_ARN` y `TF_STATE_BUCKET` se publican a nivel de organización; ningún servicio guarda llaves.

```bash
cd infra/bootstrap
terraform plan -var account_id=<id> -var alert_email=<correo> -out tfplan   # revisar
terraform apply tfplan
```

**Por cada servicio (lo hace el CD al fusionar a `main`).** Terraform con módulos locales (`ecr-repo`, `github-cd-role`, `lambda-service`) y estado remoto por servicio:

1. `apply` acotado a ECR y al rol de CD (`-target`).
2. Construye la imagen de Lambda y la publica en ECR con el SHA del commit.
3. `apply` completo con esa imagen: crea la función y su Function URL.
4. `update-function-code`, para los siguientes despliegues.

En los PR, el CI ejecuta `terraform plan` con el rol de solo lectura. Para borrar un servicio: `terraform destroy` desde su carpeta `terraform/`.

## Operar y diagnosticar

**Observabilidad del proceso de generación.** Las acciones escriben una línea JSON por evento (`ts`, `level`, `action`, `requestId`, `service`, `event`). El `requestId` es el id de la tarea del scaffolder: sirve para seguir una solicitud en la página de la tarea, en `GET /api/scaffolder/v2/tasks/<requestId>` o con `grep` en el log del backend.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Pantalla en blanco, 401 en el catálogo (contenedor) | El login de invitado está bloqueado con `NODE_ENV=production` | La config del contenedor ya lo autoriza (`app-config.k8s.yaml`); reconstruye la imagen |
| `docker compose` dice `access denied` al bajar la imagen | Usas una imagen local (`wenia/backstage:local`) sin `BACKSTAGE_PULL=never` | Define `BACKSTAGE_PULL=never` o quita `BACKSTAGE_IMAGE` para usar la de GHCR |
| La tarea falla en "Verificar que el nombre no exista" | El servicio ya existe en el catálogo o en GitHub (evento `duplicate`) | Usa otro nombre |
| La tarea falla al registrar y no queda repo | Rollback ejecutado (evento `rollback`) | Revisa la causa en el log y reintenta |
| La plantilla no aparece en Create | El catálogo aún no leyó GitHub | Espera unos segundos; en el contenedor la plantilla se lee de `main` |
| `kubectl` apunta a otro cluster | El contexto activo no es el de Kind | Los scripts usan siempre `--context kind-...` |

El troubleshooting de cada servicio generado vive en el `README.md` que la plantilla le entrega.

## Evolución de las plantillas

Cada servicio nace con la anotación `wenia.io/template-version` en su `catalog-info.yaml`. Cuando la plantilla sube de versión (ver `CHANGELOG.md` de `backstage-templates`), esa anotación permite saber qué servicios quedaron atrás. Cada cambio de plantilla va por pull request y sube la versión.

## Estructura

```
backstage/            app de Backstage y acciones propias (packages/backend/src/modules/wenia-actions)
catalog/org.yaml      equipos base (Group) que valida el campo "owner" del formulario
catalog/teams/        equipos creados con la plantilla team-registration (un archivo por equipo)
ansible/              preparación idempotente del entorno local
infra/bootstrap/      cuenta AWS: estado, OIDC, presupuesto y roles de CD y plan (apply manual)
infra/modules/        módulos Terraform base (bucket de estado)
scripts/              verify.sh, render-skeleton.js, build-backstage-image.sh, login y comprobación del entorno
evidence/             evidencia local y de AWS, con su índice
docs/uso-ia.md        cómo se usó la IA en este trabajo
```

## Límites actuales

- Solo la plantilla Python tiene el flujo de AWS completo (módulos, estado remoto, CD en dos pasos). Node.js, Go y Java conservan el CD anterior y deben migrarse.
- El despliegue a EKS es un marcador en el CD. El tipo Kubernetes se probó en Kind (local y en un job del CI).
- El `apply` del bootstrap es manual. Automatizarlo exige migrar su estado a S3 y un rol con permisos de IAM tras un entorno con aprobación; queda como evolución.
- New Relic: el agente reportó datos reales desde Kind; las alertas y el dashboard están como código y no se aplicaron con Terraform (requieren una API key de usuario).
- La imagen de Backstage que publica el CI es multiarquitectura (`amd64` y `arm64`); el build de `arm64` usa QEMU y tarda más.
