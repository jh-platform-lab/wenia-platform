# Evidencia

Cada requisito de verificación del reto, con el archivo que lo respalda y **dónde se ejecutó**.
Lo local no usa credenciales ni AWS. Lo que corrió en AWS está en `aws/` y se marca aparte. `verify.sh` solo cubre lo local.

Para repetir lo local: `bash scripts/verify.sh` (agrega `--kind` para el despliegue en Kind y `--save` para guardar el resultado).

| Requisito | Evidencia | Dónde | Estado |
|---|---|---|---|
| Solicitud inválida (nombre `Mi_Servicio`) | `local/02-invalido-formulario-rechaza-Mi_Servicio.png` | Local (Backstage) | Hecho |
| Fallo durante la generación y rollback | `local/04-falla-forzada-log-rollback.png`, `local/04-falla-forzada-catalogo-sin-demo-rollback.png` | Local (Backstage + GitHub) | Hecho |
| Creación válida | `local/01-valido-tarea-completada.png`, `local/01-valido-repo-y-catalogo.png`, `local/01-valido-catalogo.png`. CI en verde. `local/01-valido-cd-sin-aws.png` es el CD de aquella corrida, antes de tener AWS (falló en `configure-aws-credentials` por falta de `AWS_ROLE_ARN`); el CD con AWS está en `aws/` | Local (Backstage + GitHub) | Hecho |
| Nombre duplicado | `local/03-duplicado-rechazado.png`: falla en "Verificar que el nombre no exista" con "A component named demo-valido-py already exists in the catalog"; los pasos siguientes se saltan | Local (Backstage + GitHub) | Hecho |
| Pruebas de la API (≥5 endpoints) | `local/05-onboarding-api-curl.txt`, `local/08-verify.txt` | Local | Hecho |
| Validación estática de Terraform | `local/08-verify.txt` (fmt, init, validate, checkov) | Local | Hecho |
| Ansible, segunda ejecución con `changed=0` | `local/06-ansible-segunda-ejecucion.txt`, `local/08-verify.txt` | Local | Hecho |
| Tipo K8S desplegado | `local/07-k8s-kind.txt`, `local/08-verify.txt` | Local (Kind, sin EKS) | Hecho |
| Terraform `apply` de ECR, rol de CD y Lambda | `aws/10-*`, `aws/11-*`: función `demo-final4` y repositorio ECR creados por el CD (run `41494631023`) | **AWS** (cuenta `875062865815`) | Hecho |
| CD publica en ECR y actualiza la Lambda | `aws/11-*`: la imagen lleva el SHA del commit y su digest coincide con el "Resolved Image URI" de la función (`aws/10-*`) | **AWS** | Hecho |
| Function URL responde | `aws/15-curl-function-url.txt`: `/health` devuelve 200; `/items` devuelve 501 (endpoint de ejemplo sin implementar, por diseño) | **AWS** | Hecho |
| Servicio y API en el catálogo, con TechDocs | `aws/12-*`, `aws/13-*`, `aws/14-*` | Local (Backstage) sobre el servicio desplegado | Hecho |
| New Relic con datos reales | `local/09-newrelic-datos.png`: app `demo-node-2` en APM con throughput, tiempo de respuesta y errores. Agente conectado al colector desde Kind | Local (Kind) + cuenta real de New Relic | Hecho |

Los casos del scaffolder (válido, inválido, duplicado, fallo) se ejecutan en la interfaz de Backstage con credenciales de GitHub, por eso `verify.sh` no los automatiza y los lista como manuales.

Las capturas `local/01-*` y `local/03-*` muestran `demo-valido-py`, un servicio de prueba que se eliminó después de capturar la evidencia: su repositorio y su entrada de catálogo ya no existen. Para repetir el caso, crea un servicio nuevo con la plantilla y vuelve a lanzarlo con el mismo nombre.
