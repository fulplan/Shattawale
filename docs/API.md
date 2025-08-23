# EcomBot API Documentation

## Authentication

All admin API endpoints require authentication. Use the `/api/login` endpoint to authenticate.

### POST /api/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "ChangeMe!2025"
}
