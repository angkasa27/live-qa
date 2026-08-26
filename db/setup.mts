// Everything a fresh clone needs before `npm run dev`, in order.
//
//   npm run setup
//
// Each step runs as its own process rather than an import: they end in process.exit() to close
// their connection pools, which would otherwise tear down this script mid-run.
import { spawnSync } from "node:child_process";

const steps: [string, string][] = [
  ["schema", "db/schema.mts"],
  ["auth", "db/auth-migrate.mts"],
  ["seed", "db/seed.mts"],
];

for (const [label, script] of steps) {
  console.log(`\n── ${label} ──`);
  const { status } = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", script],
    { stdio: "inherit", cwd: new URL("..", import.meta.url).pathname },
  );
  if (status !== 0) {
    console.error(`\n${label} failed, stopping.`);
    process.exit(status ?? 1);
  }
}

console.log(`
Done. Next:
  npm run admin:create -- "Nama" you@example.com "password-min-12-chars"
  npm run dev
`);
