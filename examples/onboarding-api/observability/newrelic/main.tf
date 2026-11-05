locals {
  app_filter = "appName = '${var.service_name}'"
}

resource "newrelic_alert_policy" "this" {
  name                = "${var.service_name} - golden signals"
  incident_preference = "PER_CONDITION"
}

# Errores: porcentaje de transacciones fallidas.
resource "newrelic_nrql_alert_condition" "error_rate" {
  policy_id = newrelic_alert_policy.this.id
  name      = "${var.service_name} error rate"
  type      = "static"
  enabled   = true

  nrql {
    query = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE ${local.app_filter}"
  }

  critical {
    operator              = "above"
    threshold             = var.error_rate_threshold
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  aggregation_method = "event_flow"
  aggregation_window = 60
  aggregation_delay  = 120
}

# Latencia: percentil 95 del tiempo de respuesta.
resource "newrelic_nrql_alert_condition" "latency_p95" {
  policy_id = newrelic_alert_policy.this.id
  name      = "${var.service_name} latency p95"
  type      = "static"
  enabled   = true

  nrql {
    query = "SELECT percentile(duration, 95) FROM Transaction WHERE ${local.app_filter}"
  }

  critical {
    operator              = "above"
    threshold             = var.p95_latency_seconds
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  aggregation_method = "event_flow"
  aggregation_window = 60
  aggregation_delay  = 120
}

resource "newrelic_one_dashboard" "this" {
  name = "${var.service_name} - golden signals"

  page {
    name = "Overview"

    widget_line {
      title  = "Throughput (requests/min)"
      row    = 1
      column = 1
      width  = 4
      height = 3

      nrql_query {
        query = "SELECT rate(count(*), 1 minute) FROM Transaction WHERE ${local.app_filter} TIMESERIES"
      }
    }

    widget_line {
      title  = "Latency p95 (s)"
      row    = 1
      column = 5
      width  = 4
      height = 3

      nrql_query {
        query = "SELECT percentile(duration, 95) FROM Transaction WHERE ${local.app_filter} TIMESERIES"
      }
    }

    widget_line {
      title  = "Error rate (%)"
      row    = 1
      column = 9
      width  = 4
      height = 3

      nrql_query {
        query = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE ${local.app_filter} TIMESERIES"
      }
    }
  }
}
