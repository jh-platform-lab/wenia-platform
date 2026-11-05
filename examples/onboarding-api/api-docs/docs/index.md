# APIs

El contrato completo está en `openapi.yaml`, en la raíz del repositorio. Backstage lo registra como la API `onboarding-api-api` en el catálogo.

!!! info "Base URL"
    En **Lambda** la URL es la Function URL del despliegue. En **Kubernetes** es el Service dentro del cluster; en local, el port-forward de `scripts/kind-deploy.sh`.

    ```bash
    export BASE_URL=http://localhost:8080
    ```

## Resumen

| Método | Ruta | Operación | Estado |
|---|---|---|---|
| GET | `/health` | `health` | ✅ Implementada |
| GET | `/health` | `health` | 🧩 501 hasta implementar |
| GET | `/services` | `list-services` | 🧩 501 hasta implementar |
| POST | `/services` | `create-service` | 🧩 501 hasta implementar |
| GET | `/services/{name}` | `get-service` | 🧩 501 hasta implementar |
| DELETE | `/services/{name}` | `delete-service` | 🧩 501 hasta implementar |
| GET | `/services/{name}/status` | `service-status` | 🧩 501 hasta implementar |

## Detalle por operación

### GET `/health` · health

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X GET "$BASE_URL/health"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

### GET `/services` · list-services

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X GET "$BASE_URL/services"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

### POST `/services` · create-service

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X POST "$BASE_URL/services"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

### GET `/services/{name}` · get-service

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X GET "$BASE_URL/services/{name}"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

### DELETE `/services/{name}` · delete-service

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X DELETE "$BASE_URL/services/{name}"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

### GET `/services/{name}/status` · service-status

!!! warning "Estado: stub"
    Responde `501 Not implemented` hasta que se escriba su lógica. El contrato de entrada y salida se define en `openapi.yaml`.

```bash
curl -i -X GET "$BASE_URL/services/{name}/status"
```

Respuesta de hoy: `501` con `{"detail": "Not implemented"}`.

## Salud

```bash
curl -i "$BASE_URL/health"
```

Respuesta: `200` con `{"status": "ok"}`.
