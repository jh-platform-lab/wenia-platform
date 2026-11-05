# Observabilidad

## Qué mirar

| Señal | Dónde | Qué indica |
|---|---|---|
| Salud | `GET /health` | El proceso responde |
| Errores 5xx | New Relic o CloudWatch | Fallos de la aplicación |
| Latencia (p95) | New Relic | La promesa del servicio |
| Saturación | CPU y memoria del Deployment o de la función | Si hay que escalar |

## New Relic

El agente de Python se activa en Kubernetes con `newrelic.ini` y la licencia desde el Secret `newrelic`. Sin licencia el servicio arranca igual y el agente queda desactivado. En Lambda la observabilidad es CloudWatch.

Las alertas (latencia y errores) y el dashboard están en `observability/newrelic/`. Para aplicarlos:

```bash
export TF_VAR_api_key=NRAK-...
terraform apply -var account_id=<id de la cuenta>
```

## Qué medir en el servicio

Estas métricas dicen si el servicio cumple lo que promete:

- Disponibilidad: porcentaje de `/health` y de respuestas sin 5xx.
- Latencia p95 de cada ruta.
- Tasa de fallos del CI y tiempo de la pipeline.
- Tiempo desde el merge a `main` hasta que la nueva versión responde.
