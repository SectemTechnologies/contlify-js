# Contlify Integration Guides

Step-by-step instructions for connecting publishing services, automation workflows, and developer tools to `contlify`.

---

## 1. Contlify Publisher Platform Integration

To connect your website to the official Contlify platform:

1. Copy your secret API key configured in `.env.local` or Wrangler secrets (`CONTLIFY_API_KEY`).
2. Navigate to your Contlify Workspace Settings → **Destinations & Websites**.
3. Add a new Destination:
   - **Website URL**: `https://yourdomain.com`
   - **API Endpoint**: `https://yourdomain.com/api/contlify/v1/posts`
   - **API Key Header**: `x-api-key` (or `X-Truecmo-Key`)
   - **API Key Value**: `your_secret_api_key`
4. Click **Test Connectivity** (calls `GET /api/contlify/v1/validate`).
5. Save Destination. Posts published in Contlify will now automatically synchronize to your website!

---

## 2. Postman Setup Guide

You can easily test your Contlify integration using Postman:

1. Create a new HTTP Request in Postman.
2. Set Method to `POST` and URL to `http://localhost:3000/api/contlify/v1/posts`.
3. Under **Headers**, add:
   - `x-api-key`: `your_secret_api_key`
   - `Content-Type`: `application/json`
4. Under **Body**, choose `raw` → `JSON`:
   ```json
   {
     "title": "Test Post from Postman",
     "content": "<p>Hello world!</p>",
     "status": "published",
     "custom_slug": "test-post-from-postman",
     "author": "Alex Smith",
     "categories": ["Technology"],
     "tags": ["Next.js"]
   }
   ```
5. Click **Send**. You should receive a `200 OK` response:
   ```json
   {
     "status": "success",
     "post_id": "post_...",
     "post_url": "/blog/test-post-from-postman"
   }
   ```

---

## 3. cURL CLI Guide

Test your local or production endpoint directly from your terminal:

### Health Verification
```bash
curl -i -X GET "https://yourdomain.com/api/contlify/v1/validate" \
  -H "x-api-key: your_secret_api_key"
```

### Publish Blog Post
```bash
curl -i -X POST "https://yourdomain.com/api/contlify/v1/posts" \
  -H "x-api-key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Publishing via cURL CLI",
    "content": "<h2>Automated Article</h2><p>Blog post content.</p>",
    "status": "published",
    "custom_slug": "publishing-via-curl-cli",
    "author": "Automated Bot",
    "categories": ["Automation"],
    "tags": ["cURL"]
  }'
```

### Update Existing Post
```bash
curl -i -X PATCH "https://yourdomain.com/api/contlify/v1/posts/publishing-via-curl-cli" \
  -H "x-api-key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Publishing via cURL CLI (Updated Title)"
  }'
```

---

## 4. n8n / Zapier Workflow Automation Guide

Automatically publish blog posts from automated workflows:

1. Add an **HTTP Request** node in n8n or Make.
2. Configure HTTP node:
   - **Method**: `POST`
   - **URL**: `https://yourwebsite.com/api/contlify/v1/posts`
   - **Authentication**: Header Auth
   - **Header Name**: `x-api-key`
   - **Header Value**: `your_secret_api_key`
   - **Send Body**: `JSON`
   - **Body Parameters**:
     - `title`: `={{ $json.title }}`
     - `content`: `={{ $json.content }}`
     - `status`: `published`
     - `author`: `={{ $json.author }}`
     - `categories`: `={{ $json.categories }}`
3. Execute workflow to trigger automated publishing.

---

## 5. Custom Backend SDK Integration Guide

To publish posts programmatically from Node.js, Python, Go, or PHP backends:

```typescript
// Example Node.js publishing function
async function publishToContlify(postData: { title: string; content: string; author?: string }) {
  const response = await fetch("https://yourwebsite.com/api/contlify/v1/posts", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CONTLIFY_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...postData,
      status: "published",
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Publishing failed: ${result.error?.message || response.statusText}`);
  }

  console.log("Post published successfully at:", result.post_url);
  return result;
}
```
