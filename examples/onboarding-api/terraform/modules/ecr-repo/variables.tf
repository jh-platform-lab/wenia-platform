variable "name" {
  description = "Nombre del repositorio ECR (igual al servicio)"
  type        = string
}

variable "keep_images" {
  description = "Cuantas imagenes conservar"
  type        = number
  default     = 10
}
