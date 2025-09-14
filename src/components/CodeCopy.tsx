import { useState } from 'react';

export function CodeCopy({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="rounded-xl border p-3">
      <pre className="overflow-x-auto text-sm">{code}</pre>
      <button
        className="mt-2 rounded-xl border px-3 py-1"
        onClick={async () => { await navigator.clipboard.writeText(code); setOk(true); setTimeout(()=>setOk(false),1500); }}
      >
        {ok ? 'Kopiert' : 'Kopieren'}
      </button>
    </div>
  );
}
