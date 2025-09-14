// scripts/delete-from-list.mjs
// Dieses Skript löscht oder archiviert Dateien aus einer Liste (z.B. reports/safe_to_delete.txt)
// Node >= 18
import fs from "fs";
import path from "path";
import url from "url";
import { execSync } from "child_process";

const ROOT = path.dirname(url.fileURLToPath(import.meta.url)) + "/..";

const listPath = process.argv[2] || "reports/safe_to_delete.txt";
const mode = process.argv[3] || "--archive"; // "--delete" oder "--archive"
const archiveDir = path.join(ROOT, "z_archive", new Date().toISOString().slice(0,10));

if (!fs.existsSync(listPath)) {
  console.error(`Liste nicht gefunden: ${listPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(listPath, "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
if (!lines.length) {
  console.log("Nichts zu tun. Liste ist leer.");
  process.exit(0);
}

if (mode === "--archive") {
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const rel of lines) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const dest = path.join(archiveDir, rel.replaceAll("/", "__"));
    fs.renameSync(abs, dest);
    console.log(`archived: ${rel} -> ${path.relative(ROOT, dest)}`);
  }
  execSync(`git add -A && git commit -m "chore: archive duplicate variants (${lines.length})"`, { stdio: "inherit" });
} else if (mode === "--delete") {
  for (const rel of lines) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    fs.rmSync(abs, { force: true });
    console.log(`deleted: ${rel}`);
  }
  execSync(`git add -A && git commit -m "chore: remove duplicate variants (${lines.length})"`, { stdio: "inherit" });
} else {
  console.error(`Unbekannter Modus: ${mode} (nutze --archive oder --delete)`);
  process.exit(1);
}
