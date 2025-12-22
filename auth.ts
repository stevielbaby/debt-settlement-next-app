// Ensure type augmentations are loaded first
import "./app/auth.types";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "@/app/lib/db";

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

        try {
          // Ensure we query from the dedicated app schema
          const result = await sql`
            SELECT id, email, password_hash, name, role, org_id, status
            FROM app.users
            WHERE email = ${credentials.email as string}
            AND status = 'active'
            LIMIT 1
          `;

          const user = result[0];

          if (!user) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );

          if (!isValid) {
            return null;
          }

          // Update last login
          await sql`
            UPDATE app.users
            SET last_login_at = NOW()
            WHERE id = ${user.id}
          `;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.org_id,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
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
