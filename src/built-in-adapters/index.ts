/**
 * Contlify Pre-Built Database Adapters
 *
 * Factory functions that create fully implemented ContlifyAdapter instances
 * for the most popular databases. Pass your client/connection instance and
 * get a ready-to-use adapter with zero custom code required.
 *
 * @example PostgreSQL (pg / Neon / Railway / Vercel Postgres)
 * ```ts
 * import { createPostgresAdapter } from "contlify";
 * import { Pool } from "pg";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const adapter = createPostgresAdapter(pool);
 * ```
 *
 * @example Supabase
 * ```ts
 * import { createSupabaseAdapter } from "contlify";
 * import { createClient } from "@supabase/supabase-js";
 *
 * const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
 * const adapter = createSupabaseAdapter(supabase);
 * ```
 *
 * @example Cloudflare D1
 * ```ts
 * import { createD1Adapter } from "contlify";
 * import { getCloudflareContext } from "@opennextjs/cloudflare";
 *
 * const { env } = await getCloudflareContext();
 * const adapter = createD1Adapter(env.DB);
 * ```
 *
 * @example MongoDB
 * ```ts
 * import { createMongoAdapter } from "contlify";
 * import { MongoClient } from "mongodb";
 *
 * const client = new MongoClient(process.env.MONGODB_URI!);
 * const db = client.db("myblog");
 * const adapter = createMongoAdapter(db);
 * ```
 */

export { createPostgresAdapter, type PostgresClientLike } from "./postgres.js";
export { createSupabaseAdapter, type SupabaseClientLike } from "./supabase.js";
export { createD1Adapter, type D1DatabaseLike, type D1StmtLike } from "./d1.js";
export { createMongoAdapter, type MongoDbLike, type MongoCollectionLike } from "./mongodb.js";
export {
  mapRowToPost,
  mapRowToAuthor,
  mapRowToCategory,
  mapRowToTag,
  type RawPostRow,
  type RawAuthorRow,
  type RawCategoryRow,
  type RawTagRow,
} from "./row-mapper.js";
