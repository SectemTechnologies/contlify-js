# 📖 Contlify Complete Integration & Blog Page Setup Guide

This guide explains how to use `contlify` to query content directly in your frontend components, build fast SEO-optimized blog pages across all supported frameworks, and connect publishing automation workflows.

---

## 📑 Table of Contents
1. [Core Query API Overview](#1-core-query-api-overview)
2. [Setting Up Blog Pages by Framework](#2-setting-up-blog-pages-by-framework)
   - [▲ Next.js (App Router)](#-nextjs-app-router)
   - [🚀 Astro](#-astro)
   - [⚛️ React Router v7](#️-react-router-v7)
   - [🅰️ Angular (SSR)](#️-angular-ssr)
3. [Connecting Publishing Workflows](#3-connecting-publishing-workflows)
   - [Contlify Dashboard Platform](#contlify-dashboard-platform)
   - [Postman Setup](#postman-setup)
   - [cURL CLI](#curl-cli)
   - [n8n / Make / Zapier Workflows](#n8n--make--zapier-workflows)
   - [Custom Backend SDK (Node.js / Python)](#custom-backend-sdk-nodejs--python)

---

## 1. Core Query API Overview

Contlify exports high-level, zero-boilerplate functions that automatically resolve your `contlify.config.ts` storage settings:

```typescript
import {
  getAllPosts,
  getPostBySlug,
  getPostById,
  getCategories,
  getPostsByCategory,
  getTags,
  getPostsByTag,
  getAuthors,
  getPostCount,
} from "contlify";
```

### Available Query Functions

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getAllPosts(options?)` | `{ status?: string, limit?: number, offset?: number, orderBy?: string, order?: 'asc' \| 'desc' }` | `Promise<Post[]>` | Fetches list of posts (drafts excluded by default) |
| `getPostBySlug(slug)` | `slug: string` | `Promise<Post \| null>` | Fetches a single published or scheduled post by slug |
| `getPostById(id)` | `id: string` | `Promise<Post \| null>` | Fetches a single post by its ID |
| `getCategories()` | — | `Promise<Category[]>` | Fetches all categories with aggregated `postCount` |
| `getPostsByCategory(slug)` | `categorySlug: string` | `Promise<Post[]>` | Fetches all published posts under a specific category |
| `getTags()` | — | `Promise<Tag[]>` | Fetches all tags with aggregated `postCount` |
| `getPostsByTag(slug)` | `tagSlug: string` | `Promise<Post[]>` | Fetches all published posts under a specific tag |
| `getAuthors()` | — | `Promise<Author[]>` | Fetches all registered authors |
| `getPostCount(options?)` | `{ status?: string }` | `Promise<number>` | Returns total post count |

---

## 2. Setting Up Blog Pages by Framework

---

### ▲ Next.js (App Router)

#### 1. Blog Listing Page (`app/blog/page.tsx` or `src/app/blog/page.tsx`)
```tsx
import Link from "next/link";
import { getAllPosts, getCategories } from "contlify";

export const revalidate = 60; // Incremental Static Regeneration every 60s

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getCategories(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Our Blog</h1>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/blog/category/${cat.slug}`}
            className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-sm rounded-full transition"
          >
            {cat.name} ({cat.postCount ?? 0})
          </Link>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {posts.map((post) => (
          <article key={post.id} className="border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition">
            {post.coverImage && (
              <img src={post.coverImage} alt={post.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <span className="text-xs text-neutral-500">{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
              <h2 className="text-xl font-semibold mt-2 mb-3">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && <p className="text-neutral-600 text-sm">{post.excerpt}</p>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
```

#### 2. Single Post Page (`app/blog/[slug]/page.tsx`)
```tsx
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "contlify";
import type { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    keywords: post.seo?.keywords,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{post.title}</h1>
        {post.author && (
          <div className="flex items-center gap-3 text-neutral-600">
            {post.author.avatar && (
              <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full" />
            )}
            <span>By {post.author.name}</span>
          </div>
        )}
      </header>

      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="w-full rounded-2xl mb-8" />
      )}

      {/* Render optimized post HTML */}
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
```

---

### 🚀 Astro

#### 1. Blog Index (`src/pages/blog/index.astro`)
```astro
---
import { getAllPosts, getCategories } from "contlify";

const posts = await getAllPosts();
const categories = await getCategories();
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Blog — Contlify</title>
  </head>
  <body class="max-w-5xl mx-auto px-4 py-12 font-sans">
    <h1 class="text-4xl font-bold mb-8">Latest Articles</h1>

    <div class="flex gap-2 mb-8">
      {categories.map((cat) => (
        <a href={`/blog/category/${cat.slug}`} class="px-3 py-1 bg-gray-100 rounded-full text-sm">
          {cat.name} ({cat.postCount ?? 0})
        </a>
      ))}
    </div>

    <div class="grid md:grid-cols-2 gap-8">
      {posts.map((post) => (
        <article class="border rounded-xl p-6">
          <h2 class="text-xl font-bold mb-2">
            <a href={`/blog/${post.slug}`}>{post.title}</a>
          </h2>
          <p class="text-gray-600 text-sm">{post.excerpt}</p>
        </article>
      ))}
    </div>
  </body>
</html>
```

#### 2. Post Detail (`src/pages/blog/[slug].astro`)
```astro
---
import { getPostBySlug, getAllPosts } from "contlify";

export async function getStaticPaths() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post = await getPostBySlug(slug!);
if (!post) {
  return Astro.redirect("/404");
}
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{post.seo?.title || post.title}</title>
    <meta name="description" content={post.seo?.description || post.excerpt} />
  </head>
  <body class="max-w-3xl mx-auto px-4 py-12 font-sans">
    <h1 class="text-4xl font-bold mb-4">{post.title}</h1>
    {post.coverImage && <img src={post.coverImage} alt={post.title} class="w-full rounded-xl mb-8" />}
    <div class="prose" set:html={post.content} />
  </body>
</html>
```

---

### ⚛️ React Router v7

#### 1. Blog Index Route (`app/routes/blog._index.tsx`)
```tsx
import { useLoaderData, Link } from "react-router";
import { getAllPosts, getCategories } from "contlify";

export async function loader() {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getCategories(),
  ]);
  return { posts, categories };
}

export default function BlogIndex() {
  const { posts, categories } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {posts.map((post) => (
          <article key={post.id} className="border p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-2">
              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="text-sm text-neutral-600">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
```

#### 2. Post Detail Route (`app/routes/blog.$slug.tsx`)
```tsx
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getPostBySlug } from "contlify";

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await getPostBySlug(params.slug!);
  if (!post) {
    throw new Response("Post Not Found", { status: 404 });
  }
  return { post };
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">{post.title}</h1>
      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="w-full rounded-2xl mb-8" />
      )}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

---

### 🅰️ Angular (SSR)

#### 1. Blog Service (`src/app/blog/blog.service.ts`)
```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { Post, Category } from "contlify";

@Injectable({ providedIn: "root" })
export class BlogService {
  private apiUrl = "/api/contlify/v1";

  constructor(private http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.http.get<{ success: boolean; data: Post[] }>(`${this.apiUrl}/posts`).pipe(
      map(res => res.data)
    );
  }

  getPostBySlug(slug: string): Observable<Post> {
    return this.http.get<{ success: boolean; data: Post }>(`${this.apiUrl}/posts/${slug}`).pipe(
      map(res => res.data)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<{ success: boolean; data: Category[] }>(`${this.apiUrl}/categories`).pipe(
      map(res => res.data)
    );
  }
}
```

#### 2. Blog List Component (`src/app/blog/blog-list.component.ts`)
```typescript
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BlogService } from "./blog.service";
import type { Post } from "contlify";

@Component({
  selector: "app-blog-list",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-12 font-sans">
      <h1 class="text-4xl font-bold mb-8">Our Blog</h1>
      <div class="grid md:grid-cols-2 gap-8">
        <article *ngFor="let post of posts" class="border p-6 rounded-xl">
          <h2 class="text-xl font-bold mb-2">
            <a [routerLink]="['/blog', post.slug]" class="hover:underline">{{ post.title }}</a>
          </h2>
          <p class="text-neutral-600 text-sm">{{ post.excerpt }}</p>
        </article>
      </div>
    </div>
  `
})
export class BlogListComponent implements OnInit {
  posts: Post[] = [];

  constructor(private blogService: BlogService) {}

  ngOnInit() {
    this.blogService.getPosts().subscribe(posts => {
      this.posts = posts;
    });
  }
}
```

---

## 3. Connecting Publishing Workflows

### Contlify Dashboard Platform
1. Log into your Contlify Dashboard.
2. Go to **Settings** → **Destinations**.
3. Add your website:
   - **Endpoint URL**: `https://yourdomain.com/api/contlify/v1/posts`
   - **Header**: `X-Contlify-Key`
   - **Secret Key**: Your configured `CONTLIFY_API_KEY`.
4. Click **Test Connection** (triggers `GET /api/contlify/v1/validate`).
5. Save Destination. Any published post from Contlify will now automatically appear on your website!

---

### Postman Setup
1. Method: `POST`
2. URL: `http://localhost:3000/api/contlify/v1/posts`
3. Headers:
   - `X-Contlify-Key`: `your_secret_api_key`
   - `Content-Type`: `application/json`
4. Body (`raw JSON`):
   ```json
   {
     "title": "My First Post via API",
     "content": "<h2>Hello World</h2><p>This is my first published article.</p>",
     "status": "published",
     "author": "Jane Doe",
     "categories": ["Technology"],
     "tags": ["Contlify", "Next.js"]
   }
   ```

---

### cURL CLI

#### Verify Health:
```bash
curl -i -X GET "https://yourdomain.com/api/contlify/v1/validate" \
  -H "X-Contlify-Key: your_secret_api_key"
```

#### Create Post:
```bash
curl -i -X POST "https://yourdomain.com/api/contlify/v1/posts" \
  -H "X-Contlify-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Automated Post",
    "content": "<p>Content generated via cURL.</p>",
    "status": "published",
    "custom_slug": "automated-post"
  }'
```

#### Update Post:
```bash
curl -i -X PATCH "https://yourdomain.com/api/contlify/v1/posts/automated-post" \
  -H "X-Contlify-Key: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Automated Post (Updated Title)"
  }'
```

---

### n8n / Make / Zapier Workflows
1. Add an **HTTP Request** node.
2. Set Method to `POST`.
3. Set URL to `https://yourdomain.com/api/contlify/v1/posts`.
4. Add Header `X-Contlify-Key` with your secret API key.
5. Pass JSON body mapped from upstream steps:
   - `title`: `{{ $json.title }}`
   - `content`: `{{ $json.html_content }}`
   - `status`: `"published"`
   - `author`: `{{ $json.author_name }}`
   - `categories`: `{{ $json.categories }}`

---

### Custom Backend SDK (Node.js / Python)

#### Node.js / TypeScript:
```typescript
async function publishArticle(post: { title: string; content: string }) {
  const res = await fetch("https://yourdomain.com/api/contlify/v1/posts", {
    method: "POST",
    headers: {
      "X-Contlify-Key": process.env.CONTLIFY_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...post, status: "published" }),
  });
  return await res.json();
}
```

#### Python:
```python
import requests
import os

def publish_article(title: str, content: str):
    url = "https://yourdomain.com/api/contlify/v1/posts"
    headers = {
        "X-Contlify-Key": os.environ["CONTLIFY_API_KEY"],
        "Content-Type": "application/json"
    }
    payload = {
        "title": title,
        "content": content,
        "status": "published"
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()
```
