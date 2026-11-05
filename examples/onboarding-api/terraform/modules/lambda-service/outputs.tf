output "function_name" {
  value = try(aws_lambda_function.this[0].function_name, null)
}

output "function_arn" {
  value = "arn:aws:lambda:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:function:${var.service_name}"
}

output "function_url" {
  value = try(aws_lambda_function_url.this[0].function_url, null)
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
