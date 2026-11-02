# Usar la plataforma

1. Entra a **Create** y elige la plantilla.
2. Completa nombre, lenguaje, equipo propietario, descripción, APIs y tipo (Lambda o K8S).
3. La plataforma valida la solicitud: nombre inválido o servicio duplicado se rechazan antes de crear nada.
4. Si algo falla a mitad de camino, se revierte lo creado (no quedan repos a medias).
5. Al terminar, abre el repositorio y el Component en el catálogo.

## Qué trae cada servicio

- Código base y pruebas unitarias.
- `Dockerfile` (y `Dockerfile.lambda` para Lambda).
- CI: pruebas, chequeos de seguridad e imagen. CD separado.
- Terraform y guía de New Relic.
- `README` con cómo desarrollar, verificar y operar.
