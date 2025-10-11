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
  default     = "Central India"
}

# Resource Group
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "Kavi"  # Your existing resource group
}

# Database Configuration
variable "sql_server_name" {
  description = "Name of the SQL Server"
  type        = string
  default     = "messfeedbacksqlserver"  # Your existing SQL server
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
  default     = "messfeedback"  # Your existing ACR
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
  default     = "messfeedback-aci"
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
  default     = "messfeedback.azurecr.io/mess-feedback-system:v1.1.0"
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
