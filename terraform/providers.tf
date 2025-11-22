# Terraform Provider Configuration for Mess Feedback System
# This file configures the Azure Resource Manager provider

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  
  # Use local state for now (will be in .gitignore)
  # Remote state can be configured later if needed
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    # Enable enhanced features for resource management
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  
  # Skip automatic provider registration to avoid concurrent write conflicts
  skip_provider_registration = true
}

# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# Data source to get current subscription
data "azurerm_subscription" "current" {}
