import type { ContlifyAdapter } from "../adapters/adapter.interface.js";
import type { StorageConfig } from "./types.js";
import {
  createPostgresAdapter,
  createSupabaseAdapter,
  createD1Adapter,
  createMongoAdapter,
} from "../built-in-adapters/index.js";
import { AdapterError } from "../errors/adapter-error.js";

// Cache for resolved adapters to avoid recreating connection pools
const adapterCache = new WeakMap<object, ContlifyAdapter>();

/**
 * Checks if an object appears to be a direct ContlifyAdapter.
 */
function isContlifyAdapter(obj: unknown): obj is ContlifyAdapter {
  if (!obj || typeof obj !== "object") return false;
  const target = obj as Record<string, unknown>;
  return (
    typeof target.createPost === "function" ||
    typeof target.getAllPosts === "function" ||
    typeof target.ping === "function" ||
    (typeof target.posts === "object" && target.posts !== null)
  );
}

// Static dynamic import helpers allowing bundlers (esbuild / OpenNext / Turbopack)
// to statically discover and bundle driver packages when targeting Cloudflare Workers & serverless.
async function loadMongoModule(): Promise<any> {
  try {
    return await import("mongodb");
  } catch {
    return null;
  }
}

async function loadSupabaseModule(): Promise<any> {
  try {
    return await import("@supabase/supabase-js");
  } catch {
    return null;
  }
}

async function loadPgModule(): Promise<any> {
  try {
    return await import("pg");
  } catch {
    return null;
  }
}

async function loadNeonModule(): Promise<any> {
  try {
    return await import("@neondatabase/serverless");
  } catch {
    return null;
  }
}

/**
 * Resolves a ContlifyAdapter from a declarative StorageConfig or legacy adapter instance.
 */
export function resolveStorageAdapter(storage?: StorageConfig, legacyAdapter?: ContlifyAdapter): ContlifyAdapter | undefined {
  if (legacyAdapter) {
    return legacyAdapter;
  }

  if (!storage) {
    return undefined;
  }

  // If passed directly as a ContlifyAdapter
  if (isContlifyAdapter(storage)) {
    return storage;
  }

  if (typeof storage === "object" && storage !== null && adapterCache.has(storage)) {
    return adapterCache.get(storage)!;
  }

  let resolved: ContlifyAdapter | undefined;

  switch (storage.driver) {
    case "custom": {
      resolved = storage.adapter;
      break;
    }

    case "postgres": {
      const client = storage.client ?? storage.pool;
      if (client) {
        resolved = createPostgresAdapter(client as any);
      } else if (storage.connectionString) {
        // Fallback: Lazy wrapper requiring pg or @neondatabase/serverless driver when instantiated via connectionString
        let pgPool: any = null;
        let neonClient: any = null;
        const lazyClient = {
          async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
            if (neonClient) {
              const res = await neonClient(sql, params ?? []);
              return { rows: res as unknown as T[] };
            }
            if (pgPool) {
              return await pgPool.query(sql, params);
            }
            const pgModule = await loadPgModule();
            if (pgModule) {
              const PoolClass = pgModule.default?.Pool ?? pgModule.Pool;
              pgPool = new PoolClass({
                connectionString: storage.connectionString,
                ssl: storage.ssl,
              });
              return await pgPool.query(sql, params);
            }
            const neonModule = await loadNeonModule();
            if (neonModule) {
              const neonFn = neonModule.neon ?? neonModule.default?.neon;
              if (typeof neonFn === "function") {
                neonClient = neonFn(storage.connectionString);
                const res = await neonClient(sql, params ?? []);
                return { rows: res as unknown as T[] };
              }
            }
            throw new AdapterError(
              "A PostgreSQL driver ('pg' or '@neondatabase/serverless') is required when using storage.connectionString. Please install 'pg' or pass a pre-configured client/pool instance to storage.client."
            );
          },
        };
        resolved = createPostgresAdapter(lazyClient);
      } else {
        throw new AdapterError("PostgreSQL storage requires 'client', 'pool', or 'connectionString'.");
      }
      break;
    }

    case "supabase": {
      const client = (storage as any).client ?? (storage as any).pool;
      if (client && typeof client.query === "function") {
        resolved = createPostgresAdapter(client);
      } else if (storage.client) {
        resolved = createSupabaseAdapter(storage.client);
      } else if (storage.connectionString) {
        let pgPool: any = null;
        let neonClient: any = null;
        const lazyClient = {
          async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
            if (neonClient) {
              const res = await neonClient(sql, params ?? []);
              return { rows: res as unknown as T[] };
            }
            if (pgPool) {
              return await pgPool.query(sql, params);
            }
            const pgModule = await loadPgModule();
            if (pgModule) {
              const PoolClass = pgModule.default?.Pool ?? pgModule.Pool;
              pgPool = new PoolClass({
                connectionString: storage.connectionString,
                ssl: storage.ssl,
              });
              return await pgPool.query(sql, params);
            }
            const neonModule = await loadNeonModule();
            if (neonModule) {
              const neonFn = neonModule.neon ?? neonModule.default?.neon;
              if (typeof neonFn === "function") {
                neonClient = neonFn(storage.connectionString);
                const res = await neonClient(sql, params ?? []);
                return { rows: res as unknown as T[] };
              }
            }
            throw new AdapterError(
              "A PostgreSQL driver ('pg' or '@neondatabase/serverless') is required when using Supabase via connectionString. Please install 'pg' or pass a pre-configured client to storage.client."
            );
          },
        };
        resolved = createPostgresAdapter(lazyClient);
      } else if (storage.url && (storage.anonKey || storage.serviceRoleKey)) {
        const url = storage.url;
        const key = storage.serviceRoleKey || storage.anonKey!;
        let supabasePromise: Promise<any> | null = null;

        const getSupabaseClient = async () => {
          if (!supabasePromise) {
            supabasePromise = (async () => {
              const supabaseModule = await loadSupabaseModule();
              if (!supabaseModule) {
                throw new AdapterError(
                  "Supabase client library '@supabase/supabase-js' is required when using storage.url and storage.anonKey / storage.serviceRoleKey. Please install '@supabase/supabase-js' or pass a pre-configured client to storage.client."
                );
              }
              const createClientFn = supabaseModule.createClient ?? supabaseModule.default?.createClient;
              if (typeof createClientFn !== "function") {
                throw new AdapterError("Failed to resolve 'createClient' from '@supabase/supabase-js'.");
              }
              return createClientFn(url, key);
            })();
          }
          return await supabasePromise;
        };

        const createProxyQuery = (operations: Array<{ method: string; args: any[] }> = []): any => {
          return {
            select(...args: any[]) {
              return createProxyQuery([...operations, { method: "select", args }]);
            },
            insert(...args: any[]) {
              return createProxyQuery([...operations, { method: "insert", args }]);
            },
            update(...args: any[]) {
              return createProxyQuery([...operations, { method: "update", args }]);
            },
            upsert(...args: any[]) {
              return createProxyQuery([...operations, { method: "upsert", args }]);
            },
            delete(...args: any[]) {
              return createProxyQuery([...operations, { method: "delete", args }]);
            },
            eq(...args: any[]) {
              return createProxyQuery([...operations, { method: "eq", args }]);
            },
            or(...args: any[]) {
              return createProxyQuery([...operations, { method: "or", args }]);
            },
            in(...args: any[]) {
              return createProxyQuery([...operations, { method: "in", args }]);
            },
            order(...args: any[]) {
              return createProxyQuery([...operations, { method: "order", args }]);
            },
            limit(...args: any[]) {
              return createProxyQuery([...operations, { method: "limit", args }]);
            },
            range(...args: any[]) {
              return createProxyQuery([...operations, { method: "range", args }]);
            },
            async single() {
              try {
                const client = await getSupabaseClient();
                let q = client;
                for (const op of operations) {
                  q = q[op.method](...op.args);
                }
                return await q.single();
              } catch (err) {
                return { data: null, error: err };
              }
            },
            then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
              return (async () => {
                const client = await getSupabaseClient();
                let q = client;
                for (const op of operations) {
                  q = q[op.method](...op.args);
                }
                return await q;
              })()
                .then(onfulfilled)
                .catch((err) => {
                  if (onrejected) {
                    return onrejected(err);
                  }
                  if (onfulfilled) {
                    return onfulfilled({ data: null, error: err });
                  }
                  throw err;
                });
            },
          };
        };

        const lazyClient = {
          from(table: string) {
            return createProxyQuery([{ method: "from", args: [table] }]);
          },
        };
        resolved = createSupabaseAdapter(lazyClient);
      } else {
        throw new AdapterError("Supabase storage requires 'client', 'connectionString', or 'url' with 'anonKey' / 'serviceRoleKey'.");
      }
      break;
    }

    case "d1": {
      const provider = storage.binding ?? storage.env ?? storage.dbProvider;
      if (provider) {
        resolved = createD1Adapter(provider as any);
      } else {
        throw new AdapterError("Cloudflare D1 storage requires 'binding', 'env', or 'dbProvider'.");
      }
      break;
    }

    case "mongodb": {
      const provider = storage.db ?? storage.client ?? storage.dbProvider;
      if (provider) {
        resolved = createMongoAdapter(provider as any);
      } else if (storage.uri !== undefined || ("uri" in storage)) {
        let mongoClient: any = null;
        const lazyProvider = async () => {
          // Guard against Next.js production build / static analysis
          if (process.env.NEXT_PHASE === "phase-production-build") {
            return null;
          }
          const uri = storage.uri || process.env.MONGODB_URI;
          if (!uri) {
            return null;
          }

          const mongoModule = await loadMongoModule();
          if (!mongoModule) {
            throw new AdapterError(
              "MongoDB driver 'mongodb' is required when using storage.uri. Please install 'mongodb' or pass a connected database instance to storage.db."
            );
          }
          const MongoClientClass = mongoModule.MongoClient ?? mongoModule.default?.MongoClient;
          if (typeof MongoClientClass !== "function") {
            throw new AdapterError("Failed to resolve 'MongoClient' from 'mongodb' module.");
          }

          const isCloudflare =
            storage.deployment === "cloudflare" ||
            storage.deployment === "edge" ||
            storage.serverless === true ||
            typeof (globalThis as any).WebSocketPair !== "undefined" ||
            Boolean(process.env.WORKER_SELF_REFERENCE);

          // Check if cached client is alive via lightweight ping command
          if (mongoClient) {
            try {
              const pingPromise = mongoClient.db("admin").command({ ping: 1 });
              await Promise.race([
                pingPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("MongoDB cached ping timeout")), 2500)),
              ]);
              return mongoClient.db(storage.dbName ?? process.env.MONGODB_DB_NAME ?? "contlify");
            } catch {
              try {
                await mongoClient.close();
              } catch {}
              mongoClient = null;
            }
          }

          const clientOptions = isCloudflare
            ? {
                serverSelectionTimeoutMS: 3000,
                connectTimeoutMS: 4000,
                socketTimeoutMS: 5000,
                maxPoolSize: 1,
                minPoolSize: 0,
                maxIdleTimeMS: 5000,
                heartbeatFrequencyMS: 60000,
                ...storage.options,
              }
            : {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
                maxPoolSize: 10,
                ...storage.options,
              };

          mongoClient = new MongoClientClass(uri, clientOptions);

          const connectTimeoutMs = isCloudflare ? 4000 : 8000;
          try {
            await Promise.race([
              mongoClient.connect(),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new AdapterError(
                        uri.startsWith("mongodb+srv://")
                          ? "MongoDB connection timed out. Cloudflare Workers cannot resolve 'mongodb+srv://' schemes due to DNS SRV limitations. Switch to the Standard connection string (mongodb://host1:27017,host2:27017/?replicaSet=...) from Atlas."
                          : `MongoDB connection timed out after ${connectTimeoutMs}ms. Please check your network, credentials, and Atlas IP Access List (0.0.0.0/0).`
                      )
                    ),
                  connectTimeoutMs
                )
              ),
            ]);
          } catch (err) {
            try { await mongoClient.close(); } catch {}
            mongoClient = null;
            throw err;
          }

          return mongoClient.db(storage.dbName ?? process.env.MONGODB_DB_NAME ?? "contlify");
        };
        resolved = createMongoAdapter(lazyProvider);
      } else {
        throw new AdapterError("MongoDB storage requires 'db', 'client', 'dbProvider', or 'uri'.");
      }
      break;
    }

    default:
      throw new AdapterError(`Unsupported storage driver: ${(storage as any)?.driver}`);
  }

  if (resolved && typeof storage === "object" && storage !== null) {
    adapterCache.set(storage, resolved);
  }

  return resolved;
}
