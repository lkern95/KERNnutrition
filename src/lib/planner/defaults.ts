export const LS_KEY = 'planner.inputs.v1';

export const DEFAULT_PLANNER_INPUTS = {
  wake: '07:00',
  sleep: '23:00', // wichtig für den Test
  gymStart: '18:00',
  gymEnd: '19:00',
  isTrainingDay: true,
  mealsTarget: 5,
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
