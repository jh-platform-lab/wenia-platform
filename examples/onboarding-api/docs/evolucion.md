# Evolución de la plantilla

Este servicio se creó con la versión `1.6.6` de la plantilla `python-service`.

## Cómo se sabe si está desactualizado

`catalog-info.yaml` guarda la anotación `wenia.io/template-version`. Cuando la plantilla cambia de versión, esa anotación permite identificar los servicios atrasados.

## Cómo se actualiza

- **Cambios compatibles** (un arreglo de CI, una dependencia): la plantilla publica una versión menor y los servicios existentes la adoptan con el formulario **Actualizar servicio**, que abre un pull request con el diff.
- **Cambios incompatibles** (otro modelo de despliegue): versión mayor; se avisa a los equipos y se mantiene la versión anterior durante un plazo.

Los cambios de la plantilla están en el `CHANGELOG.md` de `backstage-templates`.
