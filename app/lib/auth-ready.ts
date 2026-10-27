import { sql } from "@/app/lib/db";

export async function assertAuthReady() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET is missing or shorter than 32 characters. Sign-in cannot start."
    );
  }

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'users'
      AND column_name = 'password_hash'
  `;

  if (columns.length === 0) {
    throw new Error(
      "app.users.password_hash is missing. Run scripts/migrations/005_password_hash_column.sql before starting the app."
    );
  }
}
