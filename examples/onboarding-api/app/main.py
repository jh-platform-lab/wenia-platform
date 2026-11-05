from fastapi import FastAPI, HTTPException
from mangum import Mangum
from pydantic import BaseModel, Field

app = FastAPI(title="onboarding-api", description="API de onboarding de servicios para la plataforma")

# Estado en memoria: suficiente para la demo; en Lambda se pierde entre arranques en frio.
services: dict[str, dict] = {}


class ServiceIn(BaseModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9-]{1,38}[a-z0-9]$")
    owner: str = Field(min_length=2, max_length=40)
    description: str = Field(default="", max_length=200)


def find_service(name: str) -> dict:
    if name not in services:
        raise HTTPException(status_code=404, detail="Service not found")
    return services[name]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/services")
def list_services():
    return list(services.values())


@app.post("/services", status_code=201)
def create_service(service: ServiceIn):
    if service.name in services:
        raise HTTPException(status_code=409, detail="Service already exists")
    services[service.name] = {**service.model_dump(), "status": "registered"}
    return services[service.name]


@app.get("/services/{name}")
def get_service(name: str):
    return find_service(name)


@app.delete("/services/{name}", status_code=204)
def delete_service(name: str):
    find_service(name)
    del services[name]


@app.get("/services/{name}/status")
def service_status(name: str):
    return {"name": name, "status": find_service(name)["status"]}


# Adaptador para AWS Lambda. En Kubernetes uvicorn usa "app" y este objeto no se usa.
handler = Mangum(app, lifespan="off")
