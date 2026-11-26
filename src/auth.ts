import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js (NextAuth v5) configuration: "Sign in with GitHub".
 *
 * It reads its settings from environment variables automatically:
 *   AUTH_SECRET         random string that encrypts the session cookie (npx auth secret)
 *   AUTH_GITHUB_ID      Client ID of your GitHub OAuth app
 *   AUTH_GITHUB_SECRET  Client secret of your GitHub OAuth app
 *
 * Sessions are stored in an encrypted cookie (JWT), so no user table is needed.
 * The database only stores favourites, keyed by the user's GitHub account ID.
 */
export const { handlers, auth } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    // token.sub is the GitHub account ID: stable even if the user renames their account.
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
