# Imagenix API Documentation

Base URL: `/api/v1`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### POST /auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "emailVerified": false
  }
}
```

### POST /auth/login
Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "expiresInSeconds": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "user",
      "plan": "free"
    }
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

### POST /auth/logout
Revoke the current session.

---

## Projects

### GET /projects
List all projects for the authenticated user.

### POST /projects
Create a new project.

**Request Body:**
```json
{
  "name": "My Project",
  "description": "Optional description"
}
```

### GET /projects/:id
Get project details with datasets and label classes.

### PATCH /projects/:id
Update project details.

### DELETE /projects/:id
Delete a project and all its data.

---

## Datasets

### POST /projects/:projectId/datasets
Create a new dataset in a project.

### GET /datasets/:id
Get dataset details.

---

## Images

### POST /datasets/:datasetId/images/upload-url
Get a presigned URL for uploading an image.

### POST /datasets/:datasetId/images/commit
Commit an uploaded image to the dataset.

### GET /datasets/:datasetId/images
List images in a dataset with pagination.

---

## Annotations

### POST /images/:imageId/annotations
Create a new annotation.

**Request Body:**
```json
{
  "labelClassId": "uuid",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150
}
```

### PATCH /annotations/:id
Update an annotation.

### DELETE /annotations/:id
Delete an annotation.

---

## Jobs

### POST /datasets/:datasetId/jobs/auto-annotate
Start an auto-annotation job.

**Request Body:**
```json
{
  "className": "person",
  "confidenceThreshold": 0.35
}
```

### GET /jobs/:id
Get job status and progress.

### POST /jobs/:id/cancel
Cancel a running job.

---

## Exports

### POST /datasets/:datasetId/exports
Create a dataset export.

**Request Body:**
```json
{
  "format": "coco"
}
```

Supported formats: `coco`, `yolo`, `voc`

### GET /exports/:id/download
Get download URL for an export.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of the error",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email format"
      }
    ],
    "requestId": "uuid"
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)
