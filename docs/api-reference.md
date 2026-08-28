# Contlify API Reference

Comprehensive HTTP API documentation for `contlify` middleware endpoints.

---

## Authentication & Headers

All API endpoints require API key authentication.

### Supported Authentication Headers

You can supply your API key using any of the following standard headers:

| Header | Format | Example |
| :--- | :--- | :--- |
| `x-api-key` | Raw Key (Standard) | `x-api-key: your_secret_api_key` |
| `Authorization` | Bearer Token | `Authorization: Bearer your_secret_api_key` |
| `X-Truecmo-Key` | Publisher Platform Header | `X-Truecmo-Key: your_secret_api_key` |

---

## Endpoints Summary

All routes are versioned under `/api/contlify/v1`:

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/contlify/v1/validate` | Full system validation, API key check, and database adapter capabilities |
| `GET` | `/api/contlify/v1/health` | Health check endpoint |
| `POST` | `/api/contlify/v1/posts` | Create and publish a new blog post |
| `PATCH` | `/api/contlify/v1/posts/:id` | Partial update of an existing post by ID or slug |
| `PUT` | `/api/contlify/v1/posts/:id` | Full update or replacement of a post by ID or slug |
| `GET` | `/api/contlify/v1/authors` | Retrieve list of authors |
| `GET` | `/api/contlify/v1/categories` | Retrieve list of categories |
| `GET` | `/api/contlify/v1/tags` | Retrieve list of tags |

---

## 1. System Health & Validation (`GET /api/contlify/v1/validate` & `GET /api/contlify/v1/health`)

Verifies connectivity, system health, and database adapter capabilities.

### Request Example
```bash
curl -X GET "https://yourwebsite.com/api/contlify/v1/validate" \
  -H "x-api-key: your_secret_api_key"
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "valid": true,
    "version": "1.0.0",
    "status": "healthy",
    "adapterConnected": true,
    "capabilities": {
      "posts": true,
      "authors": true,
      "categories": true,
      "tags": true
    }
  },
  "meta": {
    "timestamp": "2026-08-27T00:00:00.000Z"
  }
}
```

---

## 2. Publish Post (`POST /api/contlify/v1/posts`)

Creates and publishes a new blog post.

### Request Headers
- `x-api-key`: `your_secret_api_key`
- `Content-Type`: `application/json`

### Request Body Schema

```json
{
  "title": "string (Required)",
  "content": "string (Required)",
  "status": "published | draft | archived | scheduled (Required)",
  "custom_slug": "string (Optional — auto-generated from title if omitted)",
  "subtitle": "string (Optional)",
  "excerpt": "string (Optional)",
  "coverImage": "string | { url: string } (Optional — featured image URL)",
  "author": {
    "name": "Jane Doe",
    "slug": "jane-doe",
    "email": "jane@example.com",
    "bio": "Lead Engineer",
    "avatar": "https://example.com/avatar.jpg"
  },
  "categories": [
    {
      "name": "Engineering",
      "slug": "engineering",
      "coverImage": "https://example.com/category-cover.jpg"
    }
  ],
  "tags": [
    { "name": "Next.js", "slug": "nextjs" },
    { "name": "TypeScript", "slug": "typescript" }
  ],
  "seo": {
    "title": "SEO Meta Title",
    "description": "SEO Meta Description",
    "keywords": ["nextjs", "typescript"]
  },
  "customFields": {
    "readingTime": "5 min",
    "featured": true
  }
}
```

### Request Example (cURL)
```bash
curl -X POST "https://yourwebsite.com/api/contlify/v1/posts" \
  -H "x-api-key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Building with Contlify",
    "content": "<h2>Hello World</h2><p>Article content goes here.</p>",
    "status": "published",
    "custom_slug": "building-with-contlify",
    "author": "Alex Smith",
    "categories": ["Engineering"],
    "tags": ["TypeScript"]
  }'
```

### Success Response (`200 OK`)
```json
{
  "status": "success",
  "post_id": "post_1724789000",
  "slug": "building-with-contlify",
  "post_url": "/blog/building-with-contlify",
  "data": {
    "postId": "post_1724789000",
    "slug": "building-with-contlify",
    "status": "published",
    "action": "created",
    "url": "/blog/building-with-contlify"
  }
}
```

---

## 3. Update Post (`PATCH /api/contlify/v1/posts/:id` & `PUT /api/contlify/v1/posts/:id`)

Updates an existing post by its ID or slug. Supports partial updates via `PATCH`.

### Path Parameters
- `id` (string, Required): The post ID or slug.

### Request Body Example
```json
{
  "title": "Building with Contlify (Updated Edition)",
  "content": "<h2>Updated Guide</h2><p>New content.</p>",
  "status": "published"
}
```

### Success Response (`200 OK`)
```json
{
  "status": "success",
  "post_id": "building-with-contlify",
  "slug": "building-with-contlify",
  "post_url": "/blog/building-with-contlify",
  "data": {
    "postId": "building-with-contlify",
    "slug": "building-with-contlify",
    "status": "published",
    "action": "updated",
    "url": "/blog/building-with-contlify"
  }
}
```

---

## 4. Get Taxonomies (`GET /authors`, `GET /categories`, `GET /tags`)

### Retrieve Categories
```bash
curl -X GET "https://yourwebsite.com/api/contlify/v1/categories" \
  -H "x-api-key: your_secret_api_key"
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_engineering",
      "name": "Engineering",
      "slug": "engineering",
      "coverImage": "https://example.com/cover.jpg",
      "createdAt": "2026-08-27T00:00:00.000Z"
    }
  ]
}
```
