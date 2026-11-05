variable "service_name" {
  description = "Nombre del servicio; debe coincidir con app_name de newrelic.ini."
  type        = string
}

variable "account_id" {
  description = "ID de la cuenta de New Relic."
  type        = number
}

variable "api_key" {
  description = "User API key de New Relic (NRAK-...). Se pasa por TF_VAR_api_key, nunca en un archivo."
  type        = string
  sensitive   = true
}

variable "error_rate_threshold" {
  description = "Porcentaje de transacciones con error que dispara la alerta."
  type        = number
  default     = 5
}

variable "p95_latency_seconds" {
  description = "Latencia p95 (segundos) que dispara la alerta."
  type        = number
  default     = 1
}
