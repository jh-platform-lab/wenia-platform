# Composicion del servicio con modulos locales (modules/). El proveedor OIDC de GitHub lo
# crea una sola vez el bootstrap de la cuenta; aqui solo se consulta.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

module "ecr" {
  source = "./modules/ecr-repo"

  name = var.service_name
}

module "cd_role" {
  source = "./modules/github-cd-role"

  service_name       = var.service_name
  github_repository  = var.github_repository
  github_environment = var.github_environment
  oidc_provider_arn  = data.aws_iam_openid_connect_provider.github.arn
  ecr_arn            = module.ecr.arn
  function_arn       = "arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:function:${var.service_name}"
}

module "lambda" {
  source = "./modules/lambda-service"

  service_name       = var.service_name
  image_uri          = var.service_type == "lambda" ? var.image_uri : ""
  memory_size        = var.memory_size
  timeout            = var.timeout
  log_retention_days = var.log_retention_days
}

data "aws_caller_identity" "current" {}
