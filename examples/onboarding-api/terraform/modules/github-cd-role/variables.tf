variable "service_name" {
  type = string
}

variable "github_repository" {
  description = "org/repo que puede asumir el rol"
  type        = string
}

variable "github_environment" {
  description = "Entorno de GitHub que puede asumir el rol"
  type        = string
}

variable "oidc_provider_arn" {
  description = "Proveedor OIDC de GitHub creado por el bootstrap"
  type        = string
}

variable "ecr_arn" {
  type = string
}

variable "function_arn" {
  type = string
}
