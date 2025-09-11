import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const exts = new Set(['.ts','.tsx','.js','.jsx','.json','.css','.scss','.html','.webmanifest','.svg','.md']); // MD optional
const includeDirs = ['src','public','package.json','vite.config.ts','tailwind.config.js','PWA_DEPLOYMENT_GUIDE.md','README.md'];

const map = [
  { from: /KERNbalance/g, to: 'KERNnutrition' },   // Sichtbarer Name
  { from: /kernBalance/g, to: 'kernnutrition' },   // alte Camel-Variante
  { from: /kernbalance/g, to: 'kernnutrition' },   // technischer Prefix
];

const mode = process.argv[2] || '--dry';
let changed = 0, files = 0;

function walk(p){
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()){
    if (['node_modules','.git','dist','build','coverage'].includes(path.basename(p))) return;
    for (const f of fs.readdirSync(p)) walk(path.join(p,f));
  } else {
    const ext = path.extname(p);
    if (!ext && !p.endsWith('package.json')) return;
    if (ext && !exts.has(ext)) return;
    let txt = fs.readFileSync(p,'utf8');
    let orig = txt;
    for (const {from,to} of map) txt = txt.replace(from,to);
    if (txt !== orig){
      files++;
      if (mode === '--apply') fs.writeFileSync(p,txt,'utf8');
      else {
        // Nur anzeigen
        console.log('[DRY] would change:', p);
      }
      changed++;
    }
  }
}
for (const entry of includeDirs) walk(path.join(root, entry));
console.log(`${mode === '--apply' ? 'Changed' : 'Would change'} ${changed} chunks across ${files} files.`);
