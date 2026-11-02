variable "account_id" {
  description = "ID de la cuenta del reto (wenia-reto). Obligatorio: protege contra aplicar en otra cuenta."
  type        = string
  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "account_id debe ser un ID de 12 digitos."
  }
}

variable "region" {
  description = "Region de AWS"
  type        = string
  default     = "us-east-1"
}

variable "alert_email" {
  description = "Correo que recibe las alertas de presupuesto"
  type        = string
}

variable "budget_limit_usd" {
  description = "Presupuesto mensual en USD"
  type        = number
  default     = 5
}
