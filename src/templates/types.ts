/**
 * One file written by the CLI scaffolder.
 */
export interface ScaffoldFileEntry {
  /** Relative path from project root where the file will be created. */
  relativePath: string;
  /** Function that returns the file content string. */
  getContent: () => string;
  /** Human-readable description for CLI output. */
  description: string;
}
