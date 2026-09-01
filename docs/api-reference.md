# 📚 Contlify REST API Reference

Comprehensive HTTP REST API documentation for `contlify` publishing and management endpoints.

---

## 🔐 Authentication & Headers

All mutating and administrative endpoints require API key authentication.

### Supported Authentication Headers

You can supply your API key using any of the following standard headers:

| Header | Format | Description |
| :--- | :--- | :--- |
| `X-Contlify-Key` | Raw Secret Key | **Primary v2 Header (Recommended)** |
| `x-api-key` | Raw Secret Key | Universal standard API key header |
| `Authorization` | Bearer Token (`Bearer <key>`) | Standard OAuth/Bearer Authorization header |
| `X-Truecmo-Key` | Raw Secret Key | Legacy v1 backward-compatibility header |

---

## 📑 Endpoints Summary

All routes are versioned under `/api/contlify/v1`:

| Method | Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/contlify/v1/validate` | ✅ Yes | Full system validation, API key verification, and database adapter capabilities |
| `GET` | `/api/contlify/v1/health` | ✅ Yes | Health check endpoint |
| `POST` | `/api/contlify/v1/posts` | ✅ Yes | Create and publish a new blog post |
| `GET` | `/api/contlify/v1/posts/:id` | ✅ Yes | Fetch a single post by ID or slug |
| `PATCH` | `/api/contlify/v1/posts/:id` | ✅ Yes | Partial update of an existing post by ID or slug |
| `PUT` | `/api/contlify/v1/posts/:id` | ✅ Yes | Full update or replacement of a post by ID or slug |
| `GET` | `/api/contlify/v1/categories` | ✅ Yes | Retrieve list of all categories with post counts |
| `PATCH` | `/api/contlify/v1/categories/:id` | ✅ Yes | Partial update of an existing category by ID or slug |
| `PUT` | `/api/contlify/v1/categories/:id` | ✅ Yes | Full update of an existing category by ID or slug |
| `GET` | `/api/contlify/v1/tags` | ✅ Yes | Retrieve list of all tags with post counts |
| `GET` | `/api/contlify/v1/authors` | ✅ Yes | Retrieve list of all authors |

---

## 1. System Health & Validation (`GET /validate` & `GET /health`)

Verifies API connectivity, configuration sanity, and database adapter connectivity.

### Request Example
```bash
curl -X GET "https://yourwebsite.com/api/contlify/v1/validate" \
  -H "X-Contlify-Key: your_secret_api_key"
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
    "timestamp": "2026-09-01T00:00:00.000Z"
  }
}
```

---

## 2. Publish Post (`POST /posts`)

Creates and publishes a new blog post into your configured database.

### Request Headers
- `X-Contlify-Key`: `your_secret_api_key`
- `Content-Type`: `application/json`

### Request Body Schema

```json
{
  "title": "string (Required)",
  "content": "string (Required — HTML or Markdown)",
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
      "description": "Technical tutorials",
      "coverImage": "https://example.com/engineering-cover.jpg"
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
  -H "X-Contlify-Key: your_secret_api_key" \
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

## 3. Get Single Post (`GET /posts/:id`)

Fetches a single post by its ID or slug.

### Request Example
```bash
curl -X GET "https://yourwebsite.com/api/contlify/v1/posts/building-with-contlify" \
  -H "X-Contlify-Key: your_secret_api_key"
```

### Success Response (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "id": "post_1724789000",
    "slug": "building-with-contlify",
    "title": "Building with Contlify",
    "content": "<h2>Hello World</h2><p>Article content goes here.</p>",
    "status": "published",
    "author": {
      "name": "Alex Smith",
      "slug": "alex-smith"
    },
    "categories": [
      { "name": "Engineering", "slug": "engineering" }
    ],
    "tags": [
      { "name": "TypeScript", "slug": "typescript" }
    ],
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-01T12:00:00.000Z"
  }
}
```

---

## 4. Update Post (`PATCH /posts/:id` & `PUT /posts/:id`)

Updates an existing post by its ID or slug.

### Path Parameters
- `id` (string, Required): Post ID or Slug.

### Request Body Example
```json
{
  "title": "Building with Contlify (Updated Edition)",
  "excerpt": "Updated summary of the article."
}
```

### Success Response (`200 OK`)
```json
{
  "status": "success",
  "post_id": "building-with-contlify",
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

## 5. Taxonomies (`GET /categories`, `GET /tags`, `GET /authors`)

### Retrieve Categories
```bash
curl -X GET "https://yourwebsite.com/api/contlify/v1/categories" \
  -H "X-Contlify-Key: your_secret_api_key"
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_engineering",
      "name": "Engineering",
      "slug": "engineering",
      "description": "Technical tutorials",
      "postCount": 12,
      "coverImage": "https://example.com/cover.jpg"
    }
  ],
  "meta": {
    "timestamp": "2026-09-01T00:00:00.000Z"
  }
}
```

### Update Category (`PATCH /categories/:id` & `PUT /categories/:id`)
```bash
curl -X PATCH "https://yourwebsite.com/api/contlify/v1/categories/engineering" \
  -H "X-Contlify-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated category description",
    "coverImage": "https://example.com/new-cover.jpg"
  }'
```
