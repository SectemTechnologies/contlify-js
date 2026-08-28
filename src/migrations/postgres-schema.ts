/**
 * PostgreSQL / Supabase database schema for Contlify.
 * Run this against your PostgreSQL database to create the required tables.
 */
export const postgresSchema = `-- Contlify PostgreSQL Schema (Supabase / Neon / Railway / RDS)

CREATE TABLE IF NOT EXISTS contlify_posts (
  id            VARCHAR(255) PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  subtitle      TEXT,
  content       TEXT NOT NULL,
  content_type  VARCHAR(50) DEFAULT 'markdown',
  excerpt       TEXT,
  cover_image   TEXT,
  status        VARCHAR(50) DEFAULT 'published',
  author_id     VARCHAR(255),
  seo_data      JSONB,
  custom_fields JSONB,
  published_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contlify_authors (
  id         VARCHAR(255) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) UNIQUE NOT NULL,
  email      VARCHAR(255),
  bio        TEXT,
  avatar     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contlify_categories (
  id          VARCHAR(255) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  parent_id   VARCHAR(255),
  cover_image TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contlify_tags (
  id          VARCHAR(255) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contlify_post_categories (
  post_id     VARCHAR(255) REFERENCES contlify_posts(id) ON DELETE CASCADE,
  category_id VARCHAR(255) REFERENCES contlify_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS contlify_post_tags (
  post_id VARCHAR(255) REFERENCES contlify_posts(id) ON DELETE CASCADE,
  tag_id  VARCHAR(255) REFERENCES contlify_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contlify_posts_slug        ON contlify_posts(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_posts_status      ON contlify_posts(status);
CREATE INDEX IF NOT EXISTS idx_contlify_posts_published   ON contlify_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contlify_authors_slug      ON contlify_authors(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_categories_slug   ON contlify_categories(slug);
CREATE INDEX IF NOT EXISTS idx_contlify_tags_slug         ON contlify_tags(slug);
`;
