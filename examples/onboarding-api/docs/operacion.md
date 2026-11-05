# Operación y CI/CD

## Qué hace cada workflow

| Workflow | Cuándo corre | Qué hace | Publica |
|---|---|---|---|
| `ci.yml` | En cada pull request y en `main` | pruebas (pytest), bandit, pip-audit, Terraform (fmt, validate) y checkov, gitleaks, y la imagen con Trivy | No |
| `cd.yml` | Solo al fusionar en `main` | Construye la imagen, la sube a ECR y actualiza el despliegue | Sí (requiere AWS) |

El CI nunca toca la nube. Solo el CD usa credenciales, con OIDC y el entorno `production`.

## Primer despliegue (una sola vez)

1. En `terraform/`: `terraform init && terraform apply`. Crea el repositorio ECR y el rol de CD.
2. En GitHub, **Settings → Secrets and variables → Actions → Variables**: crea `AWS_ROLE_ARN` con el valor de `terraform output cd_role_arn`.
3. Haz push a `main`. El CD construye y publica la imagen.
4. En Lambda: `terraform apply -var image_uri=<url ECR>:<sha>` crea la función y su URL pública.

## Operación diaria

| Tarea | Cómo |
|---|---|
| Ver si el servicio responde | `curl <url>/health` |
| Ver logs | Lambda: CloudWatch `/aws/lambda/onboarding-api`. Kubernetes: `kubectl logs` con el contexto del cluster |
| Desplegar una versión | Fusionar en `main`; el CD publica la imagen con el SHA del commit |
| Revertir | Volver a desplegar la imagen anterior por su SHA de ECR (las etiquetas son inmutables) |

## Kubernetes: qué se verifica hoy y qué falta

| Ambiente | Qué pasa | Dónde se ve |
|---|---|---|
| Local | `bash scripts/kind-deploy.sh` despliega en un cluster Kind y prueba `/health` | Tu máquina |
| CI (cada PR y `main`) | El job `kind` hace lo mismo dentro del runner, con un cluster temporal | Pestaña Actions |
| CD | Crea ECR y publica la imagen; el despliegue a EKS es un marcador | Pestaña Actions |

**Siguiente paso:** crear un cluster EKS, añadir al CD el `kubectl set image` con el SHA de la imagen y el entorno `production`. Un cluster en la nube no es accesible desde un Kind local, por eso el CD no despliega en Kind.
