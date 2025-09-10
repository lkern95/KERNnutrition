import React from 'react';
import { Pill, Dumbbell, Droplets, Sun, Brain, Zap, Info } from 'lucide-react';
import { getEffective } from '../lib/derived';
import { useAppStore } from '../store/appStore';

const GOLD = '#ffd000';
const INK = '#292c2f';
const WHITE = '#ececec';
const RED = '#ff4d4d';

type Item = {
  key: string;
  name: string;
  icon: React.ReactNode;
  dose: string;
  timing?: string;
  note?: string;
  caution?: string;
};

export default function SupplementsPage() {
  const eff = getEffective();
  const profile = (useAppStore.getState()?.profile ?? {}) as { weight?: number };
  const weight = Number(profile.weight ?? 0);

  // Dynamische, sichere Heuristiken:
  const creatineDose = weight >= 85 ? '5 g/Tag' : '3–5 g/Tag';
  const caffeineMg = Math.round((weight || 70) * 3); // ≈ 3 mg/kg
  const wheyScoop = 25; // g je Scoop
  const wheyHint =
    eff.P > 0 ? `Optional: ${Math.max(1, Math.round((0.2 * eff.P) / wheyScoop))} Scoop(s) für ~20% deines Protein-Ziels` : undefined;

  const items: Item[] = [
    {
      key: 'whey',
      name: 'Molkenprotein (Whey)',
      icon: <Dumbbell size={18} color={WHITE} />,
      dose: `20–40 g/Tag (je nach Bedarf)`,
      timing: 'z. B. nach dem Training oder wenn Protein-Mahlzeit fehlt',
      note: wheyHint,
    },
    {
      key: 'creatine',
      name: 'Kreatin Monohydrat',
      icon: <Brain size={18} color={WHITE} />,
      dose: creatineDose,
      timing: 'täglich, Zeitpunkt egal (z. B. mit Mahlzeit)',
      note: 'Fördert Leistungsfähigkeit bei kurzzeitigen, hochintensiven Belastungen',
    },
    {
      key: 'omega3',
      name: 'Omega-3 (EPA+DHA)',
      icon: <Droplets size={18} color={WHITE} />,
      dose: '1–2 g EPA+DHA/Tag',
      timing: 'zu einer fetthaltigen Mahlzeit',
      note: 'Bei wenig Fischkonsum eher Richtung 2 g/Tag',
    },
    {
      key: 'vitd',
      name: 'Vitamin D3',
      icon: <Sun size={18} color={WHITE} />,
      dose: '1000–2000 IU/Tag',
      timing: 'täglich, vorzugsweise mit Mahlzeit/Fett',
      note: 'Individuell variabel – ggf. Spiegel bestimmen lassen',
      caution: 'Kein Ersatz für Diagnostik; Dosierung bei Mangel mit Fachperson klären',
    },
    {
      key: 'mg',
      name: 'Magnesium (Citrat/Bisglycinat)',
      icon: <Pill size={18} color={WHITE} />,
      dose: '200–400 mg/Tag',
      timing: 'abends oder in zwei Dosen, bei Bedarf',
      note: 'Kann bei Krämpfen/hoher Trainingsbelastung unterstützen',
    },
    {
      key: 'caffeine',
      name: 'Koffein (Pre-Workout)',
      icon: <Zap size={18} color={WHITE} />,
      dose: `${caffeineMg} mg (≈ 3 mg/kg)`,
      timing: '30–45 min vor dem Training',
      caution: 'Empfindlichkeit beachten; nicht spät abends nutzen',
    },
  ];

  return (
    <div className="min-h-[100dvh] relative">
      {/* Hintergrund */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#32174d] via-[#2c2837] to-[#292c2f]" />
      <div className="p-5 space-y-5">
        <header className="flex items-center justify-between pop-in">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: WHITE }}>Supplements</h1>
            <p className="text-sm mt-0.5" style={{ color: `${WHITE}99` }}>
              Vorschläge basierend auf deinen Zielen & Profilangaben
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((it, idx) => (
            <details
              key={it.key}
              className="acc card card-hover ink soft-border pop-in"
              open={false}
              style={{ animationDelay: `${0.06 * idx}s` }}
            >
              <summary className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold-soft" style={{ color: GOLD }}>
                    {it.icon}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: WHITE }}>{it.name}</div>
                    <div className="text-sm" style={{ color: GOLD }}>{it.dose}</div>
                  </div>
                </div>
                <Info size={18} className="chev" color={GOLD} />
              </summary>
              <div className="mt-3 space-y-1 text-sm">
                {it.timing && <div><span className="opacity-80">Timing:</span> <span>{it.timing}</span></div>}
                {it.note && <div className="opacity-90">{it.note}</div>}
                {it.caution && <div className="text-[12px]" style={{ color: RED }}>⚠ {it.caution}</div>}
              </div>
            </details>
          ))}
        </div>

        <footer className="text-xs opacity-70 mt-4" style={{ color: WHITE }}>
          Hinweis: Empfehlungen sind allgemeiner Natur (Sporternährung). Keine medizinische Beratung.
        </footer>
      </div>
    </div>
  );
}
