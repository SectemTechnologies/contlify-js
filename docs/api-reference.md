# Contlify API Reference

Comprehensive HTTP API documentation for `contlify` middleware endpoints.

---

## Authentication & Headers

All API endpoints require API key authentication.

### Required Request Headers

| Header | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `X-Truecmo-Key` | Primary authentication API key header | **Yes** (or fallback headers) | `secret_contlify_api_key_123` |
| `x-api-key` | Secondary API key header fallback | Optional | `secret_contlify_api_key_123` |
| `Authorization` | Bearer token authorization fallback | Optional | `Bearer secret_contlify_api_key_123` |
| `Content-Type` | MIME type for request bodies | For POST/PATCH/PUT | `application/json` |

---

## Endpoints Summary

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/contlify/validate` | Health check & configuration validation |
| `POST` | `/api/contlify/posts` | Create and publish a new blog post |
| `PATCH` | `/api/contlify/posts/:id` | Partial update of an existing blog post |
| `PUT` | `/api/contlify/posts/:id` | Replace or update an existing blog post |
| `GET` | `/api/contlify/authors` | Retrieve list of post authors |
| `GET` | `/api/contlify/categories` | Retrieve list of post categories |
| `GET` | `/api/contlify/tags` | Retrieve list of post tags |

---

## 1. Health Validation (`GET /validate`)

Verifies connectivity, API key validity, system health, and database adapter capabilities.

### Request Example
```bash
curl -X GET "https://yourwebsite.com/api/contlify/validate" \
  -H "X-Truecmo-Key: your_secret_api_key"
```

### Success Response (200 OK)

WordPress / Contlify-compatible top-level fields (used by Contlify “Test connection”):

```json
{
  "status": "success",
  "message": "API key is valid",
  "success": true,
  "valid": true,
  "meta_data": {
    "site_name": "My Blog",
    "site_url": "https://www.example.com",
    "platform": "nextjs",
    "package_version": "1.0.0",
    "adapterConnected": true,
    "capabilities": {
      "posts": true,
      "authors": true,
      "categories": true,
      "tags": true
    }
  },
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
  }
}
```

Set optional `siteName` / `siteUrl` (or `CONTLIFY_SITE_URL`) on `createContlifyHandler` to populate `meta_data`.

---

## 2. Publish Post (`POST /posts`)

Creates and publishes a new blog post. Invokes `adapter.createPost(...)`.

### Request Body Schema

```json
{
  "title": "string (Required)",
  "content": "string (Required)",
  "status": "draft | published | archived | scheduled (Required)",
  "custom_slug": "string (Optional, auto-slugified from title if omitted)",
  "subtitle": "string (Optional)",
  "excerpt": "string (Optional)",
  "featured_image": "string | MediaAsset (Optional)",
  "author": {
    "name": "Jane Doe",
    "slug": "jane-doe",
    "email": "jane@example.com"
  },
  "categories": [
    { "name": "Engineering", "slug": "engineering" }
  ],
  "tags": [
    { "name": "TypeScript", "slug": "typescript" }
  ],
  "seo": {
    "title": "SEO Meta Title",
    "description": "SEO Meta Description",
    "keywords": ["typescript", "npm"]
  },
  "customFields": {}
}
```

### Request Example (cURL)
```bash
curl -X POST "https://yourwebsite.com/api/contlify/posts" \
  -H "X-Truecmo-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Building Production NPM Packages",
    "content": "<p>Content goes here...</p>",
    "status": "published",
    "custom_slug": "building-production-npm-packages",
    "author": { "name": "Alex Smith" }
  }'
```

### Success Response (200 OK)
```json
{
  "status": "success",
  "post_id": "post_123456",
  "post_url": "/blog/building-production-npm-packages",
  "data": { ... }
}
```

---

## 3. Update Post (`PATCH /posts/:id` & `PUT /posts/:id`)

Updates an existing post by ID or slug. Supports partial updates.

### Path Parameters
- `id` (string, Required): The post ID or slug to update.

### Request Body Example
```json
{
  "title": "Updated Post Title",
  "status": "published"
}
```

### Success Response (200 OK)
```json
{
  "status": "success",
  "post_id": "post_123456",
  "post_url": "/blog/updated-post-title",
  "data": { ... }
}
```

---

## 4. Authors Taxonomy (`GET /authors`)

Retrieves available post authors from the storage adapter.

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "author_1",
      "name": "Jane Doe",
      "slug": "jane-doe"
    }
  ]
}
```

---

## 5. Categories Taxonomy (`GET /categories`)

Retrieves available categories from the storage adapter.

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_1",
      "name": "Engineering",
      "slug": "engineering"
    }
  ]
}
```

---

## 6. Tags Taxonomy (`GET /tags`)

Retrieves available post tags from the storage adapter.

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "tag_1",
      "name": "TypeScript",
      "slug": "typescript"
    }
  ]
}
```
