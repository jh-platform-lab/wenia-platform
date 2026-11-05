# Funcion Lambda de imagen de contenedor y su URL publica. Se crea solo cuando hay
# image_uri (la primera imagen debe existir en ECR antes).
locals {
  enabled = var.image_uri != "" ? 1 : 0
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  count = local.enabled

  name               = "${var.service_name}-lambda"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  count = local.enabled

  role       = aws_iam_role.this[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "this" {
  #checkov:skip=CKV_AWS_338: retencion de 14 dias es suficiente para la demo
  #checkov:skip=CKV_AWS_158: cifrado con llave administrada por defecto
  count = local.enabled

  name              = "/aws/lambda/${var.service_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "this" {
  #checkov:skip=CKV_AWS_50: X-Ray queda como evolucion; la observabilidad la cubre New Relic
  #checkov:skip=CKV_AWS_116: sin DLQ, la funcion es sincrona (Function URL)
  #checkov:skip=CKV_AWS_117: sin VPC para evitar costo de NAT; no accede a recursos privados
  #checkov:skip=CKV_AWS_173: variables sin datos sensibles (la licencia va por SSM)
  #checkov:skip=CKV_AWS_272: firma de codigo no aplica a imagenes de contenedor
  #checkov:skip=CKV_AWS_115: la concurrencia reservada depende del limite de la cuenta
  count = local.enabled

  function_name = var.service_name
  role          = aws_iam_role.this[0].arn
  package_type  = "Image"
  image_uri     = var.image_uri
  memory_size   = var.memory_size
  timeout       = var.timeout

  depends_on = [
    aws_cloudwatch_log_group.this,
    aws_iam_role_policy_attachment.logs,
  ]

  lifecycle {
    # El CD actualiza el codigo con update-function-code; Terraform no revierte la imagen.
    ignore_changes = [image_uri]
  }
}

resource "aws_lambda_function_url" "this" {
  #checkov:skip=CKV_AWS_258: URL publica a proposito para la demo; en produccion, API Gateway con autorizador y WAF
  count = local.enabled

  function_name      = aws_lambda_function.this[0].function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "url_invoke_url" {
  #checkov:skip=CKV_AWS_301: acceso publico a proposito para la demo (ver aws_lambda_function_url)
  count = local.enabled

  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.this[0].function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "url_invoke_function" {
  #checkov:skip=CKV_AWS_301: acceso publico a proposito para la demo (ver aws_lambda_function_url)
  count = local.enabled

  statement_id             = "FunctionURLAllowInvokeAction"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.this[0].function_name
  principal                = "*"
  invoked_via_function_url = true
}
