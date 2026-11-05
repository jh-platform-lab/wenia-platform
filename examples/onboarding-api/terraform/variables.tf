variable "service_name" {
  description = "Nombre del servicio (nombre del repo, del ECR y de la funcion)."
  type        = string
}

variable "owner" {
  description = "Equipo propietario (etiqueta Owner)."
  type        = string
}

variable "service_type" {
  description = "lambda o k8s. Con k8s solo se crea el repositorio de imagenes y el rol de CD."
  type        = string

  validation {
    condition     = contains(["lambda", "k8s"], var.service_type)
    error_message = "service_type debe ser lambda o k8s."
  }
}

variable "github_repository" {
  description = "Repositorio con formato org/nombre al que se le confia el rol de CD."
  type        = string
}

variable "github_environment" {
  description = "Entorno de GitHub Actions que puede asumir el rol de CD."
  type        = string
  default     = "production"
}

variable "region" {
  description = "Region de AWS."
  type        = string
  default     = "us-east-1"
}

variable "image_uri" {
  description = "Imagen inicial de la Lambda (repositorio:etiqueta). Vacio en el primer apply: la funcion se crea cuando ya hay imagen."
  type        = string
  default     = ""
}

variable "memory_size" {
  description = "Memoria de la Lambda en MB."
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Tiempo maximo de la Lambda en segundos."
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "Dias de retencion de logs."
  type        = number
  default     = 14
}
