const { spawnSync } = require("child_process");

const result = spawnSync("npx", ["tsx", "scripts/reset-staff-passwords.ts"], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
