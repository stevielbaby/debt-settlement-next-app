export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertAuthReady } = await import("./app/lib/auth-ready");
    await assertAuthReady();
  }
}
