import type { Author } from "../types/domain.js";
import type { AuthorPayload } from "../types/payload.js";

/**
 * Storage adapter contract for managing Author operations.
 */
export interface AuthorAdapterContract {
  getAuthorBySlug(slug: string): Promise<Author | null>;
  upsertAuthor(payload: AuthorPayload): Promise<Author>;
  deleteAuthor(slug: string): Promise<boolean>;
}
