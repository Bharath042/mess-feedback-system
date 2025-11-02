# Outputs for Mess Feedback System Terraform Configuration

# Resource Group Information
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

# Database Information
output "sql_server_name" {
  description = "Name of the SQL Server"
  value       = azurerm_mssql_server.main.name
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "Name of the SQL Database"
  value       = azurerm_mssql_database.main.name
}

# Container Registry Information
output "acr_name" {
  description = "Name of the Azure Container Registry"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "Login server URL for the Azure Container Registry"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "Admin username for the Azure Container Registry"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

# Container Instance Information
output "container_group_name" {
  description = "Name of the container group"
  value       = azurerm_container_group.main.name
}

output "container_ip_address" {
  description = "Public IP address of the container group"
  value       = azurerm_container_group.main.ip_address
}

output "container_fqdn" {
  description = "Fully qualified domain name of the container group"
  value       = azurerm_container_group.main.fqdn
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${azurerm_container_group.main.fqdn}:${var.container_port}"
}

output "container_url" {
  description = "Container URL (alias for application_url)"
  value       = "http://${azurerm_container_group.main.fqdn}:${var.container_port}"
}

output "application_health_url" {
  description = "URL to check application health"
  value       = "http://${azurerm_container_group.main.fqdn}:${var.container_port}/health"
}

# Key Vault Information
output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

# Application Access Information
output "student_login_url" {
  description = "URL for student login"
  value       = "http://${azurerm_container_group.main.fqdn}:${var.container_port}/student-login"
}

output "admin_login_url" {
  description = "URL for admin login"
  value       = "http://${azurerm_container_group.main.fqdn}:${var.container_port}/admin-login"
}

# Connection Information
output "database_connection_info" {
  description = "Database connection information"
  value = {
    server   = azurerm_mssql_server.main.fully_qualified_domain_name
    database = azurerm_mssql_database.main.name
    username = var.sql_admin_username
    port     = 1433
  }
  sensitive = true
}

# Summary Information
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    project_name      = var.project_name
    environment       = var.environment
    resource_group    = azurerm_resource_group.main.name
    location          = azurerm_resource_group.main.location
    sql_server        = azurerm_mssql_server.main.name
    container_registry = azurerm_container_registry.main.name
    container_group   = azurerm_container_group.main.name
    key_vault         = azurerm_key_vault.main.name
    application_url   = "http://${azurerm_container_group.main.fqdn}:${var.container_port}"
  }
}
