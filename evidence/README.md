# Evidencia

Cada requisito de verificación del reto, con el archivo que lo respalda y **dónde se ejecutó**.
Lo local no usa credenciales ni AWS. Lo que requiere AWS se marca aparte y no se da por probado.

Para repetir lo local: `bash scripts/verify.sh` (agrega `--kind` para el despliegue en Kind y `--save` para guardar el resultado).

| Requisito | Evidencia | Dónde | Estado |
|---|---|---|---|
| Solicitud inválida (nombre `Mi_Servicio`) | `local/02-invalido-formulario-rechaza-Mi_Servicio.png` | Local (Backstage) | Hecho |
| Fallo durante la generación y rollback | `local/04-falla-forzada-log-rollback.png`, `local/04-falla-forzada-catalogo-sin-demo-rollback.png` | Local (Backstage + GitHub) | Hecho |
| Creación válida | `local/01-valido-tarea-completada.png`, `local/01-valido-repo-y-catalogo.png`, `local/01-valido-catalogo.png`. CI en verde; el CD falla en `configure-aws-credentials` porque no hay `AWS_ROLE_ARN` (`local/01-valido-cd-sin-aws.png`, esperado sin AWS) | Local (Backstage + GitHub) | Hecho (CI); CD requiere AWS |
| Nombre duplicado | `local/03-duplicado-rechazado.png`: falla en "Verificar que el nombre no exista" con "A component named demo-valido-py already exists in the catalog"; los pasos siguientes se saltan | Local (Backstage + GitHub) | Hecho |
| Pruebas de la API (≥5 endpoints) | `local/05-onboarding-api-curl.txt`, `local/08-verify.txt` | Local | Hecho |
| Validación estática de Terraform | `local/08-verify.txt` (fmt, init, validate, checkov) | Local | Hecho |
| Ansible, segunda ejecución con `changed=0` | `local/06-ansible-segunda-ejecucion.txt`, `local/08-verify.txt` | Local | Hecho |
| Tipo K8S desplegado | `local/07-k8s-kind.txt`, `local/08-verify.txt` | Local (Kind, sin EKS) | Hecho |
| Terraform `apply` de ECR, OIDC y Lambda | `aws/` | **Requiere AWS** | Pendiente |
| CD publica en ECR y actualiza la Lambda | `aws/` | **Requiere AWS** | Pendiente |
| Function URL responde | `aws/` | **Requiere AWS** | Pendiente |
| New Relic con datos reales | `local/09-newrelic-datos.png`: app `demo-node-2` en APM con throughput, tiempo de respuesta y errores. Agente conectado al colector desde Kind | Local (Kind) + cuenta real de New Relic | Hecho |

Los casos del scaffolder (válido, inválido, duplicado, fallo) se ejecutan en la interfaz de Backstage con credenciales de GitHub, por eso `verify.sh` no los automatiza y los lista como manuales.
