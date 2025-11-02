# 🍽️ Mess Feedback System

[![Security Scanning](https://github.com/Bharath042/mess-feedback-system/actions/workflows/security-scan.yml/badge.svg)](https://github.com/Bharath042/mess-feedback-system/actions/workflows/security-scan.yml)
[![CI/CD Pipeline](https://github.com/Bharath042/mess-feedback-system/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Bharath042/mess-feedback-system/actions/workflows/ci-cd.yml)

A comprehensive web application for students to rate and provide feedback on mess food quality, built with modern web technologies and deployed on Azure cloud platform using **Infrastructure as Code (Terraform)** and **CI/CD pipelines**.

## 🏗️ Architecture

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **Database**: Azure SQL Database
- **Container**: Docker + Azure Container Registry (ACR)
- **Hosting**: Azure Container Instances (ACI)
- **Infrastructure**: Terraform (Infrastructure as Code)
- **CI/CD**: Azure DevOps Pipelines
- **Security**: Azure Key Vault for secrets management

## 🌐 Live Application

- **Main App**: [http://mess-feedback-system-prod.centralindia.azurecontainer.io:3000](http://mess-feedback-system-prod.centralindia.azurecontainer.io:3000)
- **Student Portal**: [Student Login](http://mess-feedback-system-prod.centralindia.azurecontainer.io:3000/student-login)
- **Admin Dashboard**: [Admin Portal](http://mess-feedback-system-prod.centralindia.azurecontainer.io:3000/admin-dashboard)

## 🚀 Features

### For Students
- **User Authentication**: Secure registration and login system
- **Feedback Submission**: Rate mess food on multiple criteria (food quality, service, cleanliness, value)
- **Anonymous Feedback**: Option to submit feedback anonymously
- **Feedback History**: View personal feedback history
- **Real-time Statistics**: View mess performance statistics and trends

### For Administrators
- **Dashboard**: Comprehensive overview of system metrics
- **User Management**: Manage student accounts and permissions
- **Mess Hall Management**: Add and configure mess halls
- **Detailed Reports**: Generate feedback reports with filters
- **Analytics**: View trends and performance metrics

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Protection against abuse and spam
- **Input Validation**: Comprehensive server-side validation
- **CORS Protection**: Secure cross-origin resource sharing
- **Helmet.js**: Security headers and protection

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: Azure SQL Database
- **Frontend**: Vanilla JavaScript with modern ES6+
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet.js, bcrypt, express-rate-limit
- **DevOps**: Azure Pipelines for CI/CD

### Database Schema
- **Users**: Student information and authentication
- **Mess Halls**: Mess hall details and management
- **Menu Items**: Food items and categories
- **Daily Menus**: Daily meal planning
- **Feedback**: Student feedback and ratings
- **Feedback Images**: Optional image attachments

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Azure SQL Database
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mess-feedback-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_SERVER=your-azure-sql-server.database.windows.net
   DB_DATABASE=MessFeedbackDB
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_PORT=1433

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   - Create an Azure SQL Database
   - The application will automatically create tables on first run
   - Ensure your IP is whitelisted in Azure SQL firewall rules

5. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The application will be ready to use

## 🚀 Deployment

### Azure Deployment

The application is configured for deployment on Azure using Azure Pipelines.

#### Prerequisites
- Azure subscription
- Azure SQL Database
- Azure App Service (Linux)
- Azure DevOps project

#### Deployment Steps

1. **Create Azure Resources**
   ```bash
   # Create resource group
   az group create --name mess-feedback-rg --location "East US"

   # Create SQL Server
   az sql server create --name mess-feedback-sql-server --resource-group mess-feedback-rg --location "East US" --admin-user sqladmin --admin-password YourPassword123!

   # Create SQL Database
   az sql db create --resource-group mess-feedback-rg --server mess-feedback-sql-server --name MessFeedbackDB --service-objective Basic

   # Create App Service Plan
   az appservice plan create --name mess-feedback-plan --resource-group mess-feedback-rg --sku B1 --is-linux

   # Create Web App
   az webapp create --resource-group mess-feedback-rg --plan mess-feedback-plan --name mess-feedback-system --runtime "NODE|18-lts"
   ```

2. **Configure Azure Pipelines**
   - Connect your repository to Azure DevOps
   - Use the provided `azure-pipelines.yml` file
   - Configure the following pipeline variables:
     - `azureSubscription`: Your Azure service connection
     - `webAppName`: Your Azure Web App name
     - `resourceGroupName`: Your resource group name
     - Database connection variables for each environment

3. **Set Environment Variables**
   Configure the following app settings in Azure App Service:
   ```
   NODE_ENV=production
   DB_SERVER=your-server.database.windows.net
   DB_DATABASE=MessFeedbackDB
   DB_USER=your-username
   DB_PASSWORD=your-password
   JWT_SECRET=your-production-jwt-secret
   ```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - User logout

### Feedback Endpoints
- `GET /api/feedback/mess-halls` - Get all mess halls
- `GET /api/feedback/mess-halls/:id/menu` - Get daily menu
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/my-feedback` - Get user's feedback history
- `GET /api/feedback/mess-halls/:id/stats` - Get mess hall statistics
- `GET /api/feedback/mess-halls/:id/recent` - Get recent feedback

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/mess-halls` - Get mess halls (admin view)
- `POST /api/admin/mess-halls` - Create mess hall
- `PUT /api/admin/mess-halls/:id` - Update mess hall
- `GET /api/admin/feedback/report` - Generate feedback reports

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint testing
- **Security Tests**: Authentication and authorization testing

## 🔒 Security Considerations

### Implemented Security Measures
- **Authentication**: JWT-based secure authentication
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Server-side validation using express-validator
- **SQL Injection Protection**: Parameterized queries with mssql
- **XSS Protection**: Content Security Policy headers
- **CORS**: Configured for specific origins
- **Security Headers**: Helmet.js for various security headers

### Best Practices
- Regular security audits with `npm audit`
- Environment variable protection
- Secure session management
- HTTPS enforcement in production
- Regular dependency updates

## 📈 Monitoring & Analytics

### Health Monitoring
- Health check endpoint: `/health`
- Application logging with Morgan
- Error tracking and reporting
- Performance monitoring

### Analytics Features
- Feedback trends and statistics
- User engagement metrics
- Mess hall performance analytics
- Rating distribution analysis

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- ESLint for code linting
- Prettier for code formatting
- Conventional commits for commit messages
- Comprehensive testing for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [Issues](../../issues) page for common problems
- Create a new issue for bugs or feature requests
- Contact the development team for urgent issues

### Troubleshooting

#### Common Issues

1. **Database Connection Issues**
   - Verify Azure SQL firewall settings
   - Check connection string format
   - Ensure database exists and user has permissions

2. **Authentication Problems**
   - Verify JWT_SECRET is set correctly
   - Check token expiration settings
   - Ensure CORS is configured properly

3. **Deployment Issues**
   - Verify Azure service connections
   - Check environment variables in App Service
   - Review pipeline logs for specific errors

## 🔄 Changelog

### Version 1.0.0 (Current)
- Initial release with core functionality
- User authentication and authorization
- Feedback submission and management
- Admin dashboard and reporting
- Azure deployment configuration
- Comprehensive security implementation

## 🎯 Roadmap

### Upcoming Features
- Mobile application (React Native)
- Email notifications for feedback responses
- Advanced analytics and reporting
- Integration with mess management systems
- Multi-language support
- Push notifications
- Offline feedback capability

### Performance Improvements
- Database query optimization
- Caching implementation (Redis)
- CDN integration for static assets
- Image optimization and compression

---

**Built with ❤️ for improving student dining experiences**
