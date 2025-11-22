# Main Terraform Configuration for Mess Feedback System
# This configuration imports existing resources and manages them via Terraform

# Import existing Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
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
    # Ignore changes to password to avoid conflicts
    ignore_changes = [administrator_login_password]
  }
}

# Import existing SQL Database
resource "azurerm_mssql_database" "main" {
  name           = var.sql_database_name
  server_id      = azurerm_mssql_server.main.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  sku_name       = "S0"
  zone_redundant = false
  
  tags = var.tags
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

# Data source to reference existing Azure Container Registry
# (ACR is created manually and managed separately)
data "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
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

# Create Application Insights for monitoring
resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-appinsights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  
  tags = var.tags
  
  lifecycle {
    ignore_changes = [
      application_type,
      workspace_id
    ]
  }
}

# Create Action Group for alerts
resource "azurerm_monitor_action_group" "main" {
  name                = "${var.project_name}-action-group"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "messfeed"

  email_receiver {
    name          = "admin-email"
    email_address = var.alert_email
    use_common_alert_schema = true
  }

  tags = var.tags
}

# Alert Rule: High CPU Usage
resource "azurerm_monitor_metric_alert" "cpu_alert" {
  name                = "${var.project_name}-high-cpu-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_container_group.main.id]
  description         = "Alert when CPU usage exceeds 80%"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.ContainerInstance/containerGroups"
    metric_name      = "CpuUsage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 0.8
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Alert Rule: High Error Rate
resource "azurerm_monitor_metric_alert" "error_alert" {
  name                = "${var.project_name}-high-error-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when error rate exceeds 5%"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "exceptions/count"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Create Container Group (ACI) - This will be NEW or replace existing
resource "azurerm_container_group" "main" {
  name                = var.container_group_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Public"
  dns_name_label      = "mess-feedback-system-prod"
  os_type             = "Linux"
  restart_policy      = "Always"

  # Image registry credentials for ACR access
  image_registry_credential {
    server   = data.azurerm_container_registry.main.login_server
    username = data.azurerm_container_registry.main.admin_username
    password = data.azurerm_container_registry.main.admin_password
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
      NODE_ENV                       = var.node_env
      PORT                          = tostring(var.container_port)
      DB_SERVER                     = azurerm_mssql_server.main.fully_qualified_domain_name
      DB_DATABASE                   = azurerm_mssql_database.main.name
      DB_USER                       = var.sql_admin_username
      DB_PORT                       = "1433"
      JWT_EXPIRES_IN                = var.jwt_expires_in
      AZURE_OPENAI_ENDPOINT         = var.azure_openai_endpoint
      AZURE_OPENAI_DEPLOYMENT_NAME  = var.azure_openai_deployment_name
      AZURE_OPENAI_API_VERSION      = var.azure_openai_api_version
      APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
      APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.main.instrumentation_key
    }

    # Secure environment variables
    secure_environment_variables = {
      DB_PASSWORD         = var.sql_admin_password
      JWT_SECRET          = var.jwt_secret
      AZURE_OPENAI_API_KEY = var.azure_openai_api_key
    }

    # Health probes disabled temporarily - will be added after container starts successfully
    # Liveness probe
    # readiness probe
  }

  tags = var.tags
}
