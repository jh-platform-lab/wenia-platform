# Repositorio de imagenes. Tags inmutables (cada despliegue usa el SHA del commit),
# escaneo al subir y cifrado con la llave administrada por AWS (aws/ecr, sin costo).
resource "aws_ecr_repository" "this" {
  name                 = var.name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Conserva las ultimas ${var.keep_images} imagenes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.keep_images
      }
      action = { type = "expire" }
    }]
  })
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Lambda lee la imagen con su propio principal de servicio: el repositorio debe permitirlo,
# acotado a la funcion de este servicio.
data "aws_iam_policy_document" "lambda_pull" {
  statement {
    sid    = "LambdaPull"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]

    condition {
      test     = "StringLike"
      variable = "aws:sourceArn"
      values   = ["arn:aws:lambda:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:function:${var.name}"]
    }
  }
}

resource "aws_ecr_repository_policy" "lambda_pull" {
  repository = aws_ecr_repository.this.name
  policy     = data.aws_iam_policy_document.lambda_pull.json
}
