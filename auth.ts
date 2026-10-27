// Ensure type augmentations are loaded first
import "./app/auth.types";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import { sql } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/password-utils";

class SignInUnavailable extends CredentialsSignin {
  code = "auth_unavailable";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        let user: {
          id: string;
          email: string;
          password_hash: string;
          name: string | null;
          role: "webmaster" | "operator" | "client";
          org_id: string | null;
        };

        try {
          const result = await sql`
            SELECT id, email, password_hash, name, role, org_id
            FROM app.users
            WHERE lower(email) = lower(${credentials.email as string})
            AND status = 'active'
            LIMIT 1
          `;
          user = result[0] as typeof user;
        } catch (error) {
          console.error("Auth error:", error);
          throw new SignInUnavailable();
        }

        if (!user?.password_hash) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) {
          return null;
        }

        try {
          await sql`
            UPDATE app.users
            SET last_login_at = NOW()
            WHERE id = ${user.id}
          `;
        } catch (error) {
          console.error("Auth error: failed to record last login", error);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.org_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "webmaster" | "operator" | "client";
        session.user.orgId = token.orgId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
