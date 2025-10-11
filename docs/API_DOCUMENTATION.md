# API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-app.azurewebsites.net`

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data (if applicable)
  "errors": [] // Validation errors (if applicable)
}
```

## Authentication Endpoints

### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "student_id": "string (3-20 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (min 6 chars, must contain uppercase, lowercase, number, required)",
  "first_name": "string (2-100 chars, required)",
  "last_name": "string (2-100 chars, required)",
  "hostel": "string (max 100 chars, optional)",
  "year_of_study": "integer (1-6, optional)",
  "department": "string (max 100 chars, optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "student_id": "STU001",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student",
    "hostel": "Hostel A",
    "year_of_study": 2,
    "department": "Computer Science"
  }
}
```

### Login User
**POST** `/api/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "login": "string (student_id or email, required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "student_id": "STU001",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student"
  }
}
```

### Get Current User
**GET** `/api/auth/me`

Get current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "student_id": "STU001",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student",
    "hostel": "Hostel A",
    "year_of_study": 2,
    "department": "Computer Science"
  }
}
```

### Update Profile
**PUT** `/api/auth/profile`

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "first_name": "string (2-100 chars, optional)",
  "last_name": "string (2-100 chars, optional)",
  "hostel": "string (max 100 chars, optional)",
  "year_of_study": "integer (1-6, optional)",
  "department": "string (max 100 chars, optional)"
}
```

### Change Password
**PUT** `/api/auth/password`

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (min 6 chars, must contain uppercase, lowercase, number, required)"
}
```

### Logout
**POST** `/api/auth/logout`

Logout user and clear authentication cookie.

**Response (200):**
```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

## Feedback Endpoints

### Get Mess Halls
**GET** `/api/feedback/mess-halls`

Get list of all active mess halls.

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Main Mess Hall",
      "location": "Campus Center",
      "capacity": 500,
      "is_active": true,
      "manager_name": "John Manager"
    }
  ]
}
```

### Get Daily Menu
**GET** `/api/feedback/mess-halls/:id/menu`

Get daily menu for a specific mess hall.

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "daily_menu_id": 1,
      "meal_type": "breakfast",
      "menu_date": "2024-01-15",
      "items": [
        {
          "id": 1,
          "name": "Scrambled Eggs",
          "category": "breakfast",
          "description": "Fresh scrambled eggs",
          "is_vegetarian": true
        }
      ]
    }
  ]
}
```

### Submit Feedback
**POST** `/api/feedback`

Submit feedback for a mess hall.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "mess_hall_id": "integer (required)",
  "daily_menu_id": "integer (optional)",
  "overall_rating": "integer (1-5, required)",
  "food_quality_rating": "integer (1-5, optional)",
  "service_rating": "integer (1-5, optional)",
  "cleanliness_rating": "integer (1-5, optional)",
  "value_rating": "integer (1-5, optional)",
  "comments": "string (max 1000 chars, optional)",
  "suggestions": "string (max 1000 chars, optional)",
  "is_anonymous": "boolean (optional, default: false)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get User Feedback History
**GET** `/api/feedback/my-feedback`

Get current user's feedback history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 2,
  "data": [
    {
      "id": 1,
      "overall_rating": 4,
      "food_quality_rating": 4,
      "service_rating": 3,
      "cleanliness_rating": 5,
      "value_rating": 4,
      "comments": "Great food!",
      "suggestions": "Improve service speed",
      "is_anonymous": false,
      "created_at": "2024-01-15T10:30:00Z",
      "mess_hall_name": "Main Mess Hall",
      "mess_hall_location": "Campus Center",
      "meal_type": "lunch",
      "menu_date": "2024-01-15"
    }
  ]
}
```

### Get Mess Hall Statistics
**GET** `/api/feedback/mess-halls/:id/stats`

Get statistics for a specific mess hall.

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30, max: 365)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period_days": 30,
    "total_feedback": 150,
    "average_ratings": {
      "overall": 4.2,
      "food_quality": 4.1,
      "service": 3.8,
      "cleanliness": 4.5,
      "value": 4.0
    },
    "rating_distribution": [
      {
        "overall_rating": 5,
        "count": 60
      },
      {
        "overall_rating": 4,
        "count": 45
      }
    ],
    "daily_trends": [
      {
        "date": "2024-01-15",
        "avg_rating": 4.3,
        "feedback_count": 12
      }
    ]
  }
}
```

### Get Recent Feedback
**GET** `/api/feedback/mess-halls/:id/recent`

Get recent feedback for a specific mess hall.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 20)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "page": 1,
  "data": [
    {
      "id": 1,
      "overall_rating": 4,
      "food_quality_rating": 4,
      "service_rating": 3,
      "cleanliness_rating": 5,
      "value_rating": 4,
      "comments": "Great food quality!",
      "suggestions": "Improve service speed",
      "is_anonymous": false,
      "created_at": "2024-01-15T10:30:00Z",
      "reviewer_name": "John D.",
      "year_of_study": 2,
      "department": "Computer Science",
      "meal_type": "lunch",
      "menu_date": "2024-01-15"
    }
  ]
}
```

## Admin Endpoints

All admin endpoints require authentication and admin/mess_manager role.

### Get Dashboard Data
**GET** `/api/admin/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1250,
      "total_mess_halls": 5,
      "feedback_last_30_days": 450,
      "avg_rating_last_30_days": 4.2
    },
    "daily_trends": [
      {
        "date": "2024-01-15",
        "feedback_count": 25,
        "avg_rating": 4.3
      }
    ],
    "mess_hall_performance": [
      {
        "id": 1,
        "name": "Main Mess Hall",
        "location": "Campus Center",
        "feedback_count": 150,
        "avg_rating": 4.2
      }
    ]
  }
}
```

### Get All Users
**GET** `/api/admin/users`

Get list of all users (admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search term for name, email, or student ID
- `role` (optional): Filter by role (student, admin, mess_manager)

**Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 1250,
  "page": 1,
  "pages": 63,
  "data": [
    {
      "id": 1,
      "student_id": "STU001",
      "email": "student@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "hostel": "Hostel A",
      "year_of_study": 2,
      "department": "Computer Science",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Update User Status
**PUT** `/api/admin/users/:id/status`

Update user active status (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "is_active": "boolean (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User activated successfully",
  "data": {
    "id": 1,
    "student_id": "STU001",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  }
}
```

### Get Mess Halls (Admin View)
**GET** `/api/admin/mess-halls`

Get all mess halls with admin details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "Main Mess Hall",
      "location": "Campus Center",
      "capacity": 500,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "manager_name": "John Manager",
      "manager_email": "manager@example.com",
      "total_feedback": 150,
      "avg_rating": 4.2
    }
  ]
}
```

### Create Mess Hall
**POST** `/api/admin/mess-halls`

Create a new mess hall (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string (2-100 chars, required)",
  "location": "string (max 255 chars, optional)",
  "capacity": "integer (min 1, optional)",
  "manager_id": "integer (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Mess hall created successfully",
  "data": {
    "id": 6,
    "name": "New Mess Hall",
    "location": "North Campus",
    "capacity": 300,
    "manager_id": 2,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Update Mess Hall
**PUT** `/api/admin/mess-halls/:id`

Update mess hall details (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string (2-100 chars, optional)",
  "location": "string (max 255 chars, optional)",
  "capacity": "integer (min 1, optional)",
  "manager_id": "integer (optional)",
  "is_active": "boolean (optional)"
}
```

### Generate Feedback Report
**GET** `/api/admin/feedback/report`

Generate detailed feedback report.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `mess_hall_id` (optional): Filter by mess hall ID
- `start_date` (optional): Start date (YYYY-MM-DD format)
- `end_date` (optional): End date (YYYY-MM-DD format)
- `rating_filter` (optional): Filter by rating (1-5)

**Response (200):**
```json
{
  "success": true,
  "count": 25,
  "filters": {
    "mess_hall_id": "1",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "rating_filter": null
  },
  "data": [
    {
      "id": 1,
      "overall_rating": 4,
      "food_quality_rating": 4,
      "service_rating": 3,
      "cleanliness_rating": 5,
      "value_rating": 4,
      "comments": "Great food quality!",
      "suggestions": "Improve service speed",
      "is_anonymous": false,
      "created_at": "2024-01-15T10:30:00Z",
      "mess_hall_name": "Main Mess Hall",
      "mess_hall_location": "Campus Center",
      "reviewer_name": "John Doe",
      "student_id": "STU001",
      "hostel": "Hostel A",
      "year_of_study": 2,
      "department": "Computer Science",
      "meal_type": "lunch",
      "menu_date": "2024-01-15"
    }
  ]
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Password must be at least 6 characters long",
      "param": "password",
      "location": "body"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "User role student is not authorized to access this route"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Server Error"
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: Additional rate limiting may apply

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

## Health Check

### Health Check Endpoint
**GET** `/health`

Check application health status.

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```
