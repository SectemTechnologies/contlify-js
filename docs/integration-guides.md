# Contlify Integration Guides

Step-by-step instructions for connecting publishing services and developer tools to `contlify` middleware.

---

## 1. Contlify Publisher Platform Integration

To connect your Next.js site to the official Contlify platform:

1. Copy your secret API key configured in `.env` (`CONTLIFY_API_KEY`).
2. Navigate to your Contlify Workspace Settings -> **Destinations & Websites**.
3. Add a new Destination:
   - **Website URL**: `https://yourdomain.com`
   - **API Endpoint**: `https://yourdomain.com/api/contlify/posts`
   - **API Key Header**: `X-Truecmo-Key`
   - **API Key Value**: `your_secret_api_key`
4. Click **Test Connectivity** (calls `GET /api/contlify/validate`).
5. Save Destination. Posts published in Contlify will now automatically publish to your Next.js website!

---

## 2. Postman Setup Guide

You can easily test your Contlify integration using Postman:

1. Create a new HTTP Request in Postman.
2. Set Method to `POST` and URL to `http://localhost:3000/api/contlify/posts`.
3. Under **Headers**, add:
   - `X-Truecmo-Key`: `your_secret_api_key`
   - `Content-Type`: `application/json`
4. Under **Body**, choose `raw` -> `JSON`:
   ```json
   {
     "title": "Test Post from Postman",
     "content": "<p>Hello world!</p>",
     "status": "published"
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

## 3. cURL CLI Integration Guide

Test your local or production endpoint directly from your terminal:

### Health Verification
```bash
curl -i -X GET "http://localhost:3000/api/contlify/validate" \
  -H "X-Truecmo-Key: your_secret_api_key"
```

### Publish Blog Post
```bash
curl -i -X POST "http://localhost:3000/api/contlify/posts" \
  -H "X-Truecmo-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Publishing via cURL CLI",
    "content": "Automated blog post content",
    "status": "published"
  }'
```

### Update Existing Post
```bash
curl -i -X PATCH "http://localhost:3000/api/contlify/posts/publishing-via-curl-cli" \
  -H "X-Truecmo-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Publishing via cURL CLI (Updated)"
  }'
```

---

## 4. n8n / Zapier Workflow Automation Guide

Automatically publish blog posts from automated workflows:

1. Add an **HTTP Request** node in n8n.
2. Configure HTTP node:
   - **Method**: `POST`
   - **URL**: `https://yourwebsite.com/api/contlify/posts`
   - **Authentication**: Header Auth
   - **Header Name**: `X-Truecmo-Key`
   - **Header Value**: `your_secret_api_key`
   - **Send Body**: `JSON`
   - **Body Parameters**:
     - `title`: `={{ $json.title }}`
     - `content`: `={{ $json.content }}`
     - `status`: `published`
3. Execute workflow to trigger automated publishing.

---

## 5. Custom Backend SDK Integration Guide

To publish posts programmatically from Node.js, Python, Go, or PHP backends:

```typescript
// Example Node.js fetch publishing script
async function publishToContlify(title: string, content: string) {
  const response = await fetch("https://yourwebsite.com/api/contlify/posts", {
    method: "POST",
    headers: {
      "X-Truecmo-Key": process.env.CONTLIFY_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content,
      status: "published",
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Publishing failed: ${result.error?.message}`);
  }

  console.log("Post published successfully at:", result.post_url);
  return result;
}
```
