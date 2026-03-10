import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cleanupTargets = [
  "public/archive",
  "public/app/images",
  "public/data",
  "public/firebase.js",
  "public/js",
  "public/legacy",
  "public/styles",
];

const copyJobs = [
  { from: "archive", to: "public/archive" },
  { from: "app/images", to: "public/app/images" },
  { from: "data", to: "public/data" },
  { from: "firebase.js", to: "public/firebase.js" },
  { from: "js", to: "public/js" },
  { from: "login", to: "public/legacy/login" },
  { from: "app/dashboard", to: "public/legacy/app/dashboard" },
  { from: "app/team", to: "public/legacy/app/team" },
  { from: "app/cases", to: "public/legacy/app/cases" },
  { from: "app/issue", to: "public/legacy/app/issue" },
  { from: "app/leaderboard", to: "public/legacy/app/leaderboard" },
  { from: "app/act", to: "public/legacy/app/act" },
  { from: "app/disbursements", to: "public/legacy/app/disbursements" },
  { from: "app/scn/[scnId]", to: "public/legacy/app/scn" },
  { from: "styles", to: "public/styles" },
];

async function removeTarget(relativePath) {
  await rm(path.join(rootDir, relativePath), { force: true, recursive: true });
}

async function copyTarget(from, to) {
  const sourcePath = path.join(rootDir, from);
  const destinationPath = path.join(rootDir, to);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { force: true, recursive: true });
}

async function main() {
  await mkdir(path.join(rootDir, "public"), { recursive: true });

  for (const target of cleanupTargets) {
    await removeTarget(target);
  }

  for (const job of copyJobs) {
    await copyTarget(job.from, job.to);
  }

  console.log(`Synced ${copyJobs.length} legacy static targets into public/.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
