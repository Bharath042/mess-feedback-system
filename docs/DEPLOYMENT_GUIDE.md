# Deployment Guide

This guide covers deploying the Mess Feedback System to Azure cloud platform using Azure Pipelines for CI/CD.

## Prerequisites

### Azure Resources Required
- Azure Subscription
- Azure SQL Database
- Azure App Service (Linux)
- Azure DevOps Organization
- Azure Key Vault (recommended for secrets)

### Local Development Requirements
- Node.js 16+ 
- Git
- Azure CLI
- Visual Studio Code (recommended)

## Azure Infrastructure Setup

### 1. Create Resource Group

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name mess-feedback-rg \
  --location "East US"
```

### 2. Create Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name mess-feedback-sql-server \
  --resource-group mess-feedback-rg \
  --location "East US" \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

# Create SQL Database
az sql db create \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --name MessFeedbackDB \
  --service-objective Basic

# Configure firewall rule for Azure services
az sql server firewall-rule create \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Add your IP for development access
az sql server firewall-rule create \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

### 3. Create App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name mess-feedback-plan \
  --resource-group mess-feedback-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group mess-feedback-rg \
  --plan mess-feedback-plan \
  --name mess-feedback-system \
  --runtime "NODE|18-lts"
```

### 4. Configure App Settings

```bash
# Set application settings
az webapp config appsettings set \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --settings \
    NODE_ENV=production \
    DB_SERVER=mess-feedback-sql-server.database.windows.net \
    DB_DATABASE=MessFeedbackDB \
    DB_USER=sqladmin \
    DB_PASSWORD="YourSecurePassword123!" \
    DB_PORT=1433 \
    JWT_SECRET="your-production-jwt-secret-key" \
    JWT_EXPIRES_IN=24h \
    PORT=8080
```

## Azure DevOps Setup

### 1. Create Azure DevOps Project

1. Go to [Azure DevOps](https://dev.azure.com)
2. Create new organization (if needed)
3. Create new project: "Mess Feedback System"
4. Choose Git for version control

### 2. Import Repository

```bash
# Clone your repository
git clone <your-repository-url>
cd mess-feedback-system

# Add Azure DevOps remote
git remote add azure https://dev.azure.com/your-org/mess-feedback-system/_git/mess-feedback-system

# Push to Azure DevOps
git push azure main
```

### 3. Create Service Connection

1. Go to Project Settings → Service connections
2. Create new service connection
3. Choose "Azure Resource Manager"
4. Select "Service principal (automatic)"
5. Choose your subscription and resource group
6. Name it "azure-subscription"

### 4. Configure Pipeline Variables

Go to Pipelines → Library → Variable groups and create:

**Production Variables:**
- `prodDbServer`: mess-feedback-sql-server.database.windows.net
- `prodDbName`: MessFeedbackDB
- `prodDbUser`: sqladmin
- `prodDbPassword`: (mark as secret)
- `prodJwtSecret`: (mark as secret)

**Development Variables:**
- `devDbServer`: mess-feedback-sql-server-dev.database.windows.net
- `devDbName`: MessFeedbackDevDB
- `devDbUser`: sqladmin
- `devDbPassword`: (mark as secret)
- `devJwtSecret`: (mark as secret)

**Test Variables:**
- `testDbServer`: localhost or test server
- `testDbName`: MessFeedbackTestDB
- `testDbUser`: testuser
- `testDbPassword`: (mark as secret)
- `testJwtSecret`: test-jwt-secret

## Pipeline Configuration

### 1. Create Pipeline

1. Go to Pipelines → Pipelines
2. Click "New pipeline"
3. Choose "Azure Repos Git"
4. Select your repository
5. Choose "Existing Azure Pipelines YAML file"
6. Select `/azure-pipelines.yml`

### 2. Update Pipeline Variables

Edit the `azure-pipelines.yml` file and update:

```yaml
variables:
  # Update these values
  azureSubscription: 'azure-subscription'  # Your service connection name
  webAppName: 'mess-feedback-system'       # Your web app name
  resourceGroupName: 'mess-feedback-rg'    # Your resource group
  sqlServerName: 'mess-feedback-sql-server'
  databaseName: 'MessFeedbackDB'
```

### 3. Create Environments

1. Go to Pipelines → Environments
2. Create "development" environment
3. Create "production" environment
4. Add approval gates for production (recommended)

## Environment-Specific Deployments

### Development Environment

```bash
# Create development resources
az sql db create \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --name MessFeedbackDevDB \
  --service-objective Basic

az webapp create \
  --resource-group mess-feedback-rg \
  --plan mess-feedback-plan \
  --name mess-feedback-system-dev \
  --runtime "NODE|18-lts"
```

### Staging Environment (Optional)

```bash
# Create staging resources
az webapp create \
  --resource-group mess-feedback-rg \
  --plan mess-feedback-plan \
  --name mess-feedback-system-staging \
  --runtime "NODE|18-lts"
```

## Security Configuration

### 1. Azure Key Vault Setup

```bash
# Create Key Vault
az keyvault create \
  --name mess-feedback-keyvault \
  --resource-group mess-feedback-rg \
  --location "East US"

# Add secrets
az keyvault secret set \
  --vault-name mess-feedback-keyvault \
  --name "db-password" \
  --value "YourSecurePassword123!"

az keyvault secret set \
  --vault-name mess-feedback-keyvault \
  --name "jwt-secret" \
  --value "your-production-jwt-secret-key"
```

### 2. Configure App Service to Use Key Vault

```bash
# Enable system-assigned managed identity
az webapp identity assign \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system

# Grant access to Key Vault
az keyvault set-policy \
  --name mess-feedback-keyvault \
  --object-id <managed-identity-principal-id> \
  --secret-permissions get list
```

### 3. Update App Settings to Reference Key Vault

```bash
az webapp config appsettings set \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --settings \
    DB_PASSWORD="@Microsoft.KeyVault(VaultName=mess-feedback-keyvault;SecretName=db-password)" \
    JWT_SECRET="@Microsoft.KeyVault(VaultName=mess-feedback-keyvault;SecretName=jwt-secret)"
```

## Monitoring and Logging

### 1. Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app mess-feedback-insights \
  --location "East US" \
  --resource-group mess-feedback-rg

# Get instrumentation key
az monitor app-insights component show \
  --app mess-feedback-insights \
  --resource-group mess-feedback-rg \
  --query instrumentationKey
```

### 2. Configure Logging

Add to app settings:
```bash
az webapp config appsettings set \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### 3. Set up Alerts

```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group mess-feedback-rg \
  --name mess-feedback-alerts \
  --short-name mf-alerts \
  --email admin admin@yourcompany.com

# Create alert rule for high error rate
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group mess-feedback-rg \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/mess-feedback-rg/providers/Microsoft.Web/sites/mess-feedback-system \
  --condition "avg Http5xx > 10" \
  --action mess-feedback-alerts
```

## SSL/TLS Configuration

### 1. Configure Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name mess-feedback-system \
  --resource-group mess-feedback-rg \
  --hostname yourdomain.com

# Enable HTTPS
az webapp update \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --https-only true
```

### 2. SSL Certificate

```bash
# Create managed certificate
az webapp config ssl create \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --hostname yourdomain.com

# Bind certificate
az webapp config ssl bind \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --certificate-thumbprint CERTIFICATE_THUMBPRINT \
  --ssl-type SNI
```

## Database Migration and Seeding

### 1. Initial Data Setup

Create a migration script `scripts/seed-data.sql`:

```sql
-- Insert default mess halls
INSERT INTO mess_halls (name, location, capacity, is_active) VALUES
('Main Mess Hall', 'Campus Center', 500, 1),
('North Campus Mess', 'North Campus', 300, 1),
('South Campus Mess', 'South Campus', 250, 1);

-- Insert sample menu items
INSERT INTO menu_items (name, category, description, is_vegetarian, is_active) VALUES
('Rice', 'lunch', 'Steamed white rice', 1, 1),
('Dal', 'lunch', 'Lentil curry', 1, 1),
('Chicken Curry', 'lunch', 'Spicy chicken curry', 0, 1),
('Roti', 'lunch', 'Indian bread', 1, 1);

-- Create admin user (password: AdminPass123)
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, is_active) VALUES
('ADMIN001', 'admin@mess.edu', '$2a$12$hash_here', 'System', 'Administrator', 'admin', 1);
```

### 2. Run Migration

```bash
# Connect to Azure SQL and run migration
sqlcmd -S mess-feedback-sql-server.database.windows.net -d MessFeedbackDB -U sqladmin -P "YourSecurePassword123!" -i scripts/seed-data.sql
```

## Backup and Disaster Recovery

### 1. Database Backup

```bash
# Configure automated backup
az sql db ltr-policy set \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --database MessFeedbackDB \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P7Y \
  --week-of-year 1
```

### 2. App Service Backup

```bash
# Create storage account for backups
az storage account create \
  --name messfeedbackbackup \
  --resource-group mess-feedback-rg \
  --location "East US" \
  --sku Standard_LRS

# Configure backup
az webapp config backup create \
  --resource-group mess-feedback-rg \
  --webapp-name mess-feedback-system \
  --backup-name daily-backup \
  --storage-account-url "https://messfeedbackbackup.blob.core.windows.net/backups" \
  --frequency 1 \
  --frequency-unit Day \
  --retain-one true
```

## Performance Optimization

### 1. Enable Caching

```bash
# Create Redis Cache
az redis create \
  --location "East US" \
  --name mess-feedback-cache \
  --resource-group mess-feedback-rg \
  --sku Basic \
  --vm-size c0

# Add connection string to app settings
az webapp config appsettings set \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --settings \
    REDIS_CONNECTION_STRING="mess-feedback-cache.redis.cache.windows.net:6380,password=PRIMARY_KEY,ssl=True"
```

### 2. CDN Configuration

```bash
# Create CDN profile
az cdn profile create \
  --resource-group mess-feedback-rg \
  --name mess-feedback-cdn \
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create \
  --resource-group mess-feedback-rg \
  --profile-name mess-feedback-cdn \
  --name mess-feedback-assets \
  --origin mess-feedback-system.azurewebsites.net
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check firewall rules
   - Verify connection string
   - Ensure database exists

2. **Authentication Problems**
   - Verify JWT secret is set
   - Check token expiration
   - Validate user permissions

3. **Deployment Failures**
   - Check pipeline logs
   - Verify service connections
   - Ensure all variables are set

### Debugging Commands

```bash
# Check app logs
az webapp log tail \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system

# Check app settings
az webapp config appsettings list \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system

# Test database connection
az sql db show-connection-string \
  --server mess-feedback-sql-server \
  --name MessFeedbackDB \
  --client sqlcmd
```

## Maintenance

### Regular Tasks

1. **Monitor Application Performance**
   - Check Application Insights metrics
   - Review error logs
   - Monitor database performance

2. **Security Updates**
   - Update dependencies regularly
   - Review access permissions
   - Rotate secrets periodically

3. **Backup Verification**
   - Test backup restoration
   - Verify backup completeness
   - Update disaster recovery procedures

### Scaling

```bash
# Scale up App Service Plan
az appservice plan update \
  --resource-group mess-feedback-rg \
  --name mess-feedback-plan \
  --sku S1

# Scale out (add instances)
az webapp config set \
  --resource-group mess-feedback-rg \
  --name mess-feedback-system \
  --number-of-workers 2

# Scale database
az sql db update \
  --resource-group mess-feedback-rg \
  --server mess-feedback-sql-server \
  --name MessFeedbackDB \
  --service-objective S1
```

This deployment guide provides a comprehensive approach to deploying the Mess Feedback System on Azure with proper CI/CD, security, monitoring, and maintenance procedures.
