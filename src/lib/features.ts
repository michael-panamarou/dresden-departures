/**
 * Optional features switch on automatically when their settings exist.
 * The app works fully without them: a fresh clone runs with no accounts or database.
 */
export function isFavoritesEnabled(): boolean {
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      process.env.DATABASE_URL,
  );
}
