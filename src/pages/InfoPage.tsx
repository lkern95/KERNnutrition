import React from 'react';
import { BookOpen, Calculator, LineChart, Scale, ClipboardList, ChevronRight } from 'lucide-react';

const GOLD = '#ffd000';
const INK = '#292c2f';
const WHITE = '#ececec';

const Section = ({
  icon, title, children, defaultOpen = false, delay = 0
}: { icon: React.ReactNode, title: string, children: React.ReactNode, defaultOpen?: boolean, delay?: number }) => (
  <details className="acc card card-hover ink soft-border pop-in" open={defaultOpen} style={{ animationDelay: `${delay}s` }}>
    <summary className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gold-soft" style={{ color: GOLD }}>{icon}</div>
        <h2 className="font-semibold" style={{ color: WHITE }}>{title}</h2>
      </div>
      <ChevronRight size={18} className="chev" color={GOLD} />
    </summary>
    <div className="mt-3 text-sm leading-relaxed">{children}</div>
  </details>
);

export default function InfoPage() {
  return (
    <div className="min-h-[100dvh] relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#32174d] via-[#2c2837] to-[#292c2f]" />
      <div className="p-5 space-y-5">
        <header className="pop-in">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: WHITE }}>Info</h1>
          <p className="text-sm mt-0.5" style={{ color: `${WHITE}99` }}>
            Kurz erklärt: Nutzung, Berechnungsgrundlagen & praktische Tipps
          </p>
        </header>

        <Section icon={<BookOpen size={18} />} title="So nutzt du KERNnutrition – Kurzfassung" defaultOpen delay={.06}>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Gib unter <b>Rechner</b> Profil & Ziel ein → erhalte BMR, TDEE, Kalorien & Makros.</li>
            <li>Verteile die Woche im <b>Planer</b> (Training/Ruhetage), falls gewünscht.</li>
            <li>Trage dein Gewicht unter <b>Check-in</b> ein → erhalte Trend & konkrete Anpassungs-Empfehlung.</li>
            <li><b>Übernehmen</b> schreibt neue kcal/Makros in die App (Übersicht zeigt’s sofort).</li>
          </ol>
        </Section>

        <Section icon={<Calculator size={18} />} title="Berechnungsgrundlagen (vereinfacht)" delay={.12}>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>BMR</b>: Mifflin-St-Jeor (Gewicht, Größe, Alter, Geschlecht).</li>
            <li><b>TDEE</b> = BMR × Aktivitätsfaktor.</li>
            <li><b>Makros</b>: Protein/Fett aus Voreinstellungen (g/kg) oder aus Rechner; KH = Rest aus Kalorien.</li>
          </ul>
          <p className="text-xs opacity-70 mt-2">Hinweis: Werte sind praxisnahe Näherungen – individuelle Abweichungen möglich.</p>
        </Section>

        <Section icon={<ClipboardList size={18} />} title="Schnell-Checkliste" delay={.18}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Protein 1.8–2.5 g/kg, Fett ≥ 0.8 g/kg (≥ 20% kcal).</li>
            <li>Rest KH; Trainingstage ggf. höheres kcal-Ziel.</li>
            <li>Gewicht 2–3×/Woche gleich morgens (nach WC).</li>
            <li>Trend statt Tageswerte bewerten (Woche/Wochenmittel).</li>
          </ul>
        </Section>

        <Section icon={<LineChart size={18} />} title="Trend statt Tageswerte" delay={.24}>
          <p>Einzelne Messungen schwanken. Relevanter ist dein <b>Wochen-Trend</b> (z. B. +0.3%/Woche im Lean-Bulk-Ziel 0.25–0.5%).</p>
          <p className="mt-1">Die App vergleicht deinen Trend mit dem Zielbereich und schlägt dir gezielte kcal-Anpassungen vor.</p>
        </Section>

        <Section icon={<Scale size={18} />} title="Richtig wiegen (Praxis)" delay={.30}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Immer morgens, nüchtern, nach WC, vor dem Trinken.</li>
            <li>Mind. 2 Messungen/Woche, gleiches Setup (Waage/Ort).</li>
            <li>Plane natürliche Schwankungen (±1%) ein.</li>
          </ul>
        </Section>

        <Section icon={<Calculator size={18} />} title="Copy/Paste-Formeln (Excel-Stil)" delay={.36}>
          <div className="rounded-lg border soft-border p-3 bg-[#292c2f]">
            <pre className="text-xs overflow-auto">
{`BMR (Mifflin-St-Jeor):
=10*KG + 6.25*CM - 5*ALTER + (ISTWEIBLICH * -161 + ISTMAENNLICH * 5)

TDEE:
=BMR * AF

Kalorien aus Makros:
=PROTEIN_G*4 + KH_G*4 + FETT_G*9

KH als Rest:
=(KCAL_ZIEL - (PROTEIN_G*4 + FETT_G*9)) / 4`}
            </pre>
          </div>
        </Section>

        <footer className="text-xs opacity-70" style={{ color: WHITE }}>
          Hinweis: Inhalte sind praxisorientierte Zusammenfassungen, keine medizinische Beratung.
        </footer>
      </div>
    </div>
  );
}

