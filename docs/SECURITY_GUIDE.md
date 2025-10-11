# Security Guide

This document outlines the security measures implemented in the Mess Feedback System and best practices for maintaining a secure application.

## Security Architecture Overview

The Mess Feedback System implements multiple layers of security:

1. **Application Layer Security**
2. **Authentication & Authorization**
3. **Data Protection**
4. **Network Security**
5. **Infrastructure Security**
6. **Monitoring & Incident Response**

## Authentication & Authorization

### JWT (JSON Web Tokens)

**Implementation:**
- Secure token-based authentication
- Configurable token expiration (default: 24 hours)
- Stateless authentication mechanism

**Security Features:**
```javascript
// Token generation with secure secret
const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
});

// Token verification middleware
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await getUserById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
```

**Best Practices:**
- Use strong, randomly generated JWT secrets (minimum 256 bits)
- Implement token rotation for long-lived sessions
- Store tokens securely (httpOnly cookies recommended)
- Validate token integrity on every request

### Password Security

**Implementation:**
```javascript
// Password hashing with bcrypt
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Password validation
const isValidPassword = await bcrypt.compare(plainPassword, hashedPassword);
```

**Password Requirements:**
- Minimum 6 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain at least one number
- Special characters recommended

**Security Measures:**
- Passwords hashed using bcrypt with salt rounds = 12
- No plain text password storage
- Password strength validation on client and server
- Account lockout after failed attempts (recommended)

### Role-Based Access Control (RBAC)

**User Roles:**
1. **Student** - Basic user with feedback submission rights
2. **Mess Manager** - Can manage specific mess halls and view reports
3. **Admin** - Full system access and user management

**Authorization Middleware:**
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized`
      });
    }
    next();
  };
};
```

## Input Validation & Sanitization

### Server-Side Validation

**Implementation using express-validator:**
```javascript
// Registration validation
[
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('student_id').isLength({ min: 3, max: 20 }).trim().escape(),
  body('first_name').isLength({ min: 2, max: 100 }).trim().escape()
]
```

**Validation Rules:**
- All user inputs validated before processing
- SQL injection prevention through parameterized queries
- XSS prevention through input sanitization
- File upload validation (if implemented)

### Database Security

**SQL Injection Prevention:**
```javascript
// Using parameterized queries with mssql
const result = await pool.request()
  .input('userId', sql.Int, userId)
  .input('email', sql.NVarChar, email)
  .query('SELECT * FROM users WHERE id = @userId AND email = @email');
```

**Database Security Measures:**
- All queries use parameterized statements
- Principle of least privilege for database users
- Database connection encryption (TLS)
- Regular security updates and patches

## Network Security

### HTTPS/TLS Configuration

**Implementation:**
```javascript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
});
```

**TLS Best Practices:**
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers enabled
- Certificate pinning (recommended)

### CORS (Cross-Origin Resource Sharing)

**Configuration:**
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

## Security Headers

### Helmet.js Implementation

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
}));
```

**Security Headers Applied:**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: same-origin
- X-XSS-Protection: 1; mode=block

## Rate Limiting & DDoS Protection

### Rate Limiting Implementation

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
```

**Rate Limiting Strategy:**
- General API: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 attempts per 15 minutes per IP
- Feedback submission: 10 submissions per hour per user
- Admin endpoints: 200 requests per 15 minutes per IP

### Additional Protection Measures

```javascript
// Request size limiting
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression with security considerations
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

## Data Protection

### Sensitive Data Handling

**Environment Variables:**
```bash
# Never commit these to version control
DB_PASSWORD=secure_database_password
JWT_SECRET=super_secret_jwt_key_256_bits_minimum
AZURE_STORAGE_CONNECTION_STRING=secure_connection_string
```

**Data Encryption:**
- Passwords: bcrypt with salt rounds = 12
- JWT tokens: Signed with HMAC SHA256
- Database connections: TLS encryption
- File uploads: Encrypted at rest (if implemented)

### Privacy Protection

**Anonymous Feedback:**
```javascript
// Anonymous feedback handling
const feedbackData = {
  ...feedback,
  reviewer_name: feedback.is_anonymous ? 'Anonymous' : `${user.first_name} ${user.last_name[0]}.`
};
```

**Data Minimization:**
- Collect only necessary user information
- Automatic data retention policies
- User data export capabilities
- Right to deletion (GDPR compliance)

## Session Management

### Secure Cookie Configuration

```javascript
const cookieOptions = {
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  httpOnly: true, // Prevent XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' // CSRF protection
};

res.cookie('token', token, cookieOptions);
```

**Session Security:**
- HttpOnly cookies prevent XSS attacks
- Secure flag ensures HTTPS-only transmission
- SameSite attribute prevents CSRF attacks
- Automatic session expiration

## Error Handling & Information Disclosure

### Secure Error Handling

```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Don't leak sensitive information
  if (process.env.NODE_ENV === 'production') {
    delete error.stack;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

**Error Handling Best Practices:**
- Generic error messages in production
- Detailed logging for debugging
- No sensitive information in error responses
- Proper HTTP status codes

## Security Monitoring & Logging

### Application Logging

```javascript
// Security event logging
const logSecurityEvent = (event, user, details) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    user: user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    details
  }));
};

// Usage examples
logSecurityEvent('LOGIN_SUCCESS', user, { method: 'password' });
logSecurityEvent('LOGIN_FAILURE', null, { email, reason: 'invalid_password' });
logSecurityEvent('UNAUTHORIZED_ACCESS', user, { endpoint: req.path });
```

### Security Metrics

**Monitor These Events:**
- Failed login attempts
- Unauthorized access attempts
- Rate limit violations
- Unusual user behavior patterns
- Database connection failures
- Token validation failures

## Incident Response

### Security Incident Procedures

1. **Detection**
   - Automated monitoring alerts
   - Log analysis and anomaly detection
   - User reports

2. **Assessment**
   - Determine incident severity
   - Identify affected systems/users
   - Document timeline

3. **Containment**
   - Isolate affected systems
   - Revoke compromised tokens
   - Block malicious IPs

4. **Recovery**
   - Apply security patches
   - Reset compromised credentials
   - Restore from clean backups

5. **Post-Incident**
   - Conduct security review
   - Update security measures
   - Document lessons learned

### Emergency Contacts

```javascript
// Emergency response configuration
const SECURITY_CONTACTS = {
  primary: 'security@yourorganization.com',
  backup: 'admin@yourorganization.com',
  escalation: 'ciso@yourorganization.com'
};
```

## Compliance & Standards

### OWASP Top 10 Compliance

1. **Injection** - ✅ Parameterized queries, input validation
2. **Broken Authentication** - ✅ JWT, bcrypt, session management
3. **Sensitive Data Exposure** - ✅ Encryption, secure headers
4. **XML External Entities** - ✅ No XML processing
5. **Broken Access Control** - ✅ RBAC, authorization middleware
6. **Security Misconfiguration** - ✅ Helmet.js, secure defaults
7. **Cross-Site Scripting** - ✅ CSP, input sanitization
8. **Insecure Deserialization** - ✅ JSON only, validation
9. **Known Vulnerabilities** - ✅ Regular updates, npm audit
10. **Insufficient Logging** - ✅ Comprehensive logging

### Data Protection Regulations

**GDPR Compliance:**
- User consent for data processing
- Right to access personal data
- Right to rectification
- Right to erasure
- Data portability
- Privacy by design

## Security Testing

### Automated Security Testing

```bash
# NPM security audit
npm audit

# Dependency vulnerability scanning
npm audit fix

# OWASP ZAP integration (CI/CD)
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

### Manual Security Testing

**Regular Security Assessments:**
- Penetration testing
- Code security reviews
- Infrastructure security audits
- Social engineering assessments

## Security Maintenance

### Regular Security Tasks

**Daily:**
- Monitor security logs
- Check for failed login attempts
- Review system alerts

**Weekly:**
- Update dependencies
- Review access permissions
- Analyze security metrics

**Monthly:**
- Security patch management
- Access control review
- Backup verification

**Quarterly:**
- Security training updates
- Incident response drills
- Security policy review

### Security Updates

```bash
# Regular dependency updates
npm update
npm audit fix

# Security-focused updates
npm audit fix --force

# Check for outdated packages
npm outdated
```

## Secure Development Practices

### Code Review Checklist

- [ ] Input validation implemented
- [ ] Authentication/authorization checks
- [ ] SQL injection prevention
- [ ] XSS prevention measures
- [ ] Sensitive data protection
- [ ] Error handling security
- [ ] Logging implementation
- [ ] Rate limiting applied

### Security Training

**Developer Security Training Topics:**
- Secure coding practices
- OWASP Top 10 awareness
- Authentication/authorization
- Input validation techniques
- Cryptography best practices
- Incident response procedures

This security guide provides comprehensive coverage of security measures implemented in the Mess Feedback System and should be regularly updated as new threats emerge and security practices evolve.
