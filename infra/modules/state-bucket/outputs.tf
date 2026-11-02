output "kms_key_arn" {
  description = "Llave que cifra el estado; los roles de GitHub necesitan usarla."
  value       = aws_kms_key.state.arn
}
