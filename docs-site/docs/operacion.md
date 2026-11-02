# Operación

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El login con GitHub falla | Faltan `AUTH_GITHUB_CLIENT_ID/SECRET` en el contenedor | Recrear con `docker compose --profile app up -d` |
| Una plantilla no aparece | El catálogo lee las plantillas de `main` | Esperar el refresco o forzarlo desde el catálogo |
| La creación falla a mitad | Token sin permisos o repo duplicado | Revisar el log de la tarea en `/create/tasks` |

La imagen del portal se actualiza sola con Watchtower cuando el CI publica una nueva.
