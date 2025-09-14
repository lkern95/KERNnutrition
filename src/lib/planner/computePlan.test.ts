import { describe, it, expect } from 'vitest';
import { computePlan, PlanInputs } from './computePlan';

const base: PlanInputs = {
  wake: '06:30',
  sleep: '23:00',
  gymStart: '17:30',
  gymEnd: '19:00',
  isTrainingDay: true,
  mealsTarget: 5,
  minGapMin: 120,
  targetGapMin: 180,
  kcal: 2800,
  protein: 180,
  carbs: 340,
  fat: 80,
  bodyWeightKg: 75,
};

function isMultipleOf5(n: number) { return n % 5 === 0; }

describe('computePlan', () => {
  it('Protein-Leitplanke: ≥ 20 g pro Hauptmahlzeit, KH/Fett werden zuerst verschoben, Protein zuletzt', () => {
    const proteinCase: PlanInputs = {
      ...base,
      protein: 120,
      mealsTarget: 4,
      minGapMin: 120,
    };
    const plan = computePlan(proteinCase);
    // Hauptmahlzeiten: alle außer Snacks/Pre/Post/Sleep
    const mainSlots = plan.slots.filter((s: any) => s.tags.includes('main'));
    // Jede Hauptmahlzeit hat mindestens 20g Protein
    for (const s of mainSlots) {
      expect(s.p).toBeGreaterThanOrEqual(20);
    }
    // Bei Konflikt: KH/Fett werden zuerst reduziert, Protein zuletzt
    // (Test: Wenn ein Slot <20g Protein, dann müssen KH/Fett schon minimal sein)
    for (const s of mainSlots) {
      if (s.p < 20) {
        expect(s.c).toBeLessThanOrEqual(5);
        expect(s.f).toBeLessThanOrEqual(5);
      }
    }
  });
  it('DST-Tag: Wechsel +1 h; Slots bleiben innerhalb realer Uhrzeiten, keine Überlappungen', () => {
    // DST-Tag: 31.03.2024 (Beispiel), Wake/Sleep über Zeitumstellung
    const dstCase: PlanInputs = {
      ...base,
      wake: '01:30', // vor Umstellung
      sleep: '10:00', // nach Umstellung
      mealsTarget: 4,
      minGapMin: 120,
      // Annahme: computePlan berücksichtigt DST automatisch
    };
    const plan = computePlan(dstCase);
    // Alle Slots liegen zwischen Wake und Sleep
    const minT = Math.min(...plan.slots.map((s: any) => s.t));
    const maxT = Math.max(...plan.slots.map((s: any) => s.t));
    expect(minT).toBeGreaterThanOrEqual(90); // 01:30 = 90min
    expect(maxT).toBeLessThanOrEqual(600);  // 10:00 = 600min
    // Keine Überlappungen
    for (let i = 1; i < plan.slots.length; i++) {
      expect(plan.slots[i].t).toBeGreaterThan(plan.slots[i-1].t);
    }
  });
  it('Kleine Tageskcal (z. B. 1300): Keine 0-Makro-Slots, Min-Granularität greift', () => {
    const lowKcal: PlanInputs = {
      ...base,
      kcal: 1300,
      protein: 90,
      carbs: 120,
      fat: 35,
      mealsTarget: 5,
    };
    const plan = computePlan(lowKcal);
    // Keine Slots mit 0 Makros
    const zeroMacro = plan.slots.filter((s: any) => s.p === 0 && s.c === 0 && s.f === 0);
    expect(zeroMacro.length).toBe(0);
    // Min-Granularität: keine Makro unter 5g (außer explizit 0)
    for (const s of plan.slots as any[]) {
      if (s.p > 0) expect(s.p).toBeGreaterThanOrEqual(5);
      if (s.c > 0) expect(s.c).toBeGreaterThanOrEqual(5);
      if (s.f > 0) expect(s.f).toBeGreaterThanOrEqual(5);
    }
  });
  it('Frühes Gym + spätes Frühstücksfenster: Frühstück auf 45min geklippt, Pre-Snack minimalinvasiv', () => {
    // Wake 7:00, Gym 7:30–8:30, Frühstücksfenster 45–90min nach Wake
    const gymFrueh: PlanInputs = {
      ...base,
      wake: '07:00',
      gymStart: '07:30',
      gymEnd: '08:30',
      mealsTarget: 5,
      minGapMin: 90,
      targetGapMin: 120,
      // Frühstücksfenster: 45–90min nach Wake (angenommen, dass dies intern abgebildet wird)
    };
    const plan = computePlan(gymFrueh);
    // Frühstück = erster Slot nach Wake
    const wakeSlot = plan.slots.find((s: any) => s.tags.includes('wake'));
    const breakfast = plan.slots.find((s: any) => s.label.toLowerCase().includes('früh') || s.tags.includes('breakfast'));
    if (wakeSlot && breakfast) {
      const gap = breakfast.t - wakeSlot.t;
      expect(gap).toBeGreaterThanOrEqual(45-1); // min 45min, kleine Toleranz
      expect(gap).toBeLessThanOrEqual(45+1);   // exakt geklippt auf 45min
    }
    // Pre-Snack minimalinvasiv: Pre-WO-Slot existiert, aber möglichst klein
    const pre = plan.slots.find((s: any) => s.tags.includes('pre'));
    if (pre) {
      expect(pre.kcal).toBeLessThanOrEqual(150); // Annahme: minimalinvasiv = max 150 kcal
    }
  });
  it('Abend-Fettlimit: 10% Deckel, Preset "gleichmäßig" → Fett umverteilt, kcal/Makro-Summen exakt, Change-Log enthält Deckelung', () => {
    // Fettlimit abends: 10% der Tagesfettmenge
    const abendFett: PlanInputs = {
      ...base,
      fat: 80,
      mealsTarget: 5,
      wake: '06:30',
      sleep: '22:30',
      preset: 'even', // gleichmäßige Verteilung
  // abendFettProzent: 10, // angenommenes Feld für Deckel (Feature muss ggf. im Planner-UI/Backend gesetzt werden)
    };
    const plan = computePlan(abendFett);
  const abend = plan.slots[plan.slots.length-1] as any;
    // Fett im letzten Slot maximal 10% der Tagesfettmenge
    expect(abend.f).toBeLessThanOrEqual(Math.floor(abendFett.fat * 0.10) + 1); // kleine Toleranz
    // Fett wurde umverteilt (mind. 1 anderer Slot hat mehr Fett als abend)
  expect(plan.slots.some((s:any,i:number)=>i!==plan.slots.length-1 && s.f > abend.f)).toBe(true);
    // kcal- und Makrosummen exakt
  const sum = plan.slots.reduce((a:any,s:any)=>({p:a.p+s.p,c:a.c+s.c,f:a.f+s.f,kcal:a.kcal+s.kcal}),{p:0,c:0,f:0,kcal:0});
    expect(sum.p).toBeCloseTo(abendFett.protein,0);
    expect(sum.c).toBeCloseTo(abendFett.carbs,0);
    expect(sum.f).toBeCloseTo(abendFett.fat,0);
    expect(sum.kcal).toBeCloseTo(abendFett.protein*4+abendFett.carbs*4+abendFett.fat*9,0);
    // Change-Log enthält Deckelung
  const log = plan.changeLog || [];
  expect(log.some((e:any)=>/fett.*deckel|abend.*fett/i.test(e.reason||e.rule||''))).toBe(true);
  });
  it('legt Pre/Post/Schlaf/Aufstehen-Slots an und hält Abstände ≥ minGap', () => {
    const { slots } = computePlan(base);
  const labels = slots.map((s: any) => s.label).join(' | ');
    expect(labels).toMatch(/Aufstehen/);
  expect(slots.some((s: any) => s.tags.includes('pre'))).toBe(true);
  expect(slots.some((s: any) => s.tags.includes('post'))).toBe(true);
  expect(slots.some((s: any) => s.tags.includes('sleep'))).toBe(true);

    for (let i=0;i<slots.length-1;i++) {
      const gap = slots[i+1].t - slots[i].t;
      expect(gap).toBeGreaterThanOrEqual(base.minGapMin - 1); // kleine Toleranz nach Feinjustage
    }
  });

  it('periodisiert Carbs (Pre ≥25%, Post ≥35%) und deckelt Fett in Pre/Post (≤12g)', () => {
    const { slots } = computePlan(base);
    const cTotal = base.carbs;
  const pre = slots.find((s: any) => s.tags.includes('pre'))!;
  const post = slots.find((s: any) => s.tags.includes('post'))!;
    expect(pre.c).toBeGreaterThanOrEqual(Math.floor(cTotal * 0.25)); // ≥ 25%
    expect(post.c).toBeGreaterThanOrEqual(Math.floor(cTotal * 0.35)); // ≥ 35%
    expect(pre.f).toBeLessThanOrEqual(12);
    expect(post.f).toBeLessThanOrEqual(12);
  });

  it('rundet Makros auf 5g-Schritte', () => {
    const { slots } = computePlan(base);
    for (const s of slots as any[]) {
      expect(isMultipleOf5(s.p)).toBe(true);
      expect(isMultipleOf5(s.c)).toBe(true);
      expect(isMultipleOf5(s.f)).toBe(true);
    }
  });

  it('mergt Pre-WO mit Aufstehen bei <60min Abstand', () => {
    // Aufstehen 06:00 → Wake-Anker = 06:45
    // GymStart 09:00 → Pre-WO = 07:00 → Abstand 15 min → Merge
    const mergedCase: PlanInputs = {
      ...base,
      wake: '06:00',
      gymStart: '09:00',
      gymEnd: '10:30',      // konsistent, aber für den Merge egal
      isTrainingDay: true,
    };

    const { slots } = computePlan(mergedCase);

    // Ein Slot, der sowohl 'wake' als auch 'pre' trägt (zusammengelegt)
  const merged = slots.find((s: any) => s.tags.includes('wake') && s.tags.includes('pre'));
    expect(merged).toBeTruthy();

    // Sicherstellen: es gibt nur noch EINEN 'pre'-Slot (der gemergete)
  expect(slots.filter((s: any) => s.tags.includes('pre')).length).toBe(1);
  });
  it('FAIL: Max-Packen – 7 Meals, 14h Wachzeit, Mindestabstand 2h', () => {
    // 7 meals, 14h awake, min 2h gap (7*2=14h, also kein Puffer)
    const maxPacken: PlanInputs = {
      ...base,
      wake: '07:00',
      sleep: '21:00',
      mealsTarget: 7,
      minGapMin: 120,
      targetGapMin: 120,
    };
    const plan = computePlan(maxPacken);
    // Erwartung: Plan ist INVALID, gibt Issue/Fix zurück
    // (z.B. "Abstände nicht einhaltbar, minGap zu groß für Zeitfenster")
    // Annahme: validate(plan) gibt issues[] zurück, plan.issues oder plan.warnings
    const issues = plan.issues || plan.warnings || [];
    expect(issues.length).toBeGreaterThan(0);
    const gapIssue = issues.find((i:any) => /abstand|gap|minGap|zeitfenster/i.test(i.message || i.msg || ''));
    expect(gapIssue).toBeTruthy();
    // Optional: Fix-Vorschlag vorhanden
    expect(gapIssue.fix || gapIssue.suggestion).toBeTruthy();
  });
});
