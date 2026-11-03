# Presentación: plataforma de autoservicio sobre Backstage

Versión en texto de la presentación (`index.html`). Cada sección es una diapositiva. Las imágenes salen de `evidence/`.

---

## 1. Un camino dorado para crear servicios

Autoservicio en Backstage: del formulario a un servicio listo, consistente y verificable.

| El problema | La solución |
|---|---|
| Habilitar un servicio toma días y pasa por solicitudes manuales | Un formulario valida y genera todo |
| Se copian configuraciones entre repos | Repo, catálogo, APIs, Docker, CI/CD, Terraform y documentación |
| Cada equipo lo hace distinto | Los errores se manejan y se pueden verificar |

---

## 2. Cómo encaja

```mermaid
flowchart LR
  D([Desarrollador]) --> B[Backstage<br/>formulario]
  B --> G[(GitHub<br/>repo nuevo)]
  G --> C[CI + CD<br/>Terraform]
  C --> E[ECR]
  E --> L[Lambda o Kubernetes]
  B -. lee .-> T[(backstage-templates<br/>9 plantillas)]
  B -. registra .-> K[(Catálogo<br/>Component + API)]
  B -. evento .-> N[New Relic]
```

- **Plantillas aparte:** viven en su propio repo para evolucionar sin tocar el portal.
- **Catálogo:** cada servicio queda registrado con su API OpenAPI y su documentación.
- **Observabilidad:** cada alta o fallo envía un evento a New Relic.

---

## 3. Qué hace Backstage al crear: cuatro pasos, con rollback

```mermaid
flowchart LR
  A["1. Verificar<br/>wenia:check-duplicate<br/>catálogo y GitHub"] --> B["2. Generar<br/>fetch:template<br/>skeleton + parámetros"]
  B --> C["3. Publicar<br/>publish:github<br/>repo en la organización"]
  C --> D["4. Registrar<br/>wenia:register-or-rollback<br/>Component + API"]
```

| El formulario valida | El proyecto generado trae |
|---|---|
| Nombre DNS, 3 a 40 caracteres | Dockerfile por caso |
| Equipo de una lista cerrada | CI y CD en GitHub Actions |
| Lenguaje y tipo (Lambda o Kubernetes) | Terraform, k8s y New Relic |
| APIs: nombre, método y ruta | TechDocs y OpenAPI |

---

## 4. Caso válido: servicio creado, repo y catálogo

![Tarea completada](../../evidence/local/01-valido-tarea-completada.png)
*Tarea con los cuatro pasos en verde.*

![Repo y catálogo](../../evidence/local/01-valido-repo-y-catalogo.png)
*El repo y la entidad registrada en el catálogo.*

---

## 5. Solicitudes inválidas y duplicadas: un error nunca se presenta como éxito

![Inválido](../../evidence/local/02-invalido-formulario-rechaza-Mi_Servicio.png)
*Inválido: `Mi_Servicio` lo rechaza el formulario y no corre ningún paso.*

![Duplicado](../../evidence/local/03-duplicado-rechazado.png)
*Duplicado: falla en el primer paso; no se crea nada.*

---

## 6. Fallo durante la generación: rollback dentro de la acción

```mermaid
flowchart LR
  A[Repo creado<br/>paso 3] --> B{Registro en el catálogo<br/>dryRun + alta}
  B -- OK --> C[Servicio y API registrados]
  B -- Falla --> D{¿Organización permitida,<br/>nombre válido y repo<br/>de menos de 15 min?}
  D -- Sí --> E[Borra el repo<br/>de esta tarea]
  D -- No --> F[No borra nada]
  E --> G[Tarea FALLIDA<br/>con ambos mensajes]
  F --> G
```

- **Tres guardas:** solo la organización permitida, el nombre pasa por la expresión regular y solo se borran repos creados hace menos de 15 minutos.
- **Por qué dentro de la acción:** los pasos del scaffolder no tienen "en caso de fallo". Si uno falla, los siguientes no corren; la compensación vive donde puede fallar.

---

## 7. Evidencia del rollback (verificado el 1 de noviembre)

![Log del rollback](../../evidence/local/04-falla-forzada-log-rollback.png)
*Pasos 1 a 3 en verde, registro en rojo y `repository deleted`.*

![Catálogo sin el servicio](../../evidence/local/04-falla-forzada-catalogo-sin-demo-rollback.png)
*El catálogo no contiene el servicio fallido.*

---

## 8. Re-verificado el 3 de noviembre, con el evento a New Relic

```
registration-failed   reason: "Request failed with 400 Bad Request"
rollback              repository: jh-platform-lab/demo-rollback2
                      outcome: "repository deleted"
newrelic-event        WeniaServiceRegistrationFailed  outcome: "sent"

Error: Registration failed (Request failed with 400 Bad Request).
       Rollback of jh-platform-lab/demo-rollback2: repository deleted
```

- **Comprobado por fuera:** GitHub responde 404 para el repo, el catálogo tiene 0 componentes con ese nombre y el evento de fallo llegó a New Relic.
- **Cómo se fuerza sin tocar producción:** se cambia `catalogInfoPath` a un archivo que no existe en la plantilla y se crea un servicio en modo desarrollo. Luego se revierte (ver `docs/guia-implementacion-local.md`, sección 7.1).

---

## 9. El repo generado: el CI valida, solo el CD toca la nube

| CI: cada PR y `main`, nunca publica | CD: solo `main`, entorno `production` |
|---|---|
| Pruebas unitarias y auditoría de dependencias | Autenticación OIDC, sin llaves |
| Gitleaks (secretos) | Terraform crea ECR y el rol de CD |
| Terraform: fmt, validate y checkov | Imagen con el SHA del commit como tag |
| Construcción de imágenes y análisis con Trivy | Lambda con Function URL, o Kubernetes en Kind |

```mermaid
flowchart LR
  P[push a main] --> T[Terraform<br/>ECR + rol]
  T --> I[Imagen<br/>tag = SHA]
  I --> Q{Tipo}
  Q -- lambda --> L[Función Lambda<br/>+ Function URL]
  Q -- k8s --> K[Kind local<br/>kind-deploy.sh --ecr]
```

---

## 10. AWS: lo que sí se desplegó

![Lambda](../../evidence/aws/10-lambda-demo-final4-consola.png)
*Función Lambda (paquete de imagen) creada por el CD.*

![ECR](../../evidence/aws/11-ecr-demo-final4-imagen.png)
*Imagen en ECR; el tag es el SHA del commit.*

```
$ curl https://<function-url>/health   {"status":"ok"}                -> HTTP 200
$ curl https://<function-url>/items    {"detail":"Not implemented"}   -> HTTP 501  (stub por diseño)
```

---

## 11. Observabilidad: cada alta y cada fallo llegan a New Relic

| Qué | Cómo |
|---|---|
| Alta de servicio | `WeniaServiceRegistered` |
| Fallo de registro | `WeniaServiceRegistrationFailed` |
| Dashboard | Como código (7 consultas NRQL) |
| Servicio (APM) | Agente; activo al correr con la licencia |

![New Relic](../../evidence/local/09-newrelic-datos.png)
*APM de un servicio generado con datos reales.*

El envío es de mejor esfuerzo: registrar el servicio es lo crítico y la observabilidad no puede tumbar un alta.

---

## 12. Verificación, límites y evolución

| Ámbito | Qué |
|---|---|
| **Local** | Ansible con segunda ejecución `changed=0`; pruebas y bandit; renderizado Python y Node; Terraform fmt, validate y checkov; imágenes; Kind con `/health` |
| **AWS** | Terraform apply, CD a ECR y Lambda, Function URL (`evidence/aws/`) |
| **Manual** | Los cuatro casos del scaffolder y New Relic con cuenta real |

**Límites, sin adornos**
- Kubernetes llega a la imagen y a Kind; no hay EKS.
- Go y Java: CD completo pendiente.
- S3 y SQS: validación estática, sin probar en AWS.

**Evolución**
- Anotación de versión en cada servicio.
- La plantilla "Actualizar servicio" abre un PR con el diff.
- Qué medir: tiempo hasta el primer despliegue y solicitudes fallidas.

Todo se verifica con un comando: `bash scripts/verify.sh --kind`.
