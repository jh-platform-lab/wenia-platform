# Desarrollo y verificación

## Ejecutar en local

```bash
python3.12 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload          # http://127.0.0.1:8000/docs
```

## Verificar antes de abrir un pull request

| Qué | Comando |
|---|---|
| Pruebas | `pytest -q` |
| Seguridad del código | `bandit -r app -q` |
| Dependencias | `pip-audit -r requirements.txt` |
| Imagen Kubernetes | `docker build -f Dockerfile -t onboarding-api .` |
| Imagen Lambda | `docker build -f Dockerfile.lambda -t onboarding-api-lambda .` |
| Kubernetes en local | `bash scripts/kind-deploy.sh` (cluster Kind, prueba con `curl`) |
| Secretos en el repo | `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 detect --source /repo --no-banner` |

## Cómo implementar una ruta

1. Escribe la lógica en la función en `app/main.py`.
2. Actualiza `openapi.yaml` si cambia el contrato.
3. Agrega su prueba en `tests/`.
4. Abre un pull request: el CI ejecuta las mismas comprobaciones.
