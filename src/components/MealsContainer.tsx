type Role = 'wake'|'pre'|'post'|'sleep'|'main'|'merged';

function primaryRole(tags?: Role[] | null): Role | null {
	if (!Array.isArray(tags) || tags.length === 0) return null;
	const order: Role[] = ['wake','pre','post','sleep','main','merged'];
	for (const r of order) if (tags.includes(r)) return r;
	return null;
}

function roleLabel(r: Role): string {
	switch (r) {
		case 'wake':   return 'Aufstehen';
		case 'pre':    return 'Pre';
		case 'post':   return 'Post';
		case 'sleep':  return 'Schlaf';
		case 'main':   return 'Haupt';
		case 'merged': return 'Zusammengelegt';
		default:       return '';
	}
}

import React from "react";
import { shiftBtn } from '../lib/planner/defaults';

type Slot = {
	id: string;
	t: number;
	label: string;
	tags: string[];
	p: number;
	c: number;
	f: number;
	kcal: number;
};

type MealsContainerProps = {
	slots: Slot[];
	sum: { p: number; c: number; f: number; kcal: number };
	m2t: (t: number) => string;
	onNudge: (id: string, min: number) => void;
	gymStart?: string;
	gymEnd?: string;
	showGym?: boolean;
};


export default function MealsContainer({ slots, sum, m2t, onNudge, gymStart, gymEnd, showGym }: MealsContainerProps) {
	// Grid-Definition wie gefordert
	const rowCls =
		"grid items-center gap-2 px-2 py-2 " +
		"grid-cols-[minmax(0,1fr)_auto_72px_72px_72px_88px] " +
		"sm:grid-cols-[minmax(0,1fr)_auto_80px_80px_80px_96px]";
	const pillBase =
		"inline-flex justify-center items-center rounded-full px-2 py-1 " +
		"text-xs font-mono tabular-nums bg-white/10 w-[72px] sm:w-[80px]";
	const pillProtein = `${pillBase} text-[color:var(--macro-protein)]`;
	const pillCarb    = `${pillBase} text-[color:var(--macro-carb)]`;
	const pillFat     = `${pillBase} text-[color:var(--macro-fat)]`;
							const kcalPill =
								"inline-flex justify-center items-center rounded-full px-2 py-1 " +
								"text-xs font-mono tabular-nums bg-white/10 w-[88px] sm:w-[96px] text-[#00BCD4]";
	const timeChip = "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono tabular-nums bg-white/10 mr-2";


		// Kombiniere Mahlzeiten und ggf. Gym-Block zu sortierter Liste
		let items: Array<{ type: 'meal'; t: number; meal: Slot } | { type: 'gym'; t: number; gymStart: string; gymEnd: string }> = slots.map(meal => ({ type: 'meal', t: meal.t, meal }));
		if (showGym && gymStart && gymEnd) {
			// Gym-Start als Minuten für Sortierung
			const [h, m] = gymStart.split(':').map(Number);
			const gymT = h * 60 + m;
			items.push({ type: 'gym', t: gymT, gymStart, gymEnd });
		}
		items.sort((a, b) => a.t - b.t);

		return (
			<div className="w-full max-w-[720px] mx-auto rounded-2xl bg-white/5 p-3 sm:p-4 overflow-visible">
				<div className="max-h-[70vh] overflow-y-auto pr-1">
					{/* Header */}
					<div className={`${rowCls} text-[11px] text-white/60`}>
						<div className="truncate">Mahlzeit</div>
						<div className="justify-self-end">Zeit-Shift</div>
						<div className="text-center">P</div>
						<div className="text-center">C</div>
						<div className="text-center">F</div>
						<div className="text-center">kcal</div>
					</div>
					{/* Zeilen: Mahlzeiten und Gym-Block sortiert */}
					{items.map((item, idx) => {
						if (item.type === 'gym') {
							return (
								<div key={`gym-${item.gymStart}-${item.gymEnd}`} className="col-span-full rounded-xl bg-yellow-400/90 text-black px-3 py-2 my-2 font-semibold text-center">
									{item.gymStart}–{item.gymEnd} Gym
								</div>
							);
						} else {
							const meal = item.meal;
							return (
								<div key={meal.id} className={rowCls}>
									{/* Spalte 1: Zeit-Chip vor Label */}
									<div className="min-w-0">
																<div className="flex items-center gap-2">
																	<span className={timeChip}>{m2t(meal.t)}</span>
																	<div className="flex gap-1">
																		<button className={shiftBtn} onClick={() => onNudge(meal.id, -15)}>−15m</button>
																		<button className={shiftBtn} onClick={() => onNudge(meal.id, +15)}>+15m</button>
																	</div>
																</div>
																<span className="truncate text-sm font-medium">{meal.label}</span>
										{/* optional: Sub-Label/Role (aus tags) */}
										{primaryRole(meal.tags as Role[]) && (
											<div className="text-xs text-white/60 mt-0.5">
												{roleLabel(primaryRole(meal.tags as Role[])!)}
											</div>
										)}
									</div>
									{/* Spalte 2: Controls */}
												<div />
									{/* Spalten 3–6: P/C/F/kcal */}
									<span className={pillProtein}>P {meal.p}</span>
									<span className={pillCarb}>C {meal.c}</span>
									<span className={pillFat}>F {meal.f}</span>
												<span className={kcalPill}>{meal.kcal} kcal</span>
									{/* kcal-Unterzeile: unter Spalte 1+2 */}
															<div className="col-start-1 col-span-2 text-xs mt-1 text-[#00BCD4]">
																{meal.kcal} kcal
															</div>
								</div>
							);
						}
					})}
					{/* Summenzeile */}
								<div className={`${rowCls} border-t-4 border-white/60 mt-2 pt-2`}>
						<div className="text-sm font-semibold">Summe</div>
						<div />
						<span className={pillProtein}>P {sum.p}</span>
						<span className={pillCarb}>C {sum.c}</span>
						<span className={pillFat}>F {sum.f}</span>
									<span className={kcalPill}>{sum.kcal} kcal</span>
												<div className="col-start-1 col-span-2 text-xs mt-1 text-[#00BCD4]">
													{sum.kcal} kcal
												</div>
					</div>
				</div>
			</div>
		);
	}
