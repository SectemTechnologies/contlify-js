import { postgresSchema } from "./postgres-schema.js";
import { d1Schema } from "./d1-schema.js";

export { postgresSchema } from "./postgres-schema.js";
export { d1Schema } from "./d1-schema.js";

export type SupportedDatabaseType = "postgres" | "supabase" | "d1" | "mongodb";

/**
 * Returns the SQL migration string for the given database type.
 */
export function getMigrationSql(dbType: SupportedDatabaseType): string {
  switch (dbType) {
    case "postgres":
    case "supabase":
      return postgresSchema;
    case "d1":
      return d1Schema;
    case "mongodb":
      return "// MongoDB collections auto-initialize on first insert. No migration needed.";
    default:
      throw new Error(`[contlify] Unsupported database type: ${dbType as string}`);
  }
}
