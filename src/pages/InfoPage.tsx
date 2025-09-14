import React from 'react';
import { CodeCopy } from '../components/CodeCopy';
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
            Alles Wichtige zur App – kurz, verständlich & vollständig
          </p>
        </header>

  <Section icon={<BookOpen size={18} />} title="So funktioniert KERNnutrition" defaultOpen delay={.06}>
          <ol className="list-decimal pl-5 space-y-1">
            <li><b>Rechner:</b> Profil, Ziel und Aktivität eingeben – du bekommst deinen Kalorien- und Makrobedarf. Es wird mit den Kalorien der Trainingstage gerechnet.</li>
            <li><b>Planer:</b> Verteile deine Mahlzeiten und passe Zeiten individuell an. Exportiere deinen Plan als Text oder JSON.</li>
            <li><b>Check-in:</b> Trage regelmäßig dein Gewicht ein, verfolge Trends und erhalte automatische Anpassungsvorschläge.</li>
            <li><b>Übersicht:</b> Sieh alle aktuellen Ziele, Trends und Empfehlungen auf einen Blick.</li>
          </ol>
        </Section>

        <Section icon={<Calculator size={18} />} title="Wie wird gerechnet?" delay={.12}>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>BMR:</b> Grundumsatz nach Mifflin-St-Jeor (Gewicht, Größe, Alter, Geschlecht).</li>
            <li><b>TDEE:</b> BMR × Aktivitätsfaktor (wie viel du dich bewegst).</li>
            <li><b>Makros:</b> Protein und Fett nach g/kg Körpergewicht, Rest sind Kohlenhydrate. Es wird mit den Kalorien der Trainingstage gerechnet.</li>
            <li><b>Planer:</b> Automatische, evidenzbasierte Verteilung der Makros auf Mahlzeiten und Tageszeiten – individuell nach deinem Tagesablauf.</li>
          </ul>
          <p className="text-xs opacity-70 mt-2">Alle Werte sind Näherungen und dienen der praktischen Orientierung.</p>
        </Section>

        <Section icon={<ClipboardList size={18} />} title="Schnell-Checkliste" delay={.18}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Protein: 1.8–2.5 g/kg, Fett: mindestens 0.8 g/kg (mind. 20% der Kalorien).</li>
            <li>Kohlenhydrate: Rest der Kalorien, an Trainingstagen meist mehr.</li>
            <li>Gewicht 2–3×/Woche morgens eintragen.</li>
            <li>Trends sind wichtiger als einzelne Tageswerte.</li>
            <li>Exportiere deinen Plan für eigene Dokumentation oder andere Tools.</li>
          </ul>
        </Section>

        <Section icon={<LineChart size={18} />} title="Trends & Empfehlungen" delay={.24}>
          <p>Die App analysiert deinen Gewichtsverlauf (Wochentrend) und gibt dir automatische, individuelle Empfehlungen zur Anpassung deiner Kalorien und Makros.</p>
          <p className="mt-1">So bleibst du immer im Zielbereich – egal ob Abnehmen, Halten oder Muskelaufbau.</p>
        </Section>

        <Section icon={<Scale size={18} />} title="Richtig wiegen – so geht’s" delay={.30}>
          <ul className="list-disc pl-5 space-y-1">
            <li>Immer morgens, nüchtern, nach dem WC.</li>
            <li>Mindestens 2 Messungen pro Woche, immer gleiches Setup (Waage/Ort).</li>
            <li>Schwankungen von ±1% sind völlig normal.</li>
          </ul>
        </Section>

        <Section icon={<Calculator size={18} />} title="Copy/Paste-Formeln (Excel)" delay={.36}>
          <CodeCopy code={`BMR (Mifflin-St-Jeor):\n=10*KG + 6.25*CM - 5*ALTER + (ISTWEIBLICH * -161 + ISTMAENNLICH * 5)\n\nTDEE:\n=BMR * AF\n\nKalorien aus Makros:\n=PROTEIN_G*4 + KH_G*4 + FETT_G*9\n\nKH als Rest:\n=(KCAL_ZIEL - (PROTEIN_G*4 + FETT_G*9)) / 4`} />
        </Section>

        <footer className="text-xs opacity-70" style={{ color: WHITE }}>
          Hinweis: Alle Inhalte sind praxisorientiert und ersetzen keine medizinische Beratung.
        </footer>
      </div>
    </div>
  );
}

