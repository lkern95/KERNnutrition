import React from 'react'
import { Info, Scale, TrendingUp, Target, Calculator, Mail, Github } from 'lucide-react'
import { Card, InfoBanner } from '../components'
import { EXTERNAL_LINKS, LINK_TEXTS } from '../lib/constants'

export function InfoPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6 text-icon" />
        </div>
        <h1 className="text-title mb-2">So nutzt du KERNbalance</h1>
        <p className="text-text/70">
          Schnelle Anleitung für optimale Ergebnisse
        </p>
      </div>

      <div className="space-y-6">
        {/* Wiegen */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-icon" />
            </div>
            <h2>Wie wiegen</h2>
          </div>
          <div className="space-y-2 text-text/80">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>1×/Woche</strong>, immer am gleichen Tag</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Morgens</strong> nach Toilette, nackt</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Direkt nach dem Aufstehen</strong></p>
            </div>
          </div>
        </Card>

        {/* Trend statt Tageswerte */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-icon" />
            </div>
            <h2>Trend statt Tageswerte</h2>
          </div>
          <div className="space-y-2 text-text/80">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>2-Wochen-Trend</strong> oder 3-Wochen-Gleitmittel beachten</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p>Einzelne Messungen können schwanken</p>
            </div>
          </div>
        </Card>

        {/* Schnell-Checkliste */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-icon" />
            </div>
            <h2>Schnell-Checkliste</h2>
          </div>
          
          <div className="space-y-3 text-text/80">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>BMR mit Mifflin berechnen</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
              <p><strong>Aktivitätsfaktor realistisch</strong> (nach 2 Wochen prüfen)</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-label mb-3">Ziel setzen:</h3>
            <div className="grid gap-2 text-sm text-text/80">
              <div className="flex justify-between">
                <span>• Erhaltung</span>
                <span className="font-mono">±0 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>• Lean Bulk</span>
                <span className="font-mono">+200–350 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>• Konservativ</span>
                <span className="font-mono">+150–250 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>• Diät</span>
                <span className="font-mono">−300–500 kcal</span>
              </div>
              <div className="flex justify-between">
                <span>• Aggressiv</span>
                <span className="font-mono">−600 kcal (mit Kontrolle)</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-label mb-3">Makros:</h3>
            <div className="space-y-2 text-sm text-text/80">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Protein:</strong> 1.8–2.2 g/kg Körpergewicht</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Fett:</strong> 0.8–1.2 g/kg Körpergewicht</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                <p><strong>Carbs:</strong> Rest der Kalorien</p>
              </div>
            </div>
          </div>

          <InfoBanner type="info" className="mt-4">
            <p className="text-sm">
              <strong>💡 Tipp:</strong> 2 Wochen tracken → ggf. ±100–200 kcal anpassen
            </p>
          </InfoBanner>
        </Card>

        {/* Formeln */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-icon" />
            </div>
            <h2>Copy/Paste-Formeln (Excel-Stil)</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Grundumsatz (BMR)</div>
              <div className="font-mono text-sm text-white">
                =IF(A4="M",10*A1+6.25*A2-5*A3+5,10*A1+6.25*A2-5*A3-161)
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Gesamtumsatz (TDEE)</div>
              <div className="font-mono text-sm text-white">
                =BMR * A5
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Zielkalorien</div>
              <div className="font-mono text-sm text-white">
                =TDEE + A6
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Protein</div>
              <div className="font-mono text-sm text-white">
                Protein_g: =A1 * A7<br/>
                Protein_kcal: =Protein_g * 4
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Fett</div>
              <div className="font-mono text-sm text-white">
                Fett_g: =A1 * A8<br/>
                Fett_kcal: =Fett_g * 9
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Kohlenhydrate</div>
              <div className="font-mono text-sm text-white">
                Carbs_g: =(Zielkalorien - Protein_kcal - Fett_kcal) / 4
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
              <div className="text-green-400 text-xs mb-2">// Training/Rest-Tage</div>
              <div className="font-mono text-sm text-white">
                kcal_rest = (7*daily_target - n*kcal_train) / (7 - n)
              </div>
            </div>
          </div>

          <InfoBanner type="info" className="mt-4">
            <p className="text-sm">
              <strong>📝 Legende:</strong> A1=Gewicht, A2=Größe, A3=Alter, A4=Geschlecht, A5=Aktivitätsfaktor, 
              A6=Kalorienziel, A7=Protein-Faktor, A8=Fett-Faktor
            </p>
          </InfoBanner>
        </Card>

        {/* Footer */}
        <Card>
          <h2 className="text-label mb-4">Kontakt & Support</h2>
          
          <div className="space-y-2">
            <a 
              href={EXTERNAL_LINKS.SUPPORT_EMAIL}
              className="flex items-center gap-3 text-text/80 hover:text-accent transition-colors"
            >
              <div className="w-6 h-6 bg-accent/20 rounded flex items-center justify-center">
                <Mail className="w-3 h-3 text-accent" />
              </div>
              {LINK_TEXTS.SUPPORT_CONTACT}
            </a>
            
            <a 
              href={EXTERNAL_LINKS.GITHUB_REPO}
              className="flex items-center gap-3 text-text/80 hover:text-accent transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="w-6 h-6 bg-accent/20 rounded flex items-center justify-center">
                <Github className="w-3 h-3 text-accent" />
              </div>
              {LINK_TEXTS.GITHUB_REPO}
            </a>
          </div>
        </Card>

        <div className="text-center text-text/60 text-sm">
          <p>© 2025 KERNbalance</p>
        </div>
      </div>
    </div>
  )
}
