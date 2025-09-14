// scripts/find-duplicate-code.mjs
// Dieses Skript findet Duplikat-Varianten im Code und erzeugt Reports sowie eine Liste mit Dateien, die sicher gelöscht werden können (reports/safe_to_delete.txt).
// Node >= 18
import fs from "fs";
import path from "path";
import url from "url";

const ROOT = path.dirname(url.fileURLToPath(import.meta.url)) + "/..";

// Welche Verzeichnisse nach Code-Dateien durchsucht werden
const CODE_DIRS = ["src", "pages", "components", "lib", "store"].map(d => path.join(ROOT, d)).filter(fs.existsSync);

// Welche Endungen als "Code-Dateien" gelten (für Duplikat-Erkennung + Referenzsuche)
const CODE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".mdx", ".md"];

// Import-Auflösung probiert diese Erweiterungen
const RESOLVE_EXTS = [".ts", ".tsx", ".js", ".jsx", ""];

// Variants, die wir als Duplikat-Endungen erkennen (Dateiname ohne Extension)
const VARIANT_RE = /([._-](?:old|neu|alt|new|copy|backup|bak|final|draft|v\d+|copy\d+|alt\d+|old\d+|new\d+|\(\d+\)|\d{8}|\d{6}))$/i;

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", "out"]);

// ---- helpers ----
const toPosix = p => p.split(path.sep).join("/");
const isCodeFile = fp => CODE_EXTS.includes(path.extname(fp));

function walk(dir, arr = []) {
  if (!fs.existsSync(dir)) return arr;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(abs, arr);
    } else {
      if (isCodeFile(abs)) arr.push(abs);
    }
  }
  return arr;
}

// Zerlegt "Button_old.tsx" -> { base:"Button", variant:"_old" }, "Button.tsx" -> { base:"Button", variant:null }
function splitVariant(stem /* name ohne extension */) {
  const m = stem.match(VARIANT_RE);
  if (!m) return { base: stem, variant: null };
  return { base: stem.slice(0, m.index), variant: m[1] };
}

function groupDuplicates(files) {
  // Gruppen-Key = <dir>/<base><ext>
  const groups = new Map();
  for (const abs of files) {
    const dir = path.dirname(abs);
    const ext = path.extname(abs);
    const stem = path.basename(abs, ext);
    const { base, variant } = splitVariant(stem);
    const key = path.join(dir, base + ext);
    if (!groups.has(key)) groups.set(key, { key, ext, dir, base, canonical: null, variants: [] });
    const g = groups.get(key);
    if (variant === null) g.canonical = abs;
    else g.variants.push({ file: abs, variant });
  }
  // Filter: nur Gruppen mit mindestens 1 Variante
  return [...groups.values()].filter(g => g.variants.length > 0);
}

// Import-Pfade aus Code-Datei extrahieren
function extractImports(txt) {
  const refs = new Set();
  const patterns = [
    /import\s+[^'\"]*?from\s*['\"]([^'\"]+)['\"]/g,
    /import\s*['\"]([^'\"]+)['\"]/g,
    /require\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
    /import\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
  ];
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(txt))) refs.add(m[1]);
  }
  return [...refs];
}

// Auflösung relativer Importe -> absoluter Dateipfad (falls existiert)
function resolveImport(importerAbs, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null; // nur relative/absolute Pfade
  // Absolut (vom Repo-Root) zulassen, selten.
  const baseDir = spec.startsWith("/") ? ROOT : path.dirname(importerAbs);
  // 1) direkter Treffer (mit ext)
  const direct = path.resolve(baseDir, spec);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  // 2) ohne ext: versuche verschiedene Endungen
  for (const ext of RESOLVE_EXTS) {
    const p1 = path.resolve(baseDir, spec + ext);
    if (fs.existsSync(p1) && fs.statSync(p1).isFile()) return p1;
  }
  // 3) index.* im Zielordner
  const asDir = path.resolve(baseDir, spec);
  if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
    for (const ext of RESOLVE_EXTS) {
      const p2 = path.join(asDir, "index" + ext);
      if (fs.existsSync(p2) && fs.statSync(p2).isFile()) return p2;
    }
  }
  return null;
}

function buildReferenceIndex(codeFiles) {
  const referenced = new Map(); // absFile -> Set(importerAbs)
  for (const importer of codeFiles) {
    let txt;
    try { txt = fs.readFileSync(importer, "utf8"); } catch { continue; }
    const specs = extractImports(txt);
    for (const s of specs) {
      const target = resolveImport(importer, s);
      if (!target) continue;
      if (!referenced.has(target)) referenced.set(target, new Set());
      referenced.get(target).add(importer);
    }
  }
  return referenced;
}

function main() {
  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  const codeFiles = CODE_DIRS.flatMap(d => walk(d));
  if (codeFiles.length === 0) {
    console.error("Keine Code-Dateien gefunden. Prüfe CODE_DIRS.");
    process.exit(1);
  }

  const refIndex = buildReferenceIndex(codeFiles);
  const groups = groupDuplicates(codeFiles);

  const now = new Date().toISOString().slice(0,10);
  const report = {
    generatedAt: new Date().toISOString(),
    totals: { codeFiles: codeFiles.length, groups: groups.length },
    groups: []
  };

  const safeList = [];
  for (const g of groups) {
    const entry = {
      canonical: g.canonical ? toPosix(path.relative(ROOT, g.canonical)) : null,
      dir: toPosix(path.relative(ROOT, g.dir)),
      ext: g.ext,
      base: g.base,
      variants: []
    };

    // Referenz-Status der Kanonischen
    const canonicalRefs = g.canonical ? (refIndex.get(g.canonical) || new Set()) : new Set();

    for (const v of g.variants) {
      const vRefs = refIndex.get(v.file) || new Set();
      const rel = toPosix(path.relative(ROOT, v.file));
      const importerList = [...vRefs].map(f => toPosix(path.relative(ROOT, f)));
      const mtime = fs.statSync(v.file).mtimeMs;

      const variantInfo = {
        file: rel,
        variant: v.variant,
        referencedBy: importerList,
        refCount: importerList.length,
        mtime
      };
      entry.variants.push(variantInfo);
    }

    // Heuristik: löschen, wenn Variante nirgends importiert wird
    // und (a) es eine kanonische Datei gibt ODER (b) eine andere Variante importiert wird.
    for (const v of entry.variants) {
      const anyOtherReferenced = entry.variants.some(x => x !== v && x.refCount > 0);
      const deletable = v.refCount === 0 && (entry.canonical !== null || anyOtherReferenced);
      if (deletable) safeList.push(v.file);
    }

    // Sort Variants by refCount desc, then mtime desc
    entry.variants.sort((a,b) => b.refCount - a.refCount || b.mtime - a.mtime);

    // Zusätzliche Hinweise
    entry.hints = {
      canonicalReferenced: canonicalRefs.size > 0,
      hasCanonical: entry.canonical !== null,
      note: (!entry.canonical && entry.variants.every(v => v.refCount === 0))
        ? "Keine Datei wird importiert. Manuell prüfen – möglicherweise tote Seite/Komponente."
        : undefined
    };

    report.groups.push(entry);
  }

  fs.writeFileSync(path.join(ROOT, "reports", "duplicate-variants.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(ROOT, "reports", "safe_to_delete.txt"), safeList.join("\n"));
  // Menschlich lesbar
  const md = [
    `# Duplicate Variants Report (${now})`,
    `Code-Dateien gescannt: ${report.totals.codeFiles}`,
    `Gefundene Gruppen: ${report.totals.groups}`,
    ``,
  ];
  for (const g of report.groups) {
    md.push(`## ${g.dir}/${g.base}${g.ext}`);
    md.push(`- Canonical: ${g.canonical ?? "—"}`);
    md.push(`- Varianten:`);
    for (const v of g.variants) {
      md.push(`  - ${v.file}  | refs: ${v.refCount}`);
    }
    if (g.hints?.note) md.push(`- Hinweis: ${g.hints.note}`);
    md.push("");
  }
  fs.writeFileSync(path.join(ROOT, "reports", "duplicate-variants.md"), md.join("\n"));

  console.log(`OK: reports/duplicate-variants.json, reports/duplicate-variants.md, reports/safe_to_delete.txt`);
  console.log(`Kandidaten zum Löschen: ${safeList.length}`);
}

main();
