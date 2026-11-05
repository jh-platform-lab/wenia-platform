terraform {
  # Estado remoto en el bucket del bootstrap. La clave y el bucket llegan en `terraform init`
  # (-backend-config), para que cada servicio tenga su propio archivo de estado.
  backend "s3" {}

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

  default_tags {
    tags = {
      Project   = var.service_name
      Owner     = var.owner
      ManagedBy = "terraform"
    }
  }
}
