# 🏗️ Terraform Infrastructure for Mess Feedback System

This directory contains Terraform configuration files to manage the Azure infrastructure for the Mess Feedback System.

## 📁 File Structure

```
terraform/
├── providers.tf      # Azure provider configuration
├── variables.tf      # Variable definitions
├── main.tf          # Main infrastructure resources
├── outputs.tf       # Output values
├── terraform.tfvars # Variable values
└── README.md        # This documentation
```

## 🚀 Quick Start

### Prerequisites
1. **Terraform installed** (v1.0+)
2. **Azure CLI installed** and authenticated
3. **Appropriate Azure permissions**

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 2: Plan the Deployment
```bash
terraform plan
```

### Step 3: Apply the Configuration
```bash
terraform apply
```

## 📋 Resources Managed

### Existing Resources (Imported)
- ✅ **Resource Group**: `Kavi`
- ✅ **SQL Server**: `messfeedbacksqlserver`
- ✅ **SQL Database**: `messfeedbacksqlserver`
- ✅ **Container Registry**: `messfeedback.azurecr.io`

### New Resources (Created)
- 🆕 **Key Vault**: Secure secret management
- 🆕 **Container Instance**: Managed ACI deployment
- 🆕 **Firewall Rules**: Database security
- 🆕 **Key Vault Secrets**: Encrypted credential storage

## 🔧 Import Existing Resources

Before running `terraform apply`, you need to import your existing resources:

### Import Resource Group
```bash
terraform import azurerm_resource_group.main /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/Kavi
```

### Import SQL Server
```bash
terraform import azurerm_mssql_server.main /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/Kavi/providers/Microsoft.Sql/servers/messfeedbacksqlserver
```

### Import SQL Database
```bash
terraform import azurerm_mssql_database.main /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/Kavi/providers/Microsoft.Sql/servers/messfeedbacksqlserver/databases/messfeedbacksqlserver
```

### Import Container Registry
```bash
terraform import azurerm_container_registry.main /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/Kavi/providers/Microsoft.ContainerRegistry/registries/messfeedback
```

## 🔍 Get Your Subscription ID
```bash
az account show --query id --output tsv
```

## 📊 Outputs

After successful deployment, Terraform will output:
- Application URL
- Database connection information
- Container registry details
- Key Vault information

## 🛡️ Security Features

### Implemented Security
- ✅ **Key Vault**: Secure secret storage
- ✅ **Firewall Rules**: Database access control
- ✅ **Sensitive Variables**: Marked as sensitive
- ✅ **Lifecycle Rules**: Prevent accidental deletion

### Best Practices
- Secrets stored in Key Vault
- Sensitive outputs marked appropriately
- Resource protection enabled
- Proper tagging for resource management

## 🔄 Common Commands

### Initialize and Plan
```bash
terraform init
terraform plan
```

### Apply Changes
```bash
terraform apply
```

### View Current State
```bash
terraform show
terraform state list
```

### View Outputs
```bash
terraform output
terraform output application_url
```

### Destroy Resources (BE CAREFUL!)
```bash
terraform destroy
```

## 🚨 Important Notes

### Safety Measures
- **Prevent Destroy**: Critical resources have `prevent_destroy = true`
- **Import First**: Always import existing resources before applying
- **Backup**: Ensure database backups before major changes

### Environment Variables
The following sensitive variables should be set via environment variables or Azure Key Vault:
- `TF_VAR_sql_admin_password`
- `TF_VAR_jwt_secret`

### Troubleshooting

#### Common Issues
1. **Authentication Error**: Run `az login`
2. **Permission Denied**: Check Azure RBAC permissions
3. **Resource Already Exists**: Import the resource first
4. **State Lock**: Use `terraform force-unlock` if needed

#### Useful Commands
```bash
# Check Terraform version
terraform version

# Validate configuration
terraform validate

# Format code
terraform fmt

# Show detailed plan
terraform plan -detailed-exitcode
```

## 📈 Next Steps

After successful deployment:
1. ✅ Verify application accessibility
2. ✅ Test database connectivity
3. ✅ Configure monitoring (optional)
4. ✅ Set up CI/CD integration
5. ✅ Implement backup strategies

## 🤝 Contributing

When making changes:
1. Always run `terraform plan` first
2. Review changes carefully
3. Test in development environment
4. Document any new variables or outputs

---

**⚠️ Remember**: This Terraform configuration manages critical production resources. Always review changes before applying!
