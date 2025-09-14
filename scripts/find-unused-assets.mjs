// Node >= 18
import fs from "fs";
import path from "path";
import url from "url";

const ROOT = path.dirname(url.fileURLToPath(import.meta.url)) + "/..";

// Konfiguration
const ASSET_DIRS = ["public", "src/assets"];
const CODE_DIRS = ["src", "public"]; // wo nach Verwendungen gesucht wird
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", "out"]);
const ASSET_EXT = /\.(png|jpe?g|svg|webp|ico|gif|avif|bmp|mp3|mp4|webm|woff2?|ttf|otf)$/i;
const CODE_EXT = /\.(ts|tsx|js|jsx|json|css|scss|html|md|yml|yaml)$/i;

// Dateien, die auch ohne expliziten Verweis „benutzt“ sind
const IMPLICIT_PUBLIC = new Set([
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/robots.txt",
  "public/site.webmanifest",
  "public/manifest.webmanifest",
]);

// Hilfsfunktionen
const toPosix = p => p.split(path.sep).join("/");
const rel = p => toPosix(path.relative(ROOT, p));

function walk(dir, fileFilter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (!st.isDirectory()) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...walk(abs, fileFilter));
    } else {
      if (!fileFilter || fileFilter(abs)) out.push(abs);
    }
  }
  return out;
}

function listAssets() {
  const files = [];
  for (const d of ASSET_DIRS) files.push(...walk(path.join(ROOT, d), p => ASSET_EXT.test(p)));
  return files.map(rel);
}

function listCodeFiles() {
  const files = [];
  for (const d of CODE_DIRS) files.push(...walk(path.join(ROOT, d), p => CODE_EXT.test(p)));
  return files.map(rel);
}

function normalizeRef(ref, fileDirAbs) {
  if (!ref) return null;
  if (/^data:/.test(ref)) return null;
  if (/^https?:\/\//.test(ref)) return null;
  // Query/Hash entfernen
  ref = ref.replace(/[?#].*$/, "");
  // ~ alias → ignorieren (meistens Node-Modul)
  if (ref.startsWith("~")) return null;

  let abs;
  if (ref.startsWith("/")) {
    // Absolut: relativ zur public-Root
    abs = path.resolve(ROOT, "public", "." + ref);
  } else if (ref.startsWith("public/") || ref.startsWith("src/assets/")) {
    abs = path.resolve(ROOT, ref);
  } else {
    abs = path.resolve(fileDirAbs, ref);
  }
  return rel(abs);
}

function extractRefsFromText(txt, fileRel) {
  const dirAbs = path.resolve(ROOT, path.dirname(fileRel));
  const refs = new Set();

  // 1) import / from / require
  const r1 = /(?:import\s+[^'\"]*?from\s*|import\s*|require\()\s*['\"]([^'\"]+\.(?:png|jpe?g|svg|webp|ico|gif|avif|bmp|mp3|mp4|webm|woff2?|ttf|otf))['\"]\)?/gi;
  // 2) url(...) in CSS
  const r2 = /url\(\s*['\"]?([^'\")?#]+\.(?:png|jpe?g|svg|webp|ico|gif|avif|bmp|woff2?|ttf|otf))['\"]?\s*\)/gi;
  // 3) HTML/JS/JSON Attribute/Objekt-Felder
  const r3 = /\b(?:src|href|content|icon|image|imagesrc|poster)\s*[:=]\s*['\"]([^'\"]+\.(?:png|jpe?g|svg|webp|ico|gif|avif|bmp|mp3|mp4|webm|woff2?|ttf|otf))['\"]/gi;
  const r4 = /\b(?:src|href)\s*=\s*['\"]([^'\"]+\.(?:png|jpe?g|svg|webp|ico|gif|avif|bmp|mp3|mp4|webm|woff2?|ttf|otf))['\"]/gi;

  for (const rx of [r1, r2, r3, r4]) {
    let m;
    while ((m = rx.exec(txt))) {
      const n = normalizeRef(m[1], dirAbs);
      if (n) refs.add(n);
    }
  }

  // 4) manifest.webmanifest explizit JSON-parsen (robuster)
  if (/manifest\.webmanifest$/i.test(fileRel)) {
    try {
      const json = JSON.parse(txt);
      const icons = (json.icons ?? []).map(x => x.src).filter(Boolean);
      for (const i of icons) {
        const n = normalizeRef(i, path.resolve(ROOT, "public"));
        if (n) refs.add(n);
      }
    } catch { /* ignore */ }
  }

  return refs;
}

function collectReferences() {
  const files = listCodeFiles();
  const byPath = new Set();
  const byBase = new Set();

  for (const f of files) {
    const full = path.resolve(ROOT, f);
    let txt;
    try {
      txt = fs.readFileSync(full, "utf8");
    } catch { continue; }
    const refs = extractRefsFromText(txt, f);
    for (const r of refs) {
      byPath.add(toPosix(r));
      byBase.add(path.posix.basename(r));
    }
  }

  // Implizit genutzte Public-Dateien berücksichtigen
  for (const ip of IMPLICIT_PUBLIC) byPath.add(toPosix(ip));

  return { byPath, byBase, scannedFiles: files.length };
}

function main() {
  const allAssets = listAssets();                 // relative POSIX-Pfade
  const { byPath, byBase, scannedFiles } = collectReferences();

  const unused = [];
  const used = [];
  for (const a of allAssets) {
    const base = path.posix.basename(a);
    if (byPath.has(a) || byBase.has(base)) used.push(a);
    else unused.push(a);
  }

  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "reports", "unused-assets.txt"), unused.join("\n"));
  fs.writeFileSync(
    path.join(ROOT, "reports", "asset-refs.json"),
    JSON.stringify({ used, unused, totals: { assets: allAssets.length, codeFiles: scannedFiles } }, null, 2)
  );

  console.log(`Assets gesamt: ${allAssets.length}`);
  console.log(`Code-Dateien gescannt: ${scannedFiles}`);
  console.log(`Gefundene Verwendungen: ${byPath.size} Pfadtreffer (${byBase.size} Basen)`);
  console.log(`UNBENUTZT: ${unused.length} → reports/unused-assets.txt`);
  if (unused.length) {
    console.log("Hinweis: Prüfe false positives (z.B. dynamisch geladene Dateien, runtime-Generierung, SW-Caches).");
  }
}

main();
