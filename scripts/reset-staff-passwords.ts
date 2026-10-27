import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const STAFF = [
  { email: "admin@woodslegal.com", password: "webmaster123" },
  { email: "operator@woodslegal.com", password: "operator123" },
];

async function main() {
  const { setUserPassword } = await import("@/app/lib/password-utils");
  for (const account of STAFF) {
    const user = await setUserPassword(account.email, account.password);
    console.log(`updated ${user.email} (${user.role})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
