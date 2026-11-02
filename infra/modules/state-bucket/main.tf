variable "bucket_name" {
  description = "Nombre global unico del bucket (incluye el ID de cuenta)."
  type        = string
}

variable "noncurrent_version_days" {
  description = "Dias que se conservan las versiones anteriores del estado."
  type        = number
  default     = 90
}

data "aws_caller_identity" "current" {}

# Politica por defecto de AWS escrita de forma explicita: la cuenta administra la llave
# y IAM decide quien la usa.
data "aws_iam_policy_document" "state_kms" {
  #checkov:skip=CKV_AWS_109:Politica de llave KMS por defecto de AWS: "*" en una key policy significa esta misma llave
  #checkov:skip=CKV_AWS_111:Idem; la cuenta administra la llave y IAM decide quien la usa
  #checkov:skip=CKV_AWS_356:Idem; el recurso de una key policy es siempre la propia llave
  statement {
    sid       = "EnableAccountAdministration"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }
}

resource "aws_kms_key" "state" {
  description             = "Cifrado del estado de Terraform (${var.bucket_name})"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.state_kms.json
}

resource "aws_s3_bucket" "this" {
  #checkov:skip=CKV_AWS_18:Logs de acceso requieren un bucket de logs centralizado, fuera del alcance del bootstrap
  #checkov:skip=CKV2_AWS_62:El estado no dispara eventos; no hay consumidores de notificaciones
  #checkov:skip=CKV_AWS_144:Replicacion entre regiones innecesaria para el estado de un reto
  bucket = var.bucket_name

  # Perder este bucket es perder el estado de Terraform.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  # Versionado sin limite crece para siempre: se expiran versiones viejas.
  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.this]
}

data "aws_iam_policy_document" "tls_only" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.this.arn,
      "${aws_s3_bucket.this.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.tls_only.json

  depends_on = [aws_s3_bucket_public_access_block.this]
}

output "bucket_name" {
  description = "Nombre del bucket."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN del bucket."
  value       = aws_s3_bucket.this.arn
}
