/**
 * Canonicalize a GitHub repo reference to a lowercase `owner/repo` slug, so the
 * webhook's `repository.full_name` matches whatever an admin typed into the
 * project's "GitHub repo" field — a bare slug, a full https URL, or an SSH URL.
 */
export function normalizeRepo(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/^git@github\.com:/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}
