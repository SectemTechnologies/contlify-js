# Contlify Error Architecture & Troubleshooting Guide

Complete catalog of standardized error responses returned by `contlify` middleware.

---

## Standardized Error Payload Format

All failed operations return a predictable JSON payload:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of error",
    "details": [...]
  },
  "meta": {
    "timestamp": "2026-08-06T00:00:00.000Z"
  }
}
```

---

## Error Catalog

### 1. `UNAUTHORIZED` (HTTP 401)
- **Description**: Authentication failed because `X-Truecmo-Key` header was missing or did not match configured API key.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing API key in request headers (X-Truecmo-Key required)"
    }
  }
  ```
- **Resolution**: Verify that request header `X-Truecmo-Key` matches `CONTLIFY_API_KEY` set in your `.env` or `createContlifyHandler({ apiKey })`.

---

### 2. `VALIDATION_ERROR` (HTTP 400)
- **Description**: The request body is missing required fields (`title`, `content`, `status`) or contains invalid field types.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Payload validation failed",
      "details": [
        { "field": "title", "message": "Field 'title' is required and must be a non-empty string" }
      ]
    }
  }
  ```
- **Resolution**: Check request body to ensure all required fields are populated correctly.

---

### 3. `NOT_FOUND` (HTTP 404)
- **Description**: Requested route endpoint does not exist.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Route GET /api/contlify/invalid-route not found"
    }
  }
  ```
- **Resolution**: Check the API path and ensure catch-all route handler `app/api/contlify/[...path]/route.ts` is configured properly.

---

### 4. `METHOD_NOT_ALLOWED` (HTTP 405)
- **Description**: Path exists but target HTTP method is unsupported (e.g. `DELETE /validate`).
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "METHOD_NOT_ALLOWED",
      "message": "Method DELETE not allowed for path /api/contlify/validate"
    }
  }
  ```
- **Resolution**: Use supported HTTP methods (`GET`, `POST`, `PATCH`, `PUT`).

---

### 5. `ADAPTER_ERROR` (HTTP 500)
- **Description**: Storage adapter failed during database execution or adapter is unconfigured.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ADAPTER_ERROR",
      "message": "Storage adapter is not configured in Contlify handler options"
    }
  }
  ```
- **Resolution**: Pass a valid `ContlifyAdapter` implementation into `createContlifyHandler({ adapter })`.

---

### 6. `INTERNAL_ERROR` (HTTP 500)
- **Description**: Unhandled runtime error occurred inside server pipeline. Internal stack traces are hidden from API consumers for security.
- **Resolution**: Check server console logs (`[contlify:error]`) for exact diagnostic trace.
