# Limpieza y recreación del entorno

Estado al 2026-11-04 (después de la sustentación). Este documento dice qué se creó para el caso, cómo retirarlo y cómo volver a levantarlo desde cero. Al terminar la limpieza solo permanecen dos repositorios: `wenia-platform` y `backstage-templates`.

## 1. Qué existe hoy

### AWS (cuenta hija `875062865815`, perfil `wenia-reto`, región `us-east-1`)

| Recurso | Cantidad | Origen |
|---|---|---|
| Funciones Lambda | 12: `onboarding-api`, `reto-demo-api`, `demo-go-lambda`, `demo-go-lambda-2`, `demo-go-final`, `demo-java-lambda`, `demo-java-lambda-2`, `demo-java-final`, `demo-node-api`, `demo-pthon-api`, `demo-python-api-video`, `demo-api-python-video` | CD de cada servicio generado |
| Repositorios ECR | 14: los de las Lambdas (menos 0) más `demo-k8s-api`, `demo-k8s-video` | CD de cada servicio |
| Roles IAM | 35 con sufijo `-cd` (OIDC de GitHub) o `-lambda`, más `wenia-github-deployer` y `wenia-github-planner` | Terraform de cada servicio y `infra/bootstrap` |
| Proveedor OIDC | `token.actions.githubusercontent.com` | `infra/bootstrap` |
| Bucket S3 de estado | `wenia-tfstate-875062865815` (un prefijo por servicio) | `infra/bootstrap` |
| Presupuesto | `wenia-reto-monthly` (5 USD) | `infra/bootstrap` |
| Grupos de logs | 14 `/aws/lambda/*` | Lambdas |
| SQS, SSM, políticas propias | ninguno | |

`OrganizationAccountAccessRole` es del rol que crea AWS Organizations: no se toca.

### GitHub (organización `jh-platform-lab`, 17 repos)

| Se queda | Se borra |
|---|---|
| `wenia-platform`, `backstage-templates` | `onboarding-api` (antes: ver sección 4), `demo-go-final`, `demo-java-final`, `demo-go-lambda`, `demo-go-lambda-2`, `demo-java-lambda`, `demo-java-lambda-2`, `demo-api-python-video`, `demo-python-api-video`, `demo-k8s-video`, `demo-pthon-api`, `demo-node-api`, `demo-k8s-api`, `test-template`, `gitops` (vacío) |

### Local (Docker Desktop y Kind)

| Qué | Nombre |
|---|---|
| Contenedores | `wenia-backstage`, `wenia-backstage-db`, `wenia-watchtower` |
| Volumen | `wenia-platform_wenia-backstage-pgdata` |
| Red | `wenia-platform_default` |
| Cluster Kind | `wenia-eks` (el cluster `local-dev` no es de este caso) |
| Imágenes propias | `ghcr.io/jh-platform-lab/backstage`, `wenia/backstage:local`, `onboarding-api:local`, `nr-test:local`, `demo-*:local`, `demo-node*`, `demo-svc:local`, `app-k8s:*`, `wenia-go-*:t`, `wenia-java-*:t`, y las que llevan el prefijo `875062865815.dkr.ecr...` |
| Imágenes de herramientas (se vuelven a bajar solas) | `minlag/mermaid-cli`, `bridgecrew/checkov`, `tflint`, `golang:1.26`, `node:24-*`, `python:3.12-slim`, `postgres:16-alpine`, `watchtower` |

No pertenecen al caso y no se tocan: `nx-utility-backstage_*`, `platform-engineering-demo_*`, `platform-demo/wallet-*`, `local-dev`, `libretranslate`, `grafana/k6`.

## 2. Qué conservar antes de borrar

| Qué | Dónde queda |
|---|---|
| Documentación, evidencia, presentación, plantillas | Ya están en los dos repos |
| Código de `onboarding-api` | Copiar a `wenia-platform/examples/onboarding-api/` (sección 4) |
| Video | Drive (enlace en el correo) |
| Notas de defensa (`sustentacion.md`) y planes | `Wenia/docs/`, solo local |
| `.env.local` (token de GitHub, New Relic) | Solo local; los secretos se regeneran |
| Dashboard de New Relic | `observability/newrelic/` y `Wenia/docs/newrelic-dashboard-import.json` |

## 3. Orden de limpieza

Cada paso borra algo; se hace uno por uno y con confirmación explícita.

1. **Evidencia**: confirmar que `evidence/` y `docs/` están en `main` de ambos repos.
2. **GitHub**: borrar los repos de la columna "Se borra" de la tabla anterior. Comando por repo: `GH_CONFIG_DIR=~/.config/gh-personal-projects gh repo delete jh-platform-lab/<repo> --yes`. Requiere el permiso `delete_repo` (`gh auth refresh -s delete_repo`).
3. **AWS, una de dos vías**:
   - **Recomendada**: cerrar la cuenta hija desde la cuenta de management (consola de Organizations o `aws organizations close-account --account-id 875062865815`). Elimina todo su contenido; queda suspendida unos 90 días. Nunca ejecutar nada de este caso con el perfil de management.
   - **Si se conserva la cuenta**: vaciar y borrar en este orden: Lambdas, grupos de logs, ECR (`--force`), roles IAM (quitar políticas primero), proveedor OIDC, presupuesto, y por último el bucket de estado (versionado: borrar versiones y marcadores).
4. **Docker**: parar y borrar contenedores, red, volumen e imágenes de la sección 1 (`docker compose down -v` desde `wenia-platform` cubre los tres primeros).
5. **Kind**: `kind delete cluster --name wenia-eks`.
6. **Local**: borrar `app.log` sin versionar y ramas locales ya mergeadas.
7. **Verificación final**: `gh repo list jh-platform-lab` muestra solo 2 repos; `docker ps -a`, `kind get clusters` y `aws sts get-caller-identity --profile wenia-reto` (debe fallar si la cuenta se cerró) lo confirman.

## 4. `onboarding-api` (decisión previa)

El correo de entrega enlaza este repo. Antes de borrarlo, copiar `app/`, `tests/`, `Dockerfile*`, `openapi.yaml`, `catalog-info.yaml` y el curl guardado a `wenia-platform/examples/onboarding-api/`, y actualizar la tabla de repos del `README.md`. Así el ejemplo de 6 endpoints sigue disponible.

## 5. Recrear desde cero

### 5.1 Cuenta y base de AWS

1. Crear la cuenta hija en Organizations y un perfil SSO `wenia-reto` (`aws configure sso`, región `us-east-1`).
2. `bash scripts/aws-login.sh` (se niega a seguir si apunta a management).
3. `cd infra/bootstrap && terraform init && terraform apply -var account_id=<id> -var alert_email=<correo>`. Crea el bucket de estado, el proveedor OIDC y el presupuesto. Los servicios generados usan ese bucket.
4. En cada servicio generado, el CD hace el primer `apply` con `-target=module.ecr -target=module.cd_role`, publica la imagen y luego aplica el resto.

### 5.2 GitHub

1. Organización `jh-platform-lab` con los dos repos.
2. Token fine-grained limitado a la organización (Contents, Administration, Workflows, Metadata: lectura y escritura) para `GITHUB_TOKEN`.
3. Entorno `production` y rol OIDC por servicio: los crea la plantilla, no hay que hacerlo a mano.
4. Publicar la imagen de Backstage: un merge a `main` que toque `backstage/**` ejecuta el job `image` y la sube a `ghcr.io/jh-platform-lab/backstage`.

### 5.3 Docker (Backstage en contenedor)

```bash
cd wenia-platform
cp .env.local.example .env.local      # completar POSTGRES_PASSWORD, GITHUB_TOKEN, NEW_RELIC_*
docker compose --profile app --profile autodeploy up -d
```

Abre http://localhost:3100 como invitado. El catálogo y las plantillas se leen desde GitHub (rama `main`), por eso la base de datos nueva no pierde nada. Puertos del caso: web 3100, backend 7100, Postgres 5442. `NEW_RELIC_ACCOUNT_ID` debe tener 7 dígitos.

Modo desarrollo (lee las plantillas de la carpeta local): `docker compose up -d postgres` y luego `cd backstage && yarn install && yarn start`.

### 5.4 Kind (simula EKS)

Dentro de un servicio con tipo Kubernetes: `bash scripts/kind-deploy.sh` (imagen local) o `bash scripts/kind-deploy.sh --ecr [tag]` (imagen de ECR). Crea el cluster `wenia-eks`, despliega y hace `curl /health`.

### 5.5 Servicios de demostración

Se regeneran desde Backstage con las plantillas (Create → plantilla → nombre nuevo). Los límites conocidos de cada una están en `docs/documento-tecnico.md` y en el `CHANGELOG.md` de `backstage-templates`.

### 5.6 Verificar

`bash scripts/verify.sh` y `bash scripts/check-env.sh`.

## 6. Límites declarados que siguen abiertos

- La CI de la plantilla Java falla en Trivy por CVE-2026-47884 (requiere Spring Boot 7); solución: migrar a Spring Boot 4.
- `update-service` está en 1.3.0 y puede degradar servicios generados con plantillas 1.6.x.
- `add-observability` abre un PR vacío si el servicio ya tiene observabilidad.
- La lista de equipos del formulario está duplicada en seis `template.yaml`; propuesta: selector conectado al catálogo.
- El menú de New Relic abre la lista de dashboards, no uno concreto.
- No hay EKS real: el tipo Kubernetes se verifica en Kind.
