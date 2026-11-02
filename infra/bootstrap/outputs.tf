output "state_bucket" {
  value = module.state_bucket.bucket_name
}

output "github_oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.github.arn
}
