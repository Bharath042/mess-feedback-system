# Main Terraform Configuration for Mess Feedback System
# This configuration imports existing resources and manages them via Terraform

# Import existing Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags

  lifecycle {
    # Prevent accidental deletion of existing resource group
    prevent_destroy = true
  }
}

# Import existing SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = var.sql_server_name
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  
  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of existing SQL server
    prevent_destroy = true
    # Ignore changes to password to avoid conflicts
    ignore_changes = [administrator_login_password]
  }
}

# Import existing SQL Database
resource "azurerm_mssql_database" "main" {
  name           = var.sql_database_name
  server_id      = azurerm_mssql_server.main.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  sku_name       = "GP_S_Gen5_1"
  zone_redundant = false
  
  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of existing database
    prevent_destroy = true
  }
}

# SQL Server Firewall Rule - Allow Azure Services
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# SQL Server Firewall Rule - Allow All IPs (for development)
resource "azurerm_mssql_firewall_rule" "allow_all" {
  name             = "AllowAll"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

# Import existing Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = true
  
  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of existing ACR
    prevent_destroy = true
  }
}

# Generate random password for Key Vault access
resource "random_password" "key_vault_password" {
  length  = 32
  special = true
}

# Create Key Vault for secure secret management
resource "azurerm_key_vault" "main" {
  name                = "messfeedback-kv-${random_id.key_vault_suffix.hex}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Enable soft delete and purge protection
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  # Access policy for current user/service principal
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Recover",
      "Backup",
      "Restore"
    ]
  }

  tags = var.tags
}

# Random ID for unique naming
resource "random_id" "key_vault_suffix" {
  byte_length = 4
}

# Store database password in Key Vault
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  value        = var.sql_admin_password
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_key_vault.main]
}

# Store JWT secret in Key Vault
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_key_vault.main]
}

# Create Container Group (ACI) - This will be NEW or replace existing
resource "azurerm_container_group" "main" {
  name                = var.container_group_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Public"
  dns_name_label      = "${var.project_name}-${var.environment}"
  os_type             = "Linux"
  restart_policy      = "Always"

  # Image registry credentials for ACR access
  image_registry_credential {
    server   = azurerm_container_registry.main.login_server
    username = azurerm_container_registry.main.admin_username
    password = azurerm_container_registry.main.admin_password
  }

  # Main application container
  container {
    name   = "mess-feedback-app"
    image  = var.container_image
    cpu    = var.container_cpu
    memory = var.container_memory

    ports {
      port     = var.container_port
      protocol = "TCP"
    }

    # Environment variables for the application
    environment_variables = {
      NODE_ENV        = var.node_env
      PORT           = tostring(var.container_port)
      DB_SERVER      = azurerm_mssql_server.main.fully_qualified_domain_name
      DB_DATABASE    = azurerm_mssql_database.main.name
      DB_USER        = var.sql_admin_username
      DB_PORT        = "1433"
      JWT_EXPIRES_IN = var.jwt_expires_in
    }

    # Secure environment variables
    secure_environment_variables = {
      DB_PASSWORD = var.sql_admin_password
      JWT_SECRET  = var.jwt_secret
    }

    # Liveness probe
    liveness_probe {
      http_get {
        path   = "/health"
        port   = var.container_port
        scheme = "Http"
      }
      initial_delay_seconds = 30
      period_seconds        = 30
      failure_threshold     = 3
      success_threshold     = 1
      timeout_seconds       = 10
    }

    # Readiness probe
    readiness_probe {
      http_get {
        path   = "/health"
        port   = var.container_port
        scheme = "Http"
      }
      initial_delay_seconds = 10
      period_seconds        = 10
      failure_threshold     = 3
      success_threshold     = 1
      timeout_seconds       = 5
    }
  }

  tags = var.tags
}
