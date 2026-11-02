# Uso de IA generativa

El caso permite usar IA si se documenta cómo. Este trabajo se hizo con **Claude Code** (Anthropic) como asistente de programación, dirigido por una persona.

## Quién hizo qué

| Quién | Qué |
|---|---|
| La persona | Define el alcance y el orden de trabajo, decide cada punto de diseño, revisa cada cambio, ejecuta lo que toca credenciales (login, `terraform apply`), valida en la interfaz y **fusiona cada pull request**. |
| El asistente | Propone el diseño con alternativas, escribe código, plantillas, Terraform, workflows y documentación, ejecuta las verificaciones locales y reporta el resultado, incluidos los fallos. |

## Cómo se trabajó

- **Una tarea por rama y por PR.** El asistente abre el PR con una descripción corta; la persona lo revisa y lo fusiona. Ninguna tarea nueva empieza antes de ese merge.
- **Las decisiones pasan por la persona**, con opciones y una recomendación, no se toman en silencio.
- **Se prueba antes de afirmar.** Cada resultado se marca como hecho, no verificado o requiere AWS (ver `evidence/README.md`).
- **Sin secretos ni datos ajenos.** Los tokens viven en `.env.local` (ignorado por git), no se imprimen ni se commitean. No se usó código privado de ningún empleador ni de terceros; los repos son públicos y se revisan con gitleaks en el CI.
- **Cuenta aislada.** Todo lo que toca la nube se limita a la cuenta AWS del reto, y se comprueba la identidad antes de cada escritura.

## Errores que la IA cometió y cómo se detectaron

Se documentan porque muestran por qué la revisión humana y las verificaciones no son opcionales.

| Error | Cómo se detectó | Qué se cambió |
|---|---|---|
| Un arreglo (login de invitado en el contenedor) quedó fuera de un PR y la imagen publicada daba pantalla en blanco | Al comprobar el contenido de `main` tras el merge | Se rescató en un PR aparte |
| Una acción de GitHub con una etiqueta inexistente rompió el CI | Falló el job `image` | Se fijaron versiones verificadas y se añadió una regla: solo acciones con runtime Node 24 |
| El agente de New Relic para Node detiene la app sin licencia (el de Python no) | Al ejecutar el servicio generado | Se activa solo si existe `NEW_RELIC_LICENSE_KEY` |
| Un comando de `kubectl` sin `--context` consultó el cluster activo de la máquina | Se vio la salida de error | Todos los scripts usan `--context` explícito |
| Un valor sensible apareció una vez en la salida de una herramienta | Revisión de la conversación | Era un token local de corta vida; no se volvió a mostrar |

## Qué no hace la IA aquí

No fusiona PRs, no aplica Terraform contra la nube sin que la persona lo ejecute, no decide el alcance ni sube credenciales.
