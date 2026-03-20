import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 1) {
  throw new Error(
    "NEXTAUTH_SECRET is missing or empty. Add it to .env.local (generate with: openssl rand -base64 32)"
  );
}

const ALLOWED_EMAILS = (process.env.ALLOWED_GOOGLE_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_DOMAIN = (process.env.ALLOWED_GOOGLE_DOMAIN ?? "")
  .trim()
  .toLowerCase();

const OWNER_EMAILS = (process.env.OWNER_GOOGLE_EMAILS ?? process.env.ALLOWED_GOOGLE_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getRoleForEmail(email: string | null | undefined): "owner" | "staff" {
  const lower = email?.toLowerCase() ?? "";
  if (!lower) return "staff";
  if (OWNER_EMAILS.length > 0 && OWNER_EMAILS.includes(lower)) {
    return "owner";
  }
  // Fallback: first allowed email is owner, others are staff
  if (ALLOWED_EMAILS[0] && ALLOWED_EMAILS[0] === lower) {
    return "owner";
  }
  return "staff";
}

async function refreshGoogleAccessToken(token: import("next-auth/jwt").JWT) {
  try {
    if (!token.refreshToken) return token;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      return { ...token, error: "RefreshAccessTokenError" as const };
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    return {
      ...token,
      accessToken: data.access_token,
      // keep existing refresh token if Google does not return a new one
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/business.manage",
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase() ?? "";
      if (!email) return false;

      if (ALLOWED_EMAILS.length > 0 && ALLOWED_EMAILS.includes(email)) {
        return true;
      }

      if (ALLOWED_DOMAIN && email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return true;
      }

      return false;
    },
    async jwt({ token, account }) {
      // Initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60 * 60 * 1000;
        token.role = getRoleForEmail(token.email as string | undefined);
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (typeof token.accessTokenExpires === "number" && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to refresh it
      return refreshGoogleAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        const jwtToken = token as JWT;
        const sessionWithRole = session as Session;
        sessionWithRole.user.role = jwtToken.role ?? getRoleForEmail(session.user.email);
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
  },
  secret,
};

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "owner" | "staff";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    role?: "owner" | "staff";
    error?: "RefreshAccessTokenError";
  }
}
