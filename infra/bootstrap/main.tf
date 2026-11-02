# Bootstrap de la cuenta del reto: se aplica una sola vez y lo que crea lo usan los
# servicios generados. Estado local al principio; el bucket de estado se crea aqui y
# despues se puede migrar el estado de este modulo a el.

module "state_bucket" {
  source      = "../modules/state-bucket"
  bucket_name = "wenia-tfstate-${var.account_id}"
}

# Proveedor OIDC de GitHub. Cada servicio generado confia solo en su propio repo y
# entorno (ver templates/*/skeleton/terraform/main.tf); aqui solo se crea el proveedor.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Presupuesto: alerta al 80% real y al 100% del limite mensual.
resource "aws_budgets_budget" "monthly" {
  name         = "wenia-reto-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}
