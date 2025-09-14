
import React from "react";

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
	return (
		<div>
			<ul>
				{slots.map(s => (
					<li key={s.id} className="py-2">
						<div className="kb-meal-grid kb-meal-row">
							{/* 1: Zeit */}
							<div className="font-mono kb-num text-sm text-neutral-600 dark:text-neutral-300">{m2t(s.t) || <span>&nbsp;</span>}</div>
							{/* 2: Titel + Badges */}
							<div className="min-w-0">
								<div className="truncate text-sm font-medium">{s.label || <span>&nbsp;</span>}</div>
								<div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
									{s.tags?.includes('pre')   && <span className="px-1 rounded bg-amber-100 dark:bg-amber-900/40">Pre</span>}
									{s.tags?.includes('post')  && <span className="px-1 rounded bg-blue-100  dark:bg-blue-900/40">Post</span>}
									{s.tags?.includes('sleep') && <span className="px-1 rounded bg-purple-100 dark:bg-purple-900/40">Schlaf</span>}
									{s.tags?.includes('wake')  && <span className="px-1 rounded bg-green-100  dark:bg-green-900/40">Aufstehen</span>}
								</div>
							</div>
							{/* 3: P */}
							<span className="kb-pill border-l-0"><span className="opacity-70">P</span><span className="kb-num">{typeof s.p === 'number' ? s.p : <span>&nbsp;</span>}</span></span>
							{/* 4: C */}
							<span className="kb-pill" style={{ borderLeft: '2px solid #666' }}><span className="opacity-70">C</span><span className="kb-num">{typeof s.c === 'number' ? s.c : <span>&nbsp;</span>}</span></span>
							{/* 5: F */}
							<span className="kb-pill" style={{ borderLeft: '2px solid #666' }}><span className="opacity-70">F</span><span className="kb-num">{typeof s.f === 'number' ? s.f : <span>&nbsp;</span>}</span></span>
							{/* 6: kcal */}
							<div className="kb-num text-xs text-right">{typeof s.kcal === 'number' ? `${s.kcal} kcal` : <span>&nbsp;</span>}</div>
							{/* 7: Aktionen */}
							<div className="flex justify-end gap-1 w-[var(--col-actions)] min-w-[var(--col-actions)]">
								<button className="kb-btn-xs w-16 min-w-16" onClick={()=>onNudge(s.id,-15)}>−15m</button>
								<button className="kb-btn-xs w-16 min-w-16" onClick={()=>onNudge(s.id, 15)}>+15m</button>
							</div>
						</div>
					</li>
				))}

				{/* Gym-Zeile (optional) */}
				{showGym && (
					<li className="py-4">
						<div className="w-full">
							<div className="flex flex-row items-center gap-4">
								<div className="font-mono kb-num text-sm min-w-[3.75rem]">{gymStart}–{gymEnd}</div>
								<div className="flex-1">
									<div className="rounded-md bg-yellow-400/90 text-black px-3 py-2 w-full text-center">Gym</div>
								</div>
							</div>
						</div>
					</li>
				)}

				{/* Summen-Zeile */}
				<li className="py-2 border-t border-neutral-200 dark:border-neutral-800">
					<div className="kb-meal-grid kb-meal-row">
						<div className="font-mono kb-num text-sm invisible">00:00</div> {/* Zeit-Platzhalter */}
						<div className="font-medium">Summe</div>
						<span className="kb-pill border-l-0"><span className="opacity-70">P</span><span className="kb-num">{sum.p}</span></span>
						<span className="kb-pill" style={{ borderLeft: '2px solid #666' }}><span className="opacity-70">C</span><span className="kb-num">{sum.c}</span></span>
						<span className="kb-pill" style={{ borderLeft: '2px solid #666' }}><span className="opacity-70">F</span><span className="kb-num">{sum.f}</span></span>
						<div className="kb-num text-xs text-right">{sum.kcal} kcal</div>
						<div className="w-[var(--col-actions)] min-w-[var(--col-actions)]" /> {/* Actions-Platzhalter */}
					</div>
				</li>
			</ul>
		</div>
	);
}
