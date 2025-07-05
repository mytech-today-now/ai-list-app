# AI ToDo MCP Backend API Documentation

## Overview

This API provides comprehensive CRUD operations for managing lists, items, agents, and sessions with proper HTTP status codes, validation, and error handling. It also includes bulk operations for efficient batch processing.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, authentication is handled via headers:
- `X-User-ID`: User identifier
- `X-Agent-ID`: Agent identifier
- `X-Correlation-ID`: Request correlation ID (optional, auto-generated if not provided)

## Response Format

All API responses follow a standardized format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string,
  "correlationId": string,
  "timestamp": string,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or malformed request |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists or constraint violation |
| 422 | Unprocessable Entity - Invalid reference to related resource |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Lists API

### GET /api/lists

Get all lists with optional filtering and pagination.

**Query Parameters:**
- `tree` (string, optional): Set to "true" to get hierarchical tree structure
- `parent` (string, optional): Filter by parent list ID (use "null" for root lists)
- `status` (string, optional): Filter by status (active, completed, archived, deleted)
- `priority` (string, optional): Filter by priority (low, medium, high, urgent)
- `include` (string, optional): Include related data (children, items, breadcrumbs)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Response:**
- **200**: Success with lists data
- **400**: Invalid query parameters
- **500**: Server error

### GET /api/lists/:id

Get a specific list by ID.

**Path Parameters:**
- `id` (string, required): List UUID

**Query Parameters:**
- `include` (string, optional): Include related data (children, items, breadcrumbs)

**Response:**
- **200**: Success with list data
- **400**: Invalid UUID format
- **404**: List not found
- **500**: Server error

### POST /api/lists

Create a new list.

**Request Body:**
```json
{
  "title": "string (required, max 500 chars)",
  "description": "string (optional)",
  "parentListId": "string (optional, UUID)",
  "priority": "low|medium|high|urgent (optional, default: medium)",
  "status": "active|completed|archived|deleted (optional, default: active)"
}
```

**Response:**
- **201**: List created successfully
- **400**: Validation error
- **409**: Conflict (duplicate)
- **500**: Server error

### PUT /api/lists/:id

Update a list (full update).

**Path Parameters:**
- `id` (string, required): List UUID

**Request Body:**
```json
{
  "title": "string (optional, max 500 chars)",
  "description": "string (optional)",
  "priority": "low|medium|high|urgent (optional)",
  "status": "active|completed|archived|deleted (optional)",
  "completedAt": "date (optional)"
}
```

**Response:**
- **200**: List updated successfully
- **400**: Validation error
- **404**: List not found
- **500**: Server error

### PATCH /api/lists/:id

Partially update a list.

**Path Parameters:**
- `id` (string, required): List UUID

**Request Body:** Same as PUT but all fields are optional

**Response:**
- **200**: List updated successfully
- **400**: Validation error
- **404**: List not found
- **500**: Server error

### DELETE /api/lists/:id

Delete a list.

**Path Parameters:**
- `id` (string, required): List UUID

**Response:**
- **200**: List deleted successfully
- **404**: List not found
- **500**: Server error

### HEAD /api/lists/:id

Check if a list exists.

**Path Parameters:**
- `id` (string, required): List UUID

**Response:**
- **200**: List exists
- **404**: List not found
- **500**: Server error

### POST /api/lists/:id/move

Move a list to a new parent.

**Path Parameters:**
- `id` (string, required): List UUID

**Request Body:**
```json
{
  "parentId": "string (optional, UUID or null)"
}
```

**Response:**
- **200**: List moved successfully
- **400**: Validation error (circular reference)
- **404**: List not found
- **500**: Server error

### POST /api/lists/:id/reorder

Reorder a list within its parent.

**Path Parameters:**
- `id` (string, required): List UUID

**Request Body:**
```json
{
  "position": "number (required, >= 0)"
}
```

**Response:**
- **200**: List reordered successfully
- **400**: Validation error
- **404**: List not found
- **500**: Server error

### POST /api/lists/:id/archive

Archive a list and its children.

**Path Parameters:**
- `id` (string, required): List UUID

**Response:**
- **200**: List archived successfully
- **404**: List not found
- **500**: Server error

### POST /api/lists/:id/complete

Mark a list as completed.

**Path Parameters:**
- `id` (string, required): List UUID

**Response:**
- **200**: List completed successfully
- **404**: List not found
- **500**: Server error

### GET /api/lists/:id/stats

Get statistics for a list.

**Path Parameters:**
- `id` (string, required): List UUID

**Response:**
- **200**: Success with statistics
- **404**: List not found
- **500**: Server error

## Items API

### GET /api/items

Get all items with optional filtering and pagination.

**Query Parameters:**
- `listId` (string, optional): Filter by list ID (UUID)
- `status` (string, optional): Filter by status (pending, in_progress, completed, blocked)
- `priority` (string, optional): Filter by priority (low, medium, high, urgent)
- `assignedTo` (string, optional): Filter by assignee
- `overdue` (string, optional): Set to "true" to get overdue items
- `dueSoon` (number, optional): Get items due within specified hours
- `include` (string, optional): Include related data (dependencies)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Response:**
- **200**: Success with items data
- **400**: Invalid query parameters
- **500**: Server error

### GET /api/items/:id

Get a specific item by ID.

**Path Parameters:**
- `id` (string, required): Item UUID

**Query Parameters:**
- `include` (string, optional): Include related data (dependencies)

**Response:**
- **200**: Success with item data
- **400**: Invalid UUID format
- **404**: Item not found
- **500**: Server error

### POST /api/items

Create a new item.

**Request Body:**
```json
{
  "listId": "string (required, UUID)",
  "title": "string (required, max 500 chars)",
  "description": "string (optional)",
  "priority": "low|medium|high|urgent (optional, default: medium)",
  "status": "pending|in_progress|completed|blocked (optional, default: pending)",
  "dueDate": "date (optional)",
  "estimatedDuration": "number (optional, >= 0, in minutes)",
  "tags": "array of strings (optional)",
  "assignedTo": "string (optional)",
  "dependencies": "array of UUIDs (optional)"
}
```

**Response:**
- **201**: Item created successfully
- **400**: Validation error
- **409**: Conflict (duplicate)
- **500**: Server error

### PUT /api/items/:id

Update an item (full update).

**Path Parameters:**
- `id` (string, required): Item UUID

**Request Body:**
```json
{
  "title": "string (optional, max 500 chars)",
  "description": "string (optional)",
  "priority": "low|medium|high|urgent (optional)",
  "status": "pending|in_progress|completed|blocked (optional)",
  "dueDate": "date (optional)",
  "estimatedDuration": "number (optional, >= 0, in minutes)",
  "actualDuration": "number (optional, >= 0, in minutes)",
  "tags": "array of strings (optional)",
  "assignedTo": "string (optional)",
  "completedAt": "date (optional)"
}
```

**Response:**
- **200**: Item updated successfully
- **400**: Validation error
- **404**: Item not found
- **500**: Server error

### PATCH /api/items/:id

Partially update an item.

**Path Parameters:**
- `id` (string, required): Item UUID

**Request Body:** Same as PUT but all fields are optional

**Response:**
- **200**: Item updated successfully
- **400**: Validation error
- **404**: Item not found
- **500**: Server error

### DELETE /api/items/:id

Delete an item.

**Path Parameters:**
- `id` (string, required): Item UUID

**Response:**
- **200**: Item deleted successfully
- **404**: Item not found
- **500**: Server error

### HEAD /api/items/:id

Check if an item exists.

**Path Parameters:**
- `id` (string, required): Item UUID

**Response:**
- **200**: Item exists
- **404**: Item not found
- **500**: Server error

### POST /api/items/:id/complete

Mark an item as completed.

**Path Parameters:**
- `id` (string, required): Item UUID

**Response:**
- **200**: Item completed successfully
- **404**: Item not found
- **500**: Server error

### POST /api/items/:id/start

Mark an item as in progress.

**Path Parameters:**
- `id` (string, required): Item UUID

**Response:**
- **200**: Item started successfully
- **400**: Dependencies not completed
- **404**: Item not found
- **500**: Server error

### POST /api/items/:id/move

Move an item to a different list.

**Path Parameters:**
- `id` (string, required): Item UUID

**Request Body:**
```json
{
  "listId": "string (required, UUID)"
}
```

**Response:**
- **200**: Item moved successfully
- **400**: Validation error
- **404**: Item not found
- **500**: Server error

### POST /api/items/:id/duplicate

Duplicate an item.

**Path Parameters:**
- `id` (string, required): Item UUID

**Request Body:**
```json
{
  "listId": "string (optional, UUID)"
}
```

**Response:**
- **201**: Item duplicated successfully
- **404**: Item not found
- **500**: Server error

## Bulk Operations API

The bulk operations API allows efficient batch processing of multiple items or lists in a single request. All bulk operations support partial success scenarios and provide detailed error reporting.

### Common Bulk Response Format

All bulk operations return a standardized response format:

```json
{
  "success": boolean,
  "data": {
    "results": [/* Successfully processed items */],
    "summary": {
      "total": number,
      "successful": number,
      "failed": number
    },
    "errors": [
      {
        "index": number,
        "id": "string (optional)",
        "error": "string",
        "details": any
      }
    ]
  },
  "message": "string",
  "correlationId": "string",
  "timestamp": "string"
}
```

### HTTP Status Codes for Bulk Operations

- **200/201**: All operations successful
- **207**: Partial success (some operations succeeded, some failed)
- **400**: Validation error or all operations failed
- **429**: Rate limit exceeded (bulk operations have stricter limits)
- **500**: Server error

### Bulk Items Operations

#### POST /api/bulk/items/create

Bulk create multiple items.

**Request Body:**
```json
{
  "items": [
    {
      "listId": "string (required, UUID)",
      "title": "string (required, max 500 chars)",
      "description": "string (optional)",
      "priority": "low|medium|high|urgent (optional, default: medium)",
      "status": "pending|in_progress|completed|blocked (optional, default: pending)",
      "dueDate": "date (optional)",
      "estimatedDuration": "number (optional, >= 0, in minutes)",
      "tags": "array of strings (optional)",
      "assignedTo": "string (optional)",
      "dependencies": "array of UUIDs (optional)"
    }
  ],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "validateDependencies": "boolean (optional, default: true)"
  }
}
```

**Limits:** Maximum 100 items per request

**Response:**
- **201**: All items created successfully
- **207**: Partial success
- **400**: Validation error or all items failed

#### PUT /api/bulk/items/update

Bulk update multiple items.

**Request Body:**
```json
{
  "updates": [
    {
      "id": "string (required, UUID)",
      "data": {
        "title": "string (optional, max 500 chars)",
        "description": "string (optional)",
        "priority": "low|medium|high|urgent (optional)",
        "status": "pending|in_progress|completed|blocked (optional)",
        "dueDate": "date (optional)",
        "estimatedDuration": "number (optional, >= 0, in minutes)",
        "actualDuration": "number (optional, >= 0, in minutes)",
        "tags": "array of strings (optional)",
        "assignedTo": "string (optional)",
        "completedAt": "date (optional)"
      }
    }
  ],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "validateDependencies": "boolean (optional, default: true)"
  }
}
```

**Limits:** Maximum 100 items per request

**Response:**
- **200**: All items updated successfully
- **207**: Partial success
- **400**: Validation error or all items failed

#### DELETE /api/bulk/items/delete

Bulk delete multiple items.

**Request Body:**
```json
{
  "ids": ["string (UUID)"],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "force": "boolean (optional, default: false)"
  }
}
```

**Limits:** Maximum 100 items per request

**Response:**
- **200**: All items deleted successfully
- **207**: Partial success
- **400**: Validation error or all items failed

#### PATCH /api/bulk/items/status

Bulk update item status with dependency validation.

**Request Body:**
```json
{
  "ids": ["string (UUID)"],
  "status": "pending|in_progress|completed|blocked",
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "updateTimestamps": "boolean (optional, default: true)"
  }
}
```

**Limits:** Maximum 100 items per request

**Response:**
- **200**: All items updated successfully
- **207**: Partial success
- **400**: Validation error or dependency conflicts

#### PATCH /api/bulk/items/move

Bulk move items to a different list.

**Request Body:**
```json
{
  "ids": ["string (UUID)"],
  "targetListId": "string (required, UUID)",
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "preservePosition": "boolean (optional, default: false)"
  }
}
```

**Limits:** Maximum 100 items per request

**Response:**
- **200**: All items moved successfully
- **207**: Partial success
- **400**: Validation error or all items failed

### Bulk Lists Operations

#### POST /api/bulk/lists/create

Bulk create multiple lists.

**Request Body:**
```json
{
  "lists": [
    {
      "title": "string (required, max 500 chars)",
      "description": "string (optional)",
      "parentListId": "string (optional, UUID)",
      "priority": "low|medium|high|urgent (optional, default: medium)",
      "status": "active|completed|archived|deleted (optional, default: active)"
    }
  ],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "validateHierarchy": "boolean (optional, default: true)"
  }
}
```

**Limits:** Maximum 50 lists per request

**Response:**
- **201**: All lists created successfully
- **207**: Partial success
- **400**: Validation error or all lists failed

#### PUT /api/bulk/lists/update

Bulk update multiple lists.

**Request Body:**
```json
{
  "updates": [
    {
      "id": "string (required, UUID)",
      "data": {
        "title": "string (optional, max 500 chars)",
        "description": "string (optional)",
        "priority": "low|medium|high|urgent (optional)",
        "status": "active|completed|archived|deleted (optional)",
        "completedAt": "date (optional)"
      }
    }
  ],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "validateHierarchy": "boolean (optional, default: true)"
  }
}
```

**Limits:** Maximum 50 lists per request

**Response:**
- **200**: All lists updated successfully
- **207**: Partial success
- **400**: Validation error or all lists failed

#### DELETE /api/bulk/lists/delete

Bulk delete multiple lists.

**Request Body:**
```json
{
  "ids": ["string (UUID)"],
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "force": "boolean (optional, default: false)",
    "deleteItems": "boolean (optional, default: false)"
  }
}
```

**Limits:** Maximum 50 lists per request

**Response:**
- **200**: All lists deleted successfully
- **207**: Partial success
- **400**: Validation error or all lists failed

#### PATCH /api/bulk/lists/status

Bulk update list status with hierarchy validation.

**Request Body:**
```json
{
  "ids": ["string (UUID)"],
  "status": "active|completed|archived|deleted",
  "options": {
    "continueOnError": "boolean (optional, default: false)",
    "updateTimestamps": "boolean (optional, default: true)",
    "cascadeToItems": "boolean (optional, default: false)"
  }
}
```

**Limits:** Maximum 50 lists per request

**Response:**
- **200**: All lists updated successfully
- **207**: Partial success
- **400**: Validation error or hierarchy conflicts

### Bulk Operations Rate Limiting

Bulk operations have stricter rate limits:
- **10 bulk requests per 15 minutes** per IP
- **Maximum 100 items or 50 lists per request**
- **Batch processing** with configurable batch sizes for performance

### Bulk Operations Best Practices

1. **Use continueOnError: true** for large batches where partial success is acceptable
2. **Monitor the summary** in responses to track success/failure rates
3. **Handle 207 status codes** appropriately for partial success scenarios
4. **Validate dependencies** when updating item status to completed
5. **Use smaller batch sizes** for better performance and error isolation
6. **Include correlation IDs** for tracking and debugging bulk operations

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "correlationId": "request-correlation-id",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists or constraint violation
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## Rate Limiting

The API implements rate limiting:
- **100 requests per 15 minutes** in production
- **1000 requests per 15 minutes** in development
- **100 validation attempts per minute** per IP

Rate limit headers are included in responses:
- `RateLimit-Limit`: Request limit
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Reset time

## Validation

All request data is validated using Zod schemas with detailed error messages. Validation errors return a 400 status code with specific field-level error information.

## Correlation IDs

Every request includes a correlation ID for tracking and debugging. If not provided in the `X-Correlation-ID` header, one is automatically generated.
