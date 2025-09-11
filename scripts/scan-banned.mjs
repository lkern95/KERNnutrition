import fs from 'fs'; import path from 'path';
const banned = fs.readFileSync('banned_keywords.txt','utf8').split(/\r?\n/).filter(Boolean).map(s=>s.toLowerCase());
const skip = new Set(['node_modules','.git','dist','build','coverage','.next']);
let hits = 0;
function walk(p){
  const st = fs.statSync(p);
  if (st.isDirectory()){
    if (skip.has(path.basename(p))) return;
    for (const f of fs.readdirSync(p)) walk(path.join(p,f));
  } else {
    const txt = fs.readFileSync(p,'utf8').toLowerCase();
    for (const b of banned){
      if (txt.includes(b)) {
        console.log(p,'→',b);
        hits++;
      }
    }
  }
}
walk(process.cwd());
console.log(`Found ${hits} potential issues.`);
process.exit(hits ? 1 : 0);
