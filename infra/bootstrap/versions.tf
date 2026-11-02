terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  # Solo la cuenta del reto. Cualquier otra cuenta hace fallar plan y apply.
  allowed_account_ids = [var.account_id]

  default_tags {
    tags = {
      Project   = "wenia-reto"
      ManagedBy = "terraform"
    }
  }
}
