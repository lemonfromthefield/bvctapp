const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

function getCanonicalCwd() {
  try {
    if (typeof fs.realpathSync.native === "function") {
      return fs.realpathSync.native(process.cwd());
    }
    return fs.realpathSync(process.cwd());
  } catch {
    return process.cwd();
  }
}

const canonicalCwd = getCanonicalCwd();
if (canonicalCwd && canonicalCwd !== process.cwd()) {
  process.chdir(canonicalCwd);
}

const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "dev"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
