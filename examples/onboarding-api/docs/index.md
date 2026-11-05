# onboarding-api

API de onboarding de servicios para la plataforma

| | |
|---|---|
| Propietario | `platform-team` |
| Tipo de servicio | `lambda` |
| Lenguaje | Python 3.12 (FastAPI) |
| Versión de la plantilla | `1.6.6` |
| Repositorio | `jh-platform-lab/onboarding-api` |

## Qué incluye este servicio

- Una API con `/health` y las rutas del formulario (FastAPI).
- Dockerfile para Kubernetes y Dockerfile para Lambda.
- CI en cada pull request y CD al fusionar en `main`.
- Terraform para el repositorio ECR, el rol de despliegue (OIDC) y, en Lambda, la función.
- Alertas y dashboard de New Relic como código.

## Rutas de la API

| Método | Ruta | Operación | Estado |
|---|---|---|---|
| GET | `/health` | `health` | Implementada |
| GET | `/health` | `health` | 501 hasta implementar |
| GET | `/services` | `list-services` | 501 hasta implementar |
| POST | `/services` | `create-service` | 501 hasta implementar |
| GET | `/services/{name}` | `get-service` | 501 hasta implementar |
| DELETE | `/services/{name}` | `delete-service` | 501 hasta implementar |
| GET | `/services/{name}/status` | `service-status` | 501 hasta implementar |
