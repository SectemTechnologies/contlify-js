/**
 * Cloudflare D1 / SQLite database schema for Contlify.
 * Apply via: npx wrangler d1 execute <DB_NAME> --file=contlify-d1.sql
 */
export const d1Schema = `-- Contlify Cloudflare D1 / SQLite Schema

CREATE TABLE IF NOT EXISTS contlify_posts (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  subtitle      TEXT,
  content       TEXT NOT NULL,
  content_type  TEXT DEFAULT 'markdown',
  excerpt       TEXT,
  cover_image   TEXT,
  status        TEXT DEFAULT 'published',
  author_id     TEXT,
  seo_data      TEXT,
  custom_fields TEXT,
  published_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contlify_authors (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  email      TEXT,
  bio        TEXT,
  avatar     TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contlify_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contlify_tags (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contlify_post_categories (
  post_id     TEXT REFERENCES contlify_posts(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES contlify_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS contlify_post_tags (
  post_id TEXT REFERENCES contlify_posts(id) ON DELETE CASCADE,
  tag_id  TEXT REFERENCES contlify_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contlify_posts_slug      ON contlify_posts(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_posts_status    ON contlify_posts(status);
CREATE INDEX IF NOT EXISTS idx_contlify_posts_published ON contlify_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contlify_authors_slug    ON contlify_authors(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_categories_slug ON contlify_categories(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_tags_slug       ON contlify_tags(slug);
`;
