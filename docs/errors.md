# Contlify Error Architecture & Troubleshooting Guide

Complete catalog of standardized error responses returned by `contlify` middleware and in-depth troubleshooting for edge & serverless deployments.

---

## 1. Standardized Error Payload Format

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
    "timestamp": "2026-08-27T00:00:00.000Z"
  }
}
```

---

## 2. Error Catalog

### `UNAUTHORIZED` (HTTP 401)
- **Description**: Authentication failed because the API key header was missing or did not match the configured `apiKey`.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing API key in request headers (x-api-key, X-Truecmo-Key, or Authorization required)"
    }
  }
  ```
- **Resolution**:
  1. Add header `x-api-key: your_secret_api_key` or `Authorization: Bearer your_secret_api_key`.
  2. Ensure `CONTLIFY_API_KEY` is defined in `.env.local` or Wrangler secrets.

---

### `VALIDATION_ERROR` (HTTP 400)
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
- **Resolution**: Check the request body payload against the schema in the [API Reference Guide](./api-reference.md).

---

### `NOT_FOUND` (HTTP 404)
- **Description**: Requested route endpoint does not exist.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Route GET /api/contlify/v1/unknown not found"
    }
  }
  ```
- **Resolution**: Verify endpoint path. Note that all endpoints are prefixed with `/api/contlify/v1/`.

---

### `METHOD_NOT_ALLOWED` (HTTP 405)
- **Description**: Path exists but the target HTTP method is unsupported (e.g. `DELETE /api/contlify/v1/validate`).
- **Resolution**: Use supported methods: `GET`, `POST`, `PATCH`, `PUT`.

---

### `ADAPTER_ERROR` (HTTP 500)
- **Description**: Database execution failed, database connection timed out, or storage adapter is misconfigured.
- **Payload Example**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ADAPTER_ERROR",
      "message": "MongoDB database connection not available. Please check your MONGODB_URI environment variable."
    }
  }
  ```
- **Resolution**: See the troubleshooting section below for specific database issues.

---

### `INTERNAL_ERROR` (HTTP 500)
- **Description**: Unhandled runtime error occurred inside server pipeline. Internal stack traces are logged on the server.
- **Resolution**: Check your server logs (`npx wrangler tail` or server terminal).

---

## 3. Deep Troubleshooting: Edge & Serverless Deployments

### A. Cloudflare Workers Error 1101 (`Worker threw exception` / `Worker's code had hung`)

#### What happens:
```
Error 1101: The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.
```

#### Causes & Fixes:
1. **Cause: Using `mongodb+srv://` connection scheme in Cloudflare Workers.**
   - `mongodb+srv://` requires DNS `SRV` and `TXT` record resolution.
   - Cloudflare Workers' `workerd` runtime does not support standard UDP DNS queries for SRV records, causing Node's `dns` module to hang indefinitely.
   - **Fix**: Switch to the **Standard connection string** in MongoDB Atlas:
     - Go to MongoDB Atlas → **Connect** → **Drivers** → toggle **Standard connection string**.
     - Set secret: `npx wrangler secret put MONGODB_URI`
     - Connection URI format: `mongodb://user:password@host1:27017,host2:27017,host3:27017/?replicaSet=atlas-xxx&ssl=true&authSource=admin`

2. **Cause: Persistent TCP socket pools hanging across requests.**
   - Traditional database drivers maintain background SDAM heartbeat timers and connection pools.
   - Cloudflare Workers terminates per-request I/O; holding active background sockets across requests triggers isolate termination.
   - **Fix**: Ensure `contlify.config.ts` sets `deployment: "cloudflare"`, which automatically configures edge-safe options (`maxPoolSize: 1`, `minPoolSize: 0`, and 4-second bounded timeout races).

---

### B. `querySrv ECONNREFUSED`

#### What happens:
```
[contlify:error] Routing dispatch error Error [AdapterError]: querySrv ECONNREFUSED _mongodb._tcp...
```

#### Cause & Fix:
- Your ISP, VPN, corporate firewall, or Cloudflare edge isolate blocks DNS SRV queries on port 53.
- **Fix**: Switch from `mongodb+srv://` to the standard `mongodb://` connection string in Atlas.

---

### C. `Topology is closed`

#### What happens:
```
[contlify:error] Routing dispatch error: Topology is closed
```

#### Cause & Fix:
- In Cloudflare Workers or serverless containers, TCP sockets are closed by the platform runtime after each HTTP request. Reusing a stale client instance causes the MongoDB driver to reject queries with `Topology is closed`.
- **Fix**: Contlify's built-in MongoDB storage resolver automatically tests cached connections using a lightweight `{ ping: 1 }` command before reuse. If the socket was terminated by the edge runtime, it automatically closes the stale client and reconnects fresh without failing the incoming request.

---

### D. `MongoDB driver 'mongodb' is required when using storage.uri`

#### What happens:
```
[contlify:error] Routing dispatch error: MongoDB driver 'mongodb' is required when using storage.uri. Please install 'mongodb'...
```

#### Cause & Fix:
- In Next.js with `@opennextjs/cloudflare`, dynamic imports with variable specifiers cannot be traced by esbuild during `build:opennext`.
- **Fix**: 
  1. Contlify uses static dynamic imports (`import("mongodb")`) so OpenNext / esbuild automatically bundles `mongodb` and its dependencies.
  2. Ensure `next.config.ts` includes `serverExternalPackages: ["mongodb"]`.

---

### E. Supabase: `Supabase table does not exist: [code: 42P01]` or `[code: PGRST204]`

#### What happens:
```
Supabase table does not exist: relation "contlify_posts" does not exist. Please apply the Contlify SQL schema...
```

#### Cause & Fix:
- PostgREST HTTP API does not execute DDL (`CREATE TABLE`) operations.
- **Fix**: Apply `schema.sql` once via **Supabase Dashboard → SQL Editor → New Query → Run**.

---

### F. MongoDB Atlas IP Access List (`0.0.0.0/0`)

#### What happens:
```
MongoServerSelectionError: connection timed out
```

#### Cause & Fix:
- Cloudflare Workers and serverless functions do not have static IP addresses.
- **Fix**: In MongoDB Atlas, go to **Network Access** → **Add IP Address** → choose **Allow Access from Anywhere** (`0.0.0.0/0`).
