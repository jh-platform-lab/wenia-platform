variable "service_name" {
  type = string
}

variable "image_uri" {
  description = "Imagen en ECR (vacio = no crear la funcion todavia)"
  type        = string
  default     = ""
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "timeout" {
  type    = number
  default = 10
}

variable "log_retention_days" {
  type    = number
  default = 14
}
