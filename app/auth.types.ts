import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "webmaster" | "operator" | "client";
      orgId: string | null;
      email: string;
      name: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: "webmaster" | "operator" | "client";
    orgId: string | null;
  }
}
