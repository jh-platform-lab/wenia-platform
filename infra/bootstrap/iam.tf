# Roles de GitHub Actions. Sin llaves de acceso: el workflow pide un token OIDC y AWS
# lo cambia por credenciales temporales solo si la confianza coincide.
locals {
  # Dos formatos del claim sub de GitHub: por nombre (repo:org/repo) y, si la org usa
  # sujetos inmutables, con IDs (repo:org@ID/repo@ID). El ID de la org es fijo.
  github_org_id = "350889773"
  github_subjects = [
    "repo:jh-platform-lab/*",
    "repo:jh-platform-lab@${local.github_org_id}/*",
  ]
}

data "aws_iam_policy_document" "deployer_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Solo jobs que corren en el entorno production (aprobacion manual).
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for r in local.github_subjects : "${r}:environment:production"]
    }
  }
}

data "aws_iam_policy_document" "planner_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Pull requests: solo lectura, nunca puede cambiar nada.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for r in local.github_subjects : "${r}:pull_request"]
    }
  }
}

resource "aws_iam_role" "deployer" {
  name                 = "wenia-github-deployer"
  assume_role_policy   = data.aws_iam_policy_document.deployer_trust.json
  max_session_duration = 3600
}

resource "aws_iam_role" "planner" {
  name                 = "wenia-github-planner"
  assume_role_policy   = data.aws_iam_policy_document.planner_trust.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy_attachment" "planner_readonly" {
  role       = aws_iam_role.planner.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Permiso de apply limitado a lo que crea un servicio del reto: ECR, Lambda, logs, sus
# roles (nombre *-cd y *-lambda) y el bucket de estado. Nada de otros servicios.
data "aws_iam_policy_document" "deployer" {
  #checkov:skip=CKV_AWS_49:El apply crea y gestiona recursos de servicios; se acota por ARN de nombre
  #checkov:skip=CKV_AWS_111:Idem: escritura limitada a recursos con prefijo o sufijo del reto
  #checkov:skip=CKV_AWS_107:Sin credenciales expuestas: el rol solo se asume por OIDC
  statement {
    sid    = "EcrRepositories"
    effect = "Allow"
    actions = [
      "ecr:CreateRepository", "ecr:DescribeRepositories", "ecr:DeleteRepository",
      "ecr:PutImageScanningConfiguration", "ecr:PutImageTagMutability",
      "ecr:PutLifecyclePolicy", "ecr:GetLifecyclePolicy", "ecr:DeleteLifecyclePolicy",
      "ecr:ListTagsForResource", "ecr:TagResource", "ecr:DescribeImages",
      "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:PutImage",
      "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = ["arn:aws:ecr:${var.region}:${var.account_id}:repository/*"]
  }

  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "Lambda"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction", "lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration",
      "lambda:GetFunction", "lambda:GetFunctionConfiguration", "lambda:DeleteFunction",
      "lambda:CreateFunctionUrlConfig", "lambda:GetFunctionUrlConfig",
      "lambda:UpdateFunctionUrlConfig", "lambda:DeleteFunctionUrlConfig",
      "lambda:AddPermission", "lambda:RemovePermission", "lambda:GetPolicy",
      "lambda:TagResource", "lambda:UntagResource", "lambda:ListTags",
    ]
    resources = ["arn:aws:lambda:${var.region}:${var.account_id}:function:*"]
  }

  statement {
    sid    = "ServiceRoles"
    effect = "Allow"
    actions = [
      "iam:CreateRole", "iam:GetRole", "iam:DeleteRole", "iam:UpdateAssumeRolePolicy",
      "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies", "iam:TagRole", "iam:UntagRole",
    ]
    resources = [
      "arn:aws:iam::${var.account_id}:role/*-cd",
      "arn:aws:iam::${var.account_id}:role/*-lambda",
    ]
  }

  statement {
    sid       = "PassServiceRoles"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::${var.account_id}:role/*-lambda"]
  }

  statement {
    sid    = "Logs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:DescribeLogGroups",
      "logs:PutRetentionPolicy", "logs:TagResource", "logs:ListTagsForResource",
    ]
    resources = ["arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/*"]
  }

  statement {
    sid    = "StateBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
      "s3:GetBucketVersioning", "s3:GetBucketLocation",
    ]
    resources = [
      "arn:aws:s3:::wenia-tfstate-${var.account_id}",
      "arn:aws:s3:::wenia-tfstate-${var.account_id}/*",
    ]
  }

  statement {
    sid       = "StateKey"
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
    resources = [module.state_bucket.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "deployer" {
  name   = "wenia-deploy"
  role   = aws_iam_role.deployer.id
  policy = data.aws_iam_policy_document.deployer.json
}

# terraform plan bloquea el estado con un archivo .tflock en el bucket: el rol de plan
# solo puede escribir y borrar esos archivos de bloqueo, nada mas.
data "aws_iam_policy_document" "planner_lock" {
  statement {
    sid       = "StateLockOnly"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::wenia-tfstate-${var.account_id}/*.tflock"]
  }

  statement {
    sid       = "StateKeyReadOnly"
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
    resources = [module.state_bucket.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "planner_lock" {
  name   = "wenia-plan-state-lock"
  role   = aws_iam_role.planner.id
  policy = data.aws_iam_policy_document.planner_lock.json
}
