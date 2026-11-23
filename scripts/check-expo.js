// Checks that this project is in step with Expo:
//   1. every dependency matches what the installed Expo SDK expects
//      (`expo install --check`), and
//   2. the installed SDK is the latest one, which is the only SDK the
//      current Expo Go app from the stores can open.
// Exits non-zero if either check fails. Run locally with `npm run check:expo`;
// the "Expo dependency check" GitHub workflow runs it on a schedule.

const { spawnSync, execSync } = require("child_process");
const path = require("path");

let failed = false;

const installed = require(path.join(__dirname, "..", "node_modules", "expo", "package.json")).version;
const latest = execSync("npm view expo version", { encoding: "utf8" }).trim();
const major = (v) => Number(v.split(".")[0]);

console.log(`Installed Expo SDK: ${installed}`);
console.log(`Latest Expo SDK:    ${latest}`);

if (major(installed) < major(latest)) {
  failed = true;
  console.log(
    `\nSDK ${major(latest)} is out. Expo Go only opens the latest SDK, so this project ` +
      `(SDK ${major(installed)}) will not open in an up-to-date Expo Go.\n` +
      `Upgrade guide: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/`
  );
}

console.log("\nChecking dependencies against the installed SDK...");
const check = spawnSync("npx expo install --check", { stdio: "inherit", shell: true });
if (check.status !== 0) {
  failed = true;
  console.log("Fix with: npx expo install --fix");
}

console.log(failed ? "\nExpo check FAILED." : "\nExpo check passed.");
process.exit(failed ? 1 : 0);
