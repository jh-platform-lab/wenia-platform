# Sustentación — preguntas probables y cambios en vivo

**Estado:** documento vivo. Se agrega una sección cada vez que se implementa algo. Al final se completa con el guion del video y el ensayo de cambios en vivo.

**Rutas abreviadas:** `SK` = `Repos/backstage-templates/templates/python-service/skeleton/` · `TPL` = `Repos/backstage-templates/templates/python-service/template.yaml` · `APP` = `Repos/wenia-platform/backstage/app-config.yaml`.

---

## 1. Formulario y validación (`TPL`, bloque `parameters`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Dónde se valida una solicitud inválida? | En el formulario, con JSON Schema, antes de ejecutar ningún paso. Si falla, no se crea nada. | `TPL`: `pattern`, `enum`, `minItems` |
| ¿Cómo se ve el rechazo de un nombre inválido? **Verificado (2026-11-01).** | Con `Mi_Servicio` y el resto completo, el campo se pone en rojo y el formulario no avanza: `must match pattern "^[a-z][a-z0-9-]{1,38}[a-z0-9]$"`. Orden de capas: 1) campos obligatorios vacíos (navegador, aparece primero); 2) esquema (patrón, enum, longitud); 3) paso `check-duplicate` en el backend. Lección: con campos vacíos solo se ve el aviso nativo, no el del patrón. | `TPL`: `name.pattern`; evidencia: captura del formulario |
| ¿Por qué el nombre es una regex y no texto libre? | El nombre acaba en un repo, una ruta de catálogo, una imagen y un recurso de AWS. Formato DNS evita inyección y colisiones. | `TPL`: `name.pattern` |
| ¿Por qué el equipo es una lista cerrada? | Debe existir como `Group` en el catálogo; si no, el `owner` queda huérfano. | `TPL`: `owner.enum`, `catalog/org.yaml` |
| ¿Qué pasa si hay dos APIs con la misma ruta (p. ej. `GET` y `POST /services`)? **Corregido y verificado (2026-11-01, PR #3).** | La primera versión repetía la clave `/services:` en `openapi.yaml` (YAML inválido); se vio al generar `onboarding-api`. Ahora `groupby('path')` agrupa los métodos bajo una sola clave. | `SK/openapi.yaml`: `groupby('path')` |
| ¿Y las rutas con parámetro, como `/services/{name}`? **Corregido y verificado (PR #3).** | Antes la función no recibía `name` y el OpenAPI no tenía `parameters`. Ahora se extraen los `{param}` de la ruta: `def get_service(name: str, )` y `parameters` por ruta. Lección: en Nunjucks los métodos son los de JavaScript (`startsWith`, no `startswith`); se detectó al probar el render. Límite: un `{user-id}` con guion daría un identificador Python inválido. | `SK/app/main.py`, `SK/openapi.yaml` |
| ¿Y dos APIs con el mismo `name`? | La segunda función pisa a la primera en `main.py`. Misma salida: validar unicidad. | `SK/app/main.py` |

## 2. Skeleton y renderizado (`SK`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Cómo se convierte el formulario en código? | `fetch:template` renderiza el skeleton con Nunjucks. Un bucle `for` recorre la lista `apis` y emite una ruta por entrada. | `SK/app/main.py`, `SK/openapi.yaml` |
| ¿Por qué las rutas generadas responden 501? | El stub es honesto: la ruta existe y está en el contrato, pero sin implementar. Contrato y código quedan alineados desde el primer commit. | `SK/app/main.py` |
| ¿Por qué `replace('-', '_')` en el nombre de la función? | `get-items` no es un identificador válido de Python. | `SK/app/main.py` |
| ¿Qué hace `\| dump` en la descripción? | Escapa el valor como cadena JSON. Sin él, comillas en Python o `:` en YAML rompen el archivo generado. Es el control contra inyección por campos libres; `name` y las rutas no lo necesitan porque su regex ya limita los caracteres. **Pendiente de verificar al generar el primer servicio.** | `SK/app/main.py`, `SK/openapi.yaml`, `SK/catalog-info.yaml` |
| ¿Por qué no se prueba el skeleton "en crudo"? | Contiene sintaxis Nunjucks; no es Python válido hasta renderizarse. Se prueba el servicio generado (`onboarding-api`). | `SK/tests/test_health.py` |
| ¿Cómo se versiona la plantilla? | `templateVersion` va como anotación `wenia.io/template-version` en el catálogo; permite consultar qué servicios usan qué versión. | `SK/catalog-info.yaml`, `TPL`: `values` |
| ¿Por qué Component y API en el mismo archivo? | Un solo `catalog:register` los registra y `providesApis` los enlaza. | `SK/catalog-info.yaml` |
| ¿Por qué `owner` sin prefijo `group:`? | Backstage lo interpreta como `group:default/<valor>`. | `SK/catalog-info.yaml` |

## 3. Dependencias y cadena de suministro (`SK/requirements*.txt`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué versiones fijadas con `==`? | Builds reproducibles y escaneos con sentido. Con rangos, el mismo commit instalaría cosas distintas. | `SK/requirements.txt` |
| ¿Por qué dos archivos? | Pytest, bandit y pip-audit son del CI y no entran en la imagen: menos superficie y tamaño. | `SK/requirements-dev.txt`, `SK/.dockerignore` |
| ¿Qué encontró `pip-audit`? | 7 vulnerabilidades en `starlette 0.38.6`, traída **transitivamente** por `fastapi==0.115.0` (la limitaba a `<0.39`). Se resolvió subiendo `fastapi` a 0.162.0 (starlette 1.10.0). Luego, 1 en `pytest 8.3.3`, corregida con 9.0.3. | `SK/requirements.txt` |
| ¿Por qué importa que fuera transitiva? | No aparecía en los requirements; solo la detecta el escaneo. Es la razón de que `pip-audit` sea compuerta del CI. | CI (pendiente) |
| ¿Por qué se corrige también la de `pytest`, si es de desarrollo? | Una compuerta con excepciones "porque es dev" pierde valor. Si no hubiera parche: `--ignore-vuln` explícito y documentado, no apagar el escaneo. | `SK/requirements-dev.txt` |
| ¿Contra qué Python se auditó? | Contra `python:3.12-slim` en Docker, el mismo de producción. El venv local usaba 3.15 y no habría sido representativo. | — |
| ¿Qué cambia al saltar `newrelic` de 10.2 a 14.2? | Salto de varias mayores: revisar `newrelic.ini` y el comando `newrelic-admin` al configurar el agente. | pendiente |

## 4. Contenedores (`SK/Dockerfile`, `SK/Dockerfile.lambda`, `SK/.dockerignore`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué `slim` y no `alpine`? | Alpine usa musl y varias dependencias (uvloop, pydantic-core, newrelic) no tienen wheels para musl: obliga a compilar y la imagen sale frágil. Slim trae glibc con wheels precompilados. | `Dockerfile`: `FROM` |
| ¿Por qué se copia `requirements.txt` antes que el código? | La capa de dependencias se reutiliza mientras no cambien las versiones; solo se reconstruye la del código. | `Dockerfile`: `COPY requirements.txt` |
| ¿Por qué usuario no root? | Si explotan la app no obtienen root en el contenedor; EKS puede exigir `runAsNonRoot`. UID fijo para poder verificarlo. | `Dockerfile`: `USER appuser` |
| ¿Por qué el `HEALTHCHECK` usa Python y no curl? | `slim` no trae curl; `urllib` es de la librería estándar. En Kubernetes la salud real la definen las probes. | `Dockerfile`: `HEALTHCHECK` |
| ¿Por qué `CMD` en forma de lista? | Uvicorn queda como PID 1 y recibe SIGTERM directo: cierre ordenado del pod. | `Dockerfile`: `CMD` |
| ¿Por qué imagen de contenedor para Lambda y no zip? | El caso pide un Dockerfile por tipo y la imagen reutiliza el mismo build y escaneo. Costo: arranque en frío algo mayor. | `Dockerfile.lambda` |
| ¿Por qué la base de AWS y no `slim`? | Trae el Runtime Interface Client, que habla con el servicio Lambda. | `Dockerfile.lambda`: `FROM` |
| ¿Qué hace Mangum y `lifespan="off"`? | Traduce el evento de la Function URL a una petición ASGI. Lambda no ejecuta los eventos de arranque y cierre, y sin `off` hay errores en cada invocación. | `SK/app/main.py`: `handler` |
| ¿Qué pasa con la arquitectura? | La imagen debe coincidir con la de la función. Construida en un Mac Apple Silicon es arm64 y fallaría en una función x86_64. Se fija en Terraform y en `ci.yml`. | pendiente |
| ¿Por qué el `.dockerignore`? | Acelera el build y evita que tests, workflows, `.env` o historial de git entren en una capa. | `SK/.dockerignore` |
| ¿La imagen base tiene vulnerabilidades? | El editor reportó 2 altas en `python:3.12-slim` (análisis de Docker). Pendiente de revisar con el escáner de imagen del CI; mitigación habitual: fijar digest y reconstruir con la base actualizada. | `Dockerfile`: `FROM` |

## 4b. Pruebas (`SK/tests`, `SK/pytest.ini`, `SK/app/__init__.py`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué solo se prueba `/health` en el skeleton? | Es la única ruta fija; las demás las genera el formulario. Los tests de endpoints reales se escriben en `onboarding-api`. | `SK/tests/test_health.py` |
| ¿Qué hace `pythonpath = .` en `pytest.ini`? | Hace que pytest encuentre el paquete `app/` desde la raíz del servicio, sin depender de desde dónde se ejecute. | `SK/pytest.ini` |
| ¿Para qué un `__init__.py` vacío? | Convierte `app` en paquete: el mismo `app.main` se importa igual en pytest, en uvicorn y en Lambda. | `SK/app/__init__.py` |
| ¿Por qué `TestClient` y no levantar el servidor? | Llama a la app en memoria, sin puertos; es rápido y estable en CI. Requiere `httpx`. | `SK/tests/test_health.py` |

### Inventario del skeleton

| Archivo | Para qué sirve | Sección |
|---|---|---|
| `catalog-info.yaml` | Registra Component y API en el catálogo | 2 |
| `openapi.yaml` | Contrato generado desde el formulario | 1 y 2 |
| `app/main.py` | App FastAPI con rutas generadas y `handler` de Lambda | 2 y 4 |
| `app/__init__.py` | Marca `app` como paquete | 4b |
| `requirements.txt` / `requirements-dev.txt` | Dependencias de producción y de CI | 3 |
| `Dockerfile` / `Dockerfile.lambda` / `.dockerignore` | Imágenes para Kubernetes y Lambda | 4 |
| `pytest.ini` / `tests/test_health.py` | Prueba mínima | 4b |
| `.github/workflows/ci.yml` / `cd.yml` | Validación en PR y despliegue en `main` | 4c |
| `deploy/service-type` | Indica al CD si es `lambda` o `k8s` | 4c |
| `backend/.../wenia-actions/` (en `wenia-platform`) | Acción propia `wenia:check-duplicate` | 4d |
| Pendiente: `terraform/`, `newrelic.ini`, `README.md`, `.gitignore` | Infraestructura, observabilidad, documentación operativa | — |

## 4c. CI/CD (`SK/.github/workflows/ci.yml`, `cd.yml`, `SK/deploy/service-type`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué CI y CD son workflows separados? | CI valida en cada PR con solo `contents: read` y sin acceso a AWS. CD corre solo en `main` y es el único con `id-token: write`. Mínimo privilegio por workflow. | `ci.yml`, `cd.yml`: `permissions` |
| ¿Qué valida el CI? | Pruebas (pytest), análisis estático (bandit), dependencias (pip-audit), secretos (gitleaks) y que ambas imágenes construyan, con escaneo de la imagen (Trivy). | `ci.yml` |
| ¿Por qué `${{ }}` de GitHub no choca con Nunjucks? | Choca: es la misma sintaxis. Se evita con `copyWithoutTemplating: .github/workflows/*`, así Backstage copia los workflows sin interpretarlos. Por eso no reciben valores del formulario. **Lección:** la primera versión usaba `copyWithoutRender`, que en esta versión de Backstage está en el esquema pero **el manejador lo ignora**; solo se detectó al generar un servicio real (las expresiones salieron vacías). Se confirmó leyendo el código instalado de `plugin-scaffolder-backend`. | `TPL`: paso `fetch` |
| ¿Qué demostró la primera generación real (`demo-check`)? | Que `dump` escapa bien la descripción (comillas y `:`), que el bucle genera las rutas y el contrato, y que el catálogo registra Component y API. También destapó el fallo de `copyWithoutRender` y dos límites: la ruta `/items/{id}` genera una función sin parámetro `id` y un `openapi.yaml` sin la sección `parameters`. | repo `jh-platform-lab/demo-check` |
| ¿Cómo sabe el CD si es Lambda o Kubernetes? | Lee `deploy/service-type`, un archivo mínimo que sí se renderiza con `serviceType`. Evita variables de repo que habría que crear a mano. | `SK/deploy/service-type`, `cd.yml`: paso `kind` |
| ¿Cómo se autentica el CD contra AWS? | OIDC: asume un rol con un token de corta vida; no hay llaves guardadas. La confianza del rol debe limitarse al repo y al entorno (`repo:jh-platform-lab/<servicio>:environment:production`), no a toda la organización. | `cd.yml`: `configure-aws-credentials` |
| ¿Para qué `environment: production`? | Permite exigir aprobación manual antes de desplegar (reviewers en el repo). | `cd.yml` |
| ¿Por qué la imagen se etiqueta con el SHA y no `latest`? | Cada despliegue es trazable y reversible a un commit exacto. | `cd.yml`: `IMAGE` |
| ¿Por qué Trivy usa `ignore-unfixed`? | Ignora vulnerabilidades sin parche, para que el CI no falle por algo que nadie puede arreglar. Es lo esperable con las 2 altas de la base `slim`. Se vigilan reconstruyendo con la base actualizada. | `ci.yml`: paso Trivy |
| ¿Por qué Gitleaks por Docker y no la acción oficial? | La acción oficial exige licencia en repos de una organización. | `ci.yml`: job `secrets` |
| ¿Por qué `fetch-depth: 0` en el job de secretos? | Gitleaks revisa todo el historial, no solo el último commit; un secreto borrado después sigue en el historial. | `ci.yml` |
| ¿Qué falta en el CD? | (1) El despliegue a Kubernetes es un stub hasta tener EKS. (2) Asume que ya existen el repositorio ECR y la función Lambda. (3) Una Lambda de imagen necesita una imagen inicial para crearse: huevo y gallina, que se resuelve en `terraform/` (imagen de arranque con `ignore_changes` sobre `image_uri`). | `cd.yml`, `terraform/` (pendiente) |
| ¿Qué versiones de acciones se usan y por qué? | Etiquetas (`@v4`, `@v5`, `@v0.36.0`) para el reto. En producción se fijarían por SHA del commit, porque una etiqueta puede moverse (riesgo de cadena de suministro). **Lección:** la primera versión usaba `trivy-action@0.28.0`, que no existe (las etiquetas actuales llevan prefijo `v`); el job `image` falló en "Set up job" con `unable to find version`. Se detectó en la primera ejecución real del CI y se confirmó consultando las etiquetas del repositorio de la acción. | `ci.yml`, `cd.yml` |
| ¿Qué resultado dio el primer CI real (`demo-check2`)? | Pasaron `test` (pytest, bandit, pip-audit) y `secrets` (gitleaks) sobre un servicio generado. Falló `image` por la etiqueta de Trivy, ya corregida. El CD falló como se esperaba: aún no hay rol OIDC ni ECR. | repo `jh-platform-lab/demo-check2` |

## 4d. Acción propia `wenia:check-duplicate` (`BE` = `Repos/wenia-platform/backstage/packages/backend/src/`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Qué hace y por qué existe? | Es el paso 1 de la plantilla. Falla si el nombre ya existe en el catálogo o en GitHub, antes de crear nada. Cubre el caso "nombre duplicado" del reto. | `BE/modules/wenia-actions/checkDuplicate.ts`, `TPL`: paso `check-duplicate` |
| ¿Por qué revisa catálogo **y** GitHub? | Un repo puede existir sin estar registrado, y un componente registrado puede apuntar a un repo borrado. Con una sola fuente quedan huecos. | `checkDuplicate.ts` |
| ¿Qué pasa si GitHub no responde 200 ni 404? | La acción **falla cerrada**: bloquea la creación en vez de dejarla pasar. Es preferible rechazar una solicitud válida que duplicar un repo por no poder verificar (límite de peticiones, caída, token vencido). | `checkDuplicate.ts` |
| Si el formulario ya valida el nombre, ¿por qué la acción vuelve a validarlo? | Una acción no debe confiar en quien la invoca: otra plantilla o una llamada directa podrían pasarle un nombre sin validar, y se interpola en una URL. Defensa en profundidad. | `checkDuplicate.ts`: `NAME_PATTERN` |
| ¿Con qué identidad consulta el catálogo? | Con las credenciales del solicitante (`getInitiatorCredentials`), no con un acceso total del servicio. | `checkDuplicate.ts` |
| ¿Cómo se registra la acción en Backstage? | Un módulo del backend (`createBackendModule`, plugin `scaffolder`) que añade la acción mediante el punto de extensión `scaffolderActionsExtensionPoint`. | `BE/modules/wenia-actions/index.ts`, `BE/index.ts` |
| ¿De dónde sale el token de GitHub? | De `integrations.github` en la configuración, que lee `GITHUB_TOKEN` del entorno (`.env.local`, ignorado por git). Es un PAT fine-grained limitado a la organización, de 7 días. | `app-config.yaml`, `.env.local.example` |
| ¿Qué límite tiene? | Dos creaciones simultáneas del mismo nombre podrían pasar ambas la verificación; `publish:github` fallaría en la segunda, pero tarde. Es una condición de carrera conocida, no cubierta. | — |
| ¿Cómo compruebas que está instalada? | `/create/actions` la lista con sus dos parámetros, y el log del scaffolder la incluye al arrancar. | — |

## 4e. Compensación: `wenia:register-or-rollback` (`BE/modules/wenia-actions/registerOrRollback.ts`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Qué problema resuelve? | Si el registro en el catálogo falla **después** de publicar el repo, quedaría un repositorio huérfano y un "éxito" parcial. La acción borra el repo creado por esa tarea y deja la tarea **fallida**. | `registerOrRollback.ts`, `TPL`: paso `register` |
| ¿Por qué una sola acción en vez de un paso de rollback aparte? | Los pasos del scaffolder no tienen "on failure" ni `continueOnError` (se comprobó en el código instalado): si un paso falla, los siguientes no corren. La compensación debe vivir dentro de la acción que puede fallar. | `TPL` |
| ¿Cómo se detecta el fallo de registro? | Primero un `dryRun` de `addLocation`, que valida el `catalog-info.yaml` y devuelve las entidades (un alta real no las devuelve). Si pasa, se hace el alta real. | `registerOrRollback.ts` |
| ¿Cómo evita borrar el repo equivocado? | Tres guardas: solo la organización `jh-platform-lab`; el nombre pasa por la regex; y solo si el repo se creó hace menos de 15 minutos. Un repo antiguo nunca se borra. Responde al riesgo "rollback borra el repo equivocado" del modelo de amenazas. | `registerOrRollback.ts`: `deleteCreatedRepo` |
| ¿Y si falla el propio rollback? | Se registra el motivo y la tarea falla con ambos mensajes (fallo de registro + resultado del rollback), para que quede claro si hay un huérfano que limpiar a mano. | `registerOrRollback.ts` |
| ¿Cómo se fuerza la falla para la evidencia? | Sin ganchos de prueba en el código de producción: se cambia temporalmente `catalogInfoPath` a un archivo que no existe y se genera un servicio. El `dryRun` falla, se borra el repo y la tarea queda roja. Luego se revierte el cambio. | `TPL`: `catalogInfoPath` |
| ¿Qué evidencia se muestra? **Verificado (2026-11-01, `demo-rollback`).** | Tarea fallida: pasos 1–3 en verde y `register` en rojo con `Registration failed (Request failed with 400 Bad Request). Rollback of jh-platform-lab/demo-rollback: repository deleted`. Comprobado por fuera: la API de GitHub responde 404 para el repo y la org solo conserva los demás. El catálogo (`/catalog`, Kind Component) lista solo `demo-check` y `demo-check2`: no hay entidad `demo-rollback`. | captura del log, `registerOrRollback.ts:99` |
| ¿Qué límite tiene? | Borrar el repo requiere el permiso de administración del token (más alcance del deseable). En producción sería una GitHub App con permisos acotados. También quedan fuera fallos posteriores al registro (no hay más pasos). | `.env.local.example` |

## 5. Backstage y catálogo (`APP`, `TPL`)

| Pregunta | Respuesta corta | Referencia |
|---|---|---|
| ¿Por qué `Template` en la regla global del catálogo? | La regla por ubicación no bastó (el catálogo rechazaba la plantilla al refrescarla). La global es más laxa; en producción se restringiría a ubicaciones concretas. | `APP`: `catalog.rules` |
| ¿Por qué un repo central de plantillas? | Versionado, changelog y, en EKS, ubicaciones `type: url` (las rutas `file:` no existen dentro de la imagen). | `Repos/backstage-templates` |
| ¿Por qué puertos 3100/7100/5442? | Los estándar los usa otro Backstage local del usuario. | `APP`: `app.baseUrl`, `backend.listen` |
| ¿Por qué `host: 127.0.0.1` en el backend? | No escucha en la red local. | `APP`: `backend.listen.host` |
| ¿Qué acciones propias tiene la plantilla? | `wenia:check-duplicate` (paso 1) y `wenia:register-or-rollback` (paso 4). Ver secciones 4d y 4e. | `TPL`: `steps` |

## 6. Cambios en vivo para practicar

| # | Cambio | Dónde |
|---|---|---|
| 1 | Agregar un campo `tier` (enum) al formulario y mostrarlo en el catálogo | `TPL`, `SK/catalog-info.yaml` |
| 2 | Que la ruta acepte parámetros (`/items/{id}`): el stub debe recibir el argumento | `SK/app/main.py` |
| 3 | Rechazar rutas o nombres de API repetidos | `TPL` (esquema) |
| 4 | Cambiar la versión de Python (3.12 a 3.13) y verificar auditoría y pruebas | `SK/Dockerfile*`, `SK/requirements*` |
| 5 | Añadir un endpoint `/version` fijo al skeleton | `SK/app/main.py`, `SK/openapi.yaml` |
| 6 | Cambiar un equipo propietario o añadir uno nuevo | `TPL`, `catalog/org.yaml` |
| 7 | Hacer que un servicio `k8s` no genere `Dockerfile.lambda` | `TPL` (segundo `fetch:template` con `if`) |

## 7. Pendientes de este documento

- CI/CD, Terraform, Ansible, New Relic, `wenia:check-duplicate`, rollback y `verify.sh`: se agregan al implementarse.
- Guion del video (≤10 min) y orden de la demostración.
- Ensayar los cambios en vivo con cronómetro.
