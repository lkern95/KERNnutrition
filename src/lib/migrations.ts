// src/lib/migrations.ts

import { APP } from '../config/app';

export function migrateLocalStoragePrefixes() {
  const moves: Array<{oldKey:string,newKey:string,val:string}> = [];
  for (let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i)!;
    const old = APP.OLD_IDS.find(p => k.startsWith(p+'-') || k.startsWith(p+'_'));
    if (!old) continue;
    const suffix = k.slice(old.length).replace(/^[-_]/,'');
    const newKey = `${APP.ID}-${suffix}`;
    if (newKey !== k) {
      const val = localStorage.getItem(k);
      if (val != null) moves.push({oldKey:k,newKey,val});
    }
  }
  moves.forEach(({oldKey,newKey,val}) => {
    localStorage.setItem(newKey,val);
    localStorage.removeItem(oldKey);
  });
}

export async function migrateIndexedDBNames() {
  // IDB kann man nicht "umbenennen" – ggf. Daten kopieren, wenn nötig.
  // Bei dir gibt’s keine komplexe DB-Logik → pragmatisch: nichts tun außer Cleanup bei wipe.
  return;
}
