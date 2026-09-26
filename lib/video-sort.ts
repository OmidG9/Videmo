/** Shared, client-safe sorting contract (no server-only imports). */
export const SORT_OPTIONS = [
  "newest",
  "oldest",
  "title",
  "largest",
  "longest",
  "views",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && (SORT_OPTIONS as readonly string[]).includes(value);
}
