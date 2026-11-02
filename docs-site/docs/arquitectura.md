# Arquitectura

- **Backstage** corre en contenedor junto a Postgres. La imagen se publica en GHCR desde CI.
- **Plantillas** en el repo `backstage-templates`: una carpeta por plantilla.
- **Acciones propias** del scaffolder: `wenia:check-duplicate` y `wenia:register-or-rollback`.
- **AWS**: estado de Terraform en S3, proveedor OIDC de GitHub, presupuesto de alerta.
- **Observabilidad**: New Relic (APM y alertas versionadas).

El **Catalog Graph** muestra cómo se relacionan el portal, las plantillas y sus dependencias.
