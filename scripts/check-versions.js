// Daily check of every version-dependent part of the project that
// scripts/check-expo.js does not already cover:
//   1. TypeScript and React type definitions match what the installed Expo SDK
//      expects (Expo publishes these per SDK).
//   2. npm packages that Expo does not manage (e.g. @supabase/supabase-js) have
//      no new major version.
//   3. The Node.js version the GitHub workflows run on is still supported.
//   4. The GitHub Actions the workflows use are on their latest major version.
// Exits non-zero if anything needs attention. Run locally with
// `npm run check:versions`; the "Version checks" GitHub workflow runs it daily.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const WORKFLOWS = path.join(ROOT, ".github", "workflows");
const NODE_EOL_WARN_DAYS = 60;

const problems = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  console.log(`  FAIL  ${msg}`);
  problems.push(msg);
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const installedVersion = (name) => readJson(path.join(ROOT, "node_modules", name, "package.json")).version;
const major = (v) => Number(String(v).replace(/^[^\d]*/, "").split(".")[0]);

// Does `version` satisfy a simple npm range: "1.2.3", "~1.2.3", "^1.2.3"?
function satisfies(version, range) {
  const [vMaj, vMin, vPat] = version.split(".").map(Number);
  const [rMaj, rMin, rPat] = range.replace(/^[~^]/, "").split(".").map(Number);
  const atLeast = vMaj > rMaj || (vMaj === rMaj && (vMin > rMin || (vMin === rMin && vPat >= rPat)));
  if (range.startsWith("~")) return vMaj === rMaj && vMin === rMin && atLeast;
  if (range.startsWith("^")) return vMaj === rMaj && atLeast;
  return version === range;
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

async function checkExpoRelatedPackages() {
  console.log("\nTypeScript / React types vs. the installed Expo SDK");
  const sdk = `${major(installedVersion("expo"))}.0.0`;
  const versions = (await getJson("https://api.expo.dev/v2/versions/latest")).data;
  const related = versions.sdkVersions[sdk]?.relatedPackages;
  if (!related) return bad(`Expo has no version data for SDK ${sdk}`);
  const pkg = readJson(path.join(ROOT, "package.json"));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of Object.keys(related)) {
    if (!declared[name]) continue; // only check packages this project uses
    const have = installedVersion(name);
    if (satisfies(have, related[name])) ok(`${name} ${have} (SDK ${major(sdk)} expects ${related[name]})`);
    else bad(`${name} ${have} — SDK ${major(sdk)} expects ${related[name]}`);
  }
}

async function checkUnmanagedPackages() {
  console.log("\nnpm packages Expo doesn't manage — new major versions");
  const pkg = readJson(path.join(ROOT, "package.json"));
  const bundled = readJson(path.join(ROOT, "node_modules", "expo", "bundledNativeModules.json"));
  const sdk = `${major(installedVersion("expo"))}.0.0`;
  const versions = (await getJson("https://api.expo.dev/v2/versions/latest")).data;
  const related = versions.sdkVersions[sdk]?.relatedPackages ?? {};
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
    (n) => n !== "expo" && !bundled[n] && !related[n]
  );
  for (const name of names) {
    const have = installedVersion(name);
    const latest = execSync(`npm view ${name} version`, { encoding: "utf8" }).trim();
    if (major(latest) > major(have)) bad(`${name} ${have} — new major version ${latest} is out`);
    else ok(`${name} ${have} (latest ${latest})`);
  }
}

function workflowFiles() {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({ file: f, text: fs.readFileSync(path.join(WORKFLOWS, f), "utf8") }));
}

async function checkNodeVersions() {
  console.log("\nNode.js versions used by GitHub workflows");
  const schedule = await getJson("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json");
  const seen = new Set();
  for (const { file, text } of workflowFiles()) {
    for (const m of text.matchAll(/node-version:\s*["']?([^\s"'#]+)/g)) {
      const v = m[1];
      const key = `${file}:${v}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (v.startsWith("lts/")) {
        ok(`${file}: Node ${v} (always the newest supported version)`);
        continue;
      }
      const end = schedule[`v${v}`]?.end;
      if (!end) {
        bad(`${file}: Node ${v} has no entry in the Node.js release schedule`);
        continue;
      }
      const daysLeft = Math.floor((new Date(end) - Date.now()) / 86400000);
      if (daysLeft < 0) bad(`${file}: Node ${v} reached end of life on ${end}`);
      else if (daysLeft <= NODE_EOL_WARN_DAYS) bad(`${file}: Node ${v} reaches end of life on ${end} (${daysLeft} days)`);
      else ok(`${file}: Node ${v} (supported until ${end})`);
    }
  }
}

async function checkActions() {
  console.log("\nGitHub Actions used by workflows");
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const latestCache = {};
  for (const { file, text } of workflowFiles()) {
    for (const m of text.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@v(\d+)/g)) {
      const [, repo, used] = m;
      if (!latestCache[repo]) {
        latestCache[repo] = (await getJson(`https://api.github.com/repos/${repo}/releases/latest`, headers)).tag_name;
      }
      const latest = latestCache[repo];
      if (major(latest) > Number(used)) bad(`${file}: ${repo}@v${used} — latest is ${latest}`);
      else ok(`${file}: ${repo}@v${used}`);
    }
  }
}

(async () => {
  for (const check of [checkExpoRelatedPackages, checkUnmanagedPackages, checkNodeVersions, checkActions]) {
    try {
      await check();
    } catch (e) {
      bad(`${check.name} could not run: ${e.message}`);
    }
  }
  if (problems.length) {
    console.log(`\nVersion check FAILED — ${problems.length} item(s) need attention:`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nVersion check passed.");
})();
