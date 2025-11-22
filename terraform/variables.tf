# Variables for Mess Feedback System Terraform Configuration

# Project Information
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "mess-feedback-system"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "southeastasia"
}

# Resource Group
variable "resource_group_name" {
  description = "Name of the resource group"
  default     = "mess-feedback-rg"  # New resource group for your account
}

# Database Configuration
variable "sql_server_name" {
  description = "Name of the SQL Server"
  type        = string
  default     = "messfeedback-sqlserver-bharath"  # New SQL server (must be globally unique)
}

variable "sql_database_name" {
  description = "Name of the SQL Database"
  type        = string
  default     = "messfeedbacksqlserver"  # Your existing database
}

variable "sql_admin_username" {
  description = "SQL Server administrator username"
  type        = string
  default     = "sqladmin"
  sensitive   = true
}

variable "sql_admin_password" {
  description = "SQL Server administrator password"
  type        = string
  default     = "Kavi@1997"
  sensitive   = true
}

# Container Registry
variable "acr_name" {
  description = "Name of the Azure Container Registry"
  type        = string
  default     = "messfeedbackbharath"  # Your new ACR in your account
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
}

# Container Instance
variable "container_group_name" {
  description = "Name of the container group"
  type        = string
  default     = "messfeedback-terraform"
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
  default     = "messfeedback.azurecr.io/mess-feedback-system:latest"
}

variable "container_cpu" {
  description = "CPU allocation for container"
  type        = number
  default     = 1
}

variable "container_memory" {
  description = "Memory allocation for container in GB"
  type        = number
  default     = 1.5
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3000
}

# Application Configuration
variable "node_env" {
  description = "Node.js environment"
  type        = string
  default     = "production"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  default     = "docker-jwt-secret-2024"
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "JWT token expiration time"
  type        = string
  default     = "24h"
}

# Azure OpenAI Configuration
variable "azure_openai_endpoint" {
  description = "Azure OpenAI endpoint URL"
  type        = string
  default     = "https://22070-mhgb5tc9-eastus2.cognitiveservices.azure.com/"
  sensitive   = false
}

variable "azure_openai_api_key" {
  description = "Azure OpenAI API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_openai_deployment_name" {
  description = "Azure OpenAI deployment name"
  type        = string
  default     = "gpt-35-turbo"
  sensitive   = false
}

variable "azure_openai_api_version" {
  description = "Azure OpenAI API version"
  type        = string
  default     = "2024-12-01-preview"
  sensitive   = false
}

# Monitoring Configuration
variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = "admin@example.com"  # Change this to your email
  sensitive   = false
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "Mess Feedback System"
    Environment = "Production"
    ManagedBy   = "Terraform"
    Owner       = "Student Developer"
    Purpose     = "Cloud Computing Project"
  }
}
