import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as contlify from "../../src/index.js";
import {
  defineConfig,
  resolveConfig,
  resolveStorageAdapter,
} from "../../src/config/index.js";
import {
  getActiveConfig,
  clearActiveConfig,
} from "../../src/config/define-config.js";
import { InMemoryContlifyAdapter } from "../../examples/adapters/in-memory-adapter.js";
import { AdapterError } from "../../src/errors/adapter-error.js";

describe("Configuration Architecture & Hardening Tests", () => {
  beforeEach(() => {
    clearActiveConfig();
    delete process.env.CONTLIFY_API_KEY;
  });

  afterEach(() => {
    clearActiveConfig();
    delete process.env.CONTLIFY_API_KEY;
  });

  describe("1. Public Package Surface Encapsulation", () => {
    it("should export defineConfig and resolveConfig on the public package index", () => {
      expect(typeof contlify.defineConfig).toBe("function");
      expect(typeof contlify.resolveConfig).toBe("function");
    });

    it("should NOT expose internal active-config mutation functions on the public package index", () => {
      expect((contlify as any).setActiveConfig).toBeUndefined();
      expect((contlify as any).getActiveConfig).toBeUndefined();
      expect((contlify as any).clearActiveConfig).toBeUndefined();
    });
  });

  describe("2. Configuration Isolation & Precedence", () => {
    it("Test A: defineConfig returns the exact same configuration object", () => {
      const config = {
        apiKey: "test-key-abc",
        apiPath: "/api/contlify/v1",
        postUrl: "/blog/{slug}",
        security: {
          maxBodyBytes: 3_000_000,
        },
      };

      const result = defineConfig(config);
      expect(result).toBe(config);
    });

    it("Test B: zero-config resolution uses the most recently defined application configuration", () => {
      const configA = { apiKey: "key-app-A", apiPath: "/api/a" };
      const configB = { apiKey: "key-app-B", apiPath: "/api/b" };

      defineConfig(configA);
      const resolvedA = resolveConfig();
      expect(resolvedA.apiKey).toBe("key-app-A");
      expect(resolvedA.apiPathPrefix).toBe("/api/a");

      defineConfig(configB);
      const resolvedB = resolveConfig();
      expect(resolvedB.apiKey).toBe("key-app-B");
      expect(resolvedB.apiPathPrefix).toBe("/api/b");
    });

    it("Test C: explicitly supplied configuration takes precedence over active config", () => {
      const configA = { apiKey: "key-active-A", apiPath: "/api/active" };
      const configB = { apiKey: "key-explicit-B", apiPath: "/api/explicit" };

      defineConfig(configA);
      const resolved = resolveConfig(configB);

      expect(resolved.apiKey).toBe("key-explicit-B");
      expect(resolved.apiPathPrefix).toBe("/api/explicit");
    });

    it("Test D: clearActiveConfig resets active configuration and falls back to defaults/env", () => {
      defineConfig({ apiKey: "temp-key" });
      clearActiveConfig();

      const resolved = resolveConfig();
      expect(resolved.apiKey).toBe("");
      expect(resolved.apiPathPrefix).toBe("/api/contlify");
      expect(resolved.security.maxBodyBytes).toBe(2_000_000);
    });
  });

  describe("3. Adapter Caching Invariants", () => {
    it("should return the exact same adapter instance for the same storage configuration object", () => {
      const mockClient = { query: async () => ({ rows: [] }) };
      const storage = {
        driver: "postgres" as const,
        client: mockClient,
      };

      const adapterA = resolveStorageAdapter(storage);
      const adapterB = resolveStorageAdapter(storage);

      expect(adapterA).toBeDefined();
      expect(adapterA).toBe(adapterB);
    });

    it("should return different adapter instances for different storage configuration objects", () => {
      const mockClientA = { query: async () => ({ rows: [] }) };
      const mockClientB = { query: async () => ({ rows: [] }) };

      const storageA = { driver: "postgres" as const, client: mockClientA };
      const storageB = { driver: "postgres" as const, client: mockClientB };

      const adapterA = resolveStorageAdapter(storageA);
      const adapterB = resolveStorageAdapter(storageB);

      expect(adapterA).toBeDefined();
      expect(adapterB).toBeDefined();
      expect(adapterA).not.toBe(adapterB);
    });

    it("should ensure different drivers cannot collide in the cache", () => {
      const mockClient = { query: async () => ({ rows: [] }) };
      const mockDb = {
        collection: () => ({
          findOne: async () => null,
          find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }),
          insertOne: async () => ({}),
          updateOne: async () => ({}),
          countDocuments: async () => 0,
        }),
      };

      const storagePg = { driver: "postgres" as const, client: mockClient };
      const storageMongo = { driver: "mongodb" as const, db: mockDb };

      const adapterPg = resolveStorageAdapter(storagePg);
      const adapterMongo = resolveStorageAdapter(storageMongo);

      expect(adapterPg).not.toBe(adapterMongo);
    });
  });

  describe("4. Supabase Resolver Hardening", () => {
    it("should resolve pre-configured Supabase client directly", async () => {
      const mockSupabaseClient = {
        from: (table: string) => ({
          select: () => ({
            limit: () => ({
              then: (fn: any) => fn({ data: [{ id: "post_1", table }], error: null }),
            }),
          }),
        }),
      };

      const adapter = resolveStorageAdapter({
        driver: "supabase",
        client: mockSupabaseClient,
      });

      expect(adapter).toBeDefined();
      const isAlive = await adapter?.ping?.();
      expect(isAlive).toBe(true);
    });

    it("should create lazy adapter with url and anonKey", () => {
      const adapter = resolveStorageAdapter({
        driver: "supabase",
        url: "https://project-id.supabase.co",
        anonKey: "public-anon-key-xyz",
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter?.createPost).toBe("function");
      expect(typeof adapter?.ping).toBe("function");
    });

    it("should create lazy adapter with url and serviceRoleKey", () => {
      const adapter = resolveStorageAdapter({
        driver: "supabase",
        url: "https://project-id.supabase.co",
        serviceRoleKey: "service-role-key-xyz",
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter?.createPost).toBe("function");
      expect(typeof adapter?.ping).toBe("function");
    });

    it("should handle error when query executes with unresolvable Supabase URL", async () => {
      const adapter = resolveStorageAdapter({
        driver: "supabase",
        url: "https://project-id.supabase.co",
        anonKey: "public-anon-key-xyz",
      });

      const isAlive = await adapter?.ping?.();
      expect(isAlive).toBe(false);
    }, 15000);

    it("should resolve Supabase with connectionString directly to PostgreSQL adapter", () => {
      const adapter = resolveStorageAdapter({
        driver: "supabase",
        connectionString: "postgresql://postgres:secret@db.project-ref.supabase.co:5432/postgres",
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter?.createPost).toBe("function");
      expect(typeof adapter?.ping).toBe("function");
    });

    it("should resolve Supabase with queryable client directly to PostgreSQL adapter", async () => {
      const mockPgPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ alive: 1 }] }),
      };

      const adapter = resolveStorageAdapter({
        driver: "supabase",
        client: mockPgPool,
      });

      expect(adapter).toBeDefined();
      const alive = await adapter?.ping?.();
      expect(alive).toBe(true);
      expect(mockPgPool.query).toHaveBeenCalledWith("SELECT 1 AS alive");
    });

    it("should reject Supabase configuration missing url, keys, client, or connectionString with clear AdapterError", () => {
      expect(() =>
        resolveStorageAdapter({
          driver: "supabase",
        } as any)
      ).toThrow(AdapterError);

      expect(() =>
        resolveStorageAdapter({
          driver: "supabase",
          url: "https://project-id.supabase.co",
        } as any)
      ).toThrow("Supabase storage requires 'client', 'connectionString', or 'url' with 'anonKey' / 'serviceRoleKey'.");
    });
  });

  describe("5. D1 and MongoDB Resolver Integrity", () => {
    it("should resolve D1 adapter with binding or env", () => {
      const mockD1 = {
        prepare: () => ({
          bind: () => ({
            first: async () => null,
            all: async () => ({ results: [], success: true }),
            run: async () => ({ success: true }),
          }),
        }),
        batch: async () => [],
      };

      const adapterFromBinding = resolveStorageAdapter({
        driver: "d1",
        binding: mockD1,
      });
      expect(adapterFromBinding).toBeDefined();

      const adapterFromEnv = resolveStorageAdapter({
        driver: "d1",
        env: { DB: mockD1 },
      });
      expect(adapterFromEnv).toBeDefined();
    });

    it("should reject D1 configuration missing binding, env, and dbProvider", () => {
      expect(() =>
        resolveStorageAdapter({
          driver: "d1",
        } as any)
      ).toThrow("Cloudflare D1 storage requires 'binding', 'env', or 'dbProvider'.");
    });

    it("should resolve MongoDB adapter with db instance", () => {
      const mockDb = {
        collection: () => ({
          findOne: async () => null,
          find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }),
          insertOne: async () => ({}),
          updateOne: async () => ({}),
          countDocuments: async () => 0,
        }),
      };

      const adapter = resolveStorageAdapter({
        driver: "mongodb",
        db: mockDb,
      });
      expect(adapter).toBeDefined();
    });

    it("should resolve MongoDB adapter with declarative uri", () => {
      const adapter = resolveStorageAdapter({
        driver: "mongodb",
        uri: "mongodb://localhost:27017",
        dbName: "testdb",
      });
      expect(adapter).toBeDefined();
      expect(typeof adapter?.createPost).toBe("function");
      expect(typeof adapter?.getAllPosts).toBe("function");
    });

    it("should resolve MongoDB adapter with deployment: 'cloudflare'", () => {
      const adapter = resolveStorageAdapter({
        driver: "mongodb",
        uri: "mongodb://localhost:27017",
        dbName: "testdb",
        deployment: "cloudflare",
      });
      expect(adapter).toBeDefined();
      expect(typeof adapter?.createPost).toBe("function");
    });

    it("should reject MongoDB configuration missing db, client, dbProvider, and uri", () => {
      expect(() =>
        resolveStorageAdapter({
          driver: "mongodb",
        } as any)
      ).toThrow("MongoDB storage requires 'db', 'client', 'dbProvider', or 'uri'.");
    });
  });

  describe("6. Backward Compatibility with v1 Legacy Configuration", () => {
    it("should accept direct ContlifyAdapter in storage or adapter property", () => {
      const adapter = new InMemoryContlifyAdapter();
      const resolvedDirect = resolveStorageAdapter(adapter);
      expect(resolvedDirect).toBe(adapter);

      const resolvedLegacy = resolveStorageAdapter(undefined, adapter);
      expect(resolvedLegacy).toBe(adapter);
    });

    it("should correctly resolve legacy getPostUrl and buildPostUrl", () => {
      const customFn = (post: any) => `/custom-route/${post.slug}`;
      const resolved = resolveConfig({
        getPostUrl: customFn,
      });
      expect(resolved.getPostUrl).toBe(customFn);
    });
  });
});
