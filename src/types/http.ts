/**
 * Supported HTTP methods in Contlify router.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

/**
 * Standardized HTTP headers representation.
 */
export type HttpHeaders = Record<string, string | string[] | undefined>;

/**
 * Parsed URL query parameters object.
 */
export type QueryParameters = Record<string, string | string[] | undefined>;
