output "ecr_repository_url" {
  description = "Repositorio donde el CD publica la imagen."
  value       = module.ecr.repository_url
}

output "cd_role_arn" {
  description = "Rol que asume el CD (variable AWS_ROLE_ARN del repo)."
  value       = module.cd_role.role_arn
}

output "function_name" {
  value = module.lambda.function_name
}

output "function_url" {
  description = "URL publica de la Lambda (vacio hasta que exista la funcion)."
  value       = module.lambda.function_url
}
