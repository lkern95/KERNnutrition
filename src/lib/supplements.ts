// Supplement logic and dose calculation
// Kreatin: 5 g/Tag
// Omega-3 (EPA/DHA): 0.03 g/kg, min 2 g, max 3 g
// Vitamin D3: 2000 IE (Hinweis: Blutwert prüfen)
// Magnesium: 300–400 mg, abends
// Zink: 10–25 mg, morgens, nicht mit Mg
// Whey/Casein: optionaler Hinweis bei hohem Proteinbedarf

export type Supplement = {
  id: string;
  name: string;
  dose: (user: { weightKg: number; highProtein?: boolean }) => string;
  info: string;
};

export const supplements: Supplement[] = [
  {
    id: 'creatine',
    name: 'Kreatin',
    dose: () => '5 g/Tag',
    info: 'Kreatin unterstützt die Schnellkraftleistung und Regeneration. Empfohlene Dosis: 5 g täglich.',
  },
  {
    id: 'omega3',
    name: 'Omega-3 (EPA/DHA)',
    dose: ({ weightKg }) => {
      const dose = Math.max(2, Math.min(3, 0.03 * weightKg));
      return `${dose.toFixed(2)} g/Tag`;
    },
    info: 'Omega-3-Fettsäuren sind wichtig für Herz, Gehirn und Entzündungshemmung. Empfohlene Dosis: 0,03 g/kg Körpergewicht, mindestens 2 g, maximal 3 g pro Tag.',
  },
  {
    id: 'vitaminD3',
    name: 'Vitamin D3',
    dose: () => '2000 IE/Tag',
    info: 'Vitamin D3 ist wichtig für das Immunsystem und die Knochengesundheit. Blutwert regelmäßig prüfen!',
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    dose: () => '300–400 mg, abends',
    info: 'Magnesium unterstützt Muskelfunktion und Schlaf. Einnahme abends empfohlen.',
  },
  {
    id: 'zinc',
    name: 'Zink',
    dose: () => '10–25 mg, morgens',
    info: 'Zink ist wichtig für das Immunsystem. Morgens einnehmen, nicht zusammen mit Magnesium.',
  },
  {
    id: 'whey',
    name: 'Whey/Casein',
    dose: ({ highProtein }) => highProtein ? 'Optional: Ergänzung bei hohem Proteinbedarf' : 'Optional',
    info: 'Whey- oder Casein-Protein kann bei erhöhtem Proteinbedarf sinnvoll sein.',
  },
];
