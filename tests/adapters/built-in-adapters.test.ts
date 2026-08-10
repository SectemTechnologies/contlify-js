import { describe, it, expect, vi } from "vitest";
import {
  createPostgresAdapter,
  createSupabaseAdapter,
  createD1Adapter,
  createMongoAdapter,
  getMigrationSql,
  postgresSchema,
  d1Schema,
  mapRowToPost,
  mapRowToAuthor,
  mapRowToCategory,
  mapRowToTag,
  type PostgresClientLike,
  type SupabaseClientLike,
  type D1DatabaseLike,
  type MongoDbLike,
} from "../../src/index.js";

describe("Pre-Built Adapters & Migrations Suite (Phase 2)", () => {
  describe("Migration Schema Generator", () => {
    it("should return postgres schema for 'postgres'", () => {
      const sql = getMigrationSql("postgres");
      expect(sql).toBe(postgresSchema);
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should return postgres schema for 'supabase'", () => {
      const sql = getMigrationSql("supabase");
      expect(sql).toBe(postgresSchema);
    });

    it("should return D1 schema for 'd1'", () => {
      const sql = getMigrationSql("d1");
      expect(sql).toBe(d1Schema);
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS contlify_posts");
    });

    it("should return notice message for 'mongodb'", () => {
      const sql = getMigrationSql("mongodb");
      expect(sql).toContain("MongoDB collections auto-initialize");
    });

    it("should throw for unsupported database type", () => {
      expect(() => getMigrationSql("invalid" as any)).toThrow("Unsupported database type");
    });
  });

  describe("Row Mapper Utilities", () => {
    it("should map raw SQL post row to Post domain object", () => {
      const post = mapRowToPost({
        id: "post_1",
        title: "Test Post",
        slug: "test-post",
        content: "<p>Content</p>",
        status: "published",
        author_name: "Jane Doe",
        author_id: "author_1",
      });

      expect(post.id).toBe("post_1");
      expect(post.title).toBe("Test Post");
      expect(post.author?.name).toBe("Jane Doe");
    });

    it("should map raw author row", () => {
      const author = mapRowToAuthor({ id: "a1", name: "Alice", slug: "alice" });
      expect(author.name).toBe("Alice");
    });

    it("should map raw category row", () => {
      const cat = mapRowToCategory({ id: "c1", name: "Tech", slug: "tech" });
      expect(cat.name).toBe("Tech");
    });

    it("should map raw tag row", () => {
      const tag = mapRowToTag({ id: "t1", name: "JS", slug: "js" });
      expect(tag.name).toBe("JS");
    });
  });

  describe("createPostgresAdapter", () => {
    it("ping should execute SELECT 1", async () => {
      const mockClient: PostgresClientLike = {
        query: vi.fn().mockResolvedValue({ rows: [{ alive: 1 }] }),
      };
      const adapter = createPostgresAdapter(mockClient);
      const alive = await adapter.ping!();

      expect(alive).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith("SELECT 1 AS alive");
    });

    it("createPost should execute INSERT query", async () => {
      const mockClient: PostgresClientLike = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      const adapter = createPostgresAdapter(mockClient);
      const res = await adapter.createPost!({
        title: "Hello Postgres",
        content: "Content body",
        custom_slug: "hello-postgres",
      });

      expect(res.action).toBe("created");
      expect(res.slug).toBe("hello-postgres");
      expect(mockClient.query).toHaveBeenCalled();
    });

    it("getAllPosts should query posts and return normalized domain objects", async () => {
      const mockClient: PostgresClientLike = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes("contlify_posts")) {
            return Promise.resolve({
              rows: [
                {
                  id: "p1",
                  title: "Post 1",
                  slug: "post-1",
                  content: "Body 1",
                  status: "published",
                },
              ],
            });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      const adapter = createPostgresAdapter(mockClient);
      const posts = await adapter.getAllPosts!();

      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("Post 1");
    });
  });

  describe("createD1Adapter", () => {
    it("ping should run first statement", async () => {
      const mockDb: D1DatabaseLike = {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ alive: 1 }),
        }),
        batch: vi.fn(),
      };

      const adapter = createD1Adapter(mockDb);
      const alive = await adapter.ping!();
      expect(alive).toBe(true);
    });

    it("getAllPosts should run prepare and return posts", async () => {
      const mockDb: D1DatabaseLike = {
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockImplementation(() => {
            if (sql.includes("contlify_posts")) {
              return Promise.resolve({
                results: [
                  { id: "d1_post", title: "D1 Post", slug: "d1-post", content: "Content" },
                ],
                success: true,
              });
            }
            return Promise.resolve({ results: [], success: true });
          }),
        })),
        batch: vi.fn(),
      };

      const adapter = createD1Adapter(mockDb);
      const posts = await adapter.getAllPosts!();
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("D1 Post");
    });
  });

  describe("createSupabaseAdapter", () => {
    it("createPost should trigger upsert", async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb: (res: any) => void) => cb({ data: [], error: null })),
      };

      const mockSupabase: SupabaseClientLike = {
        from: vi.fn().mockReturnValue(mockQuery),
      };

      const adapter = createSupabaseAdapter(mockSupabase);
      const res = await adapter.createPost!({
        title: "Supabase Post",
        content: "Content",
        custom_slug: "supabase-post",
      });

      expect(res.action).toBe("created");
      expect(res.slug).toBe("supabase-post");
      expect(mockSupabase.from).toHaveBeenCalledWith("contlify_posts");
    });
  });

  describe("createMongoAdapter", () => {
    it("getAllPosts should return documents mapped to Post objects", async () => {
      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([
            { id: "m1", title: "Mongo Post", slug: "mongo-post", content: "Body" },
          ]),
        }),
        insertOne: vi.fn(),
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1, upsertedCount: 0 }),
        countDocuments: vi.fn().mockResolvedValue(1),
      };

      const mockDb: MongoDbLike = {
        collection: vi.fn().mockReturnValue(mockCollection),
      };

      const adapter = createMongoAdapter(mockDb);
      const posts = await adapter.getAllPosts!();

      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe("Mongo Post");
    });
  });
});
