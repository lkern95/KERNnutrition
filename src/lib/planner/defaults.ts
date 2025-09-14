// Kompakter Button-Style für schlanke Buttons
export const shiftBtn =
  "px-1.5 py-0.5 text-[10px] font-mono rounded-md " +
  "bg-gray-700/60 hover:bg-gray-600 text-gray-200";
export const LS_KEY = 'planner.inputs.v1';

export const DEFAULT_PLANNER_INPUTS = {
  wake: '05:25',
  sleep: '21:30', // wichtig für den Test
  gymStart: '06:10',
  gymEnd: '07:10',
  isTrainingDay: true,
  mealsTarget: 6,
  minGapMin: 120,
  targetGapMin: 180,
  preset: 'standard' as 'standard',
  anchor: {
    breakfastAfterWakeMin: 30,
    breakfastAfterWakeMax: 60,
    preType: 'auto' as 'auto',
    preSnackMin: 30,
    preSnackMax: 60,
    preMealMin: 120,
    preMealMax: 180,
    postSnackMin: 0,
    postSnackMax: 60,
    postMealMin: 60,
    postMealMax: 120,
    preSleepMin: 60,
    preSleepMax: 90,
  },
};
