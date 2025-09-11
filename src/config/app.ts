// src/config/app.ts

export const APP = {
  NAME: 'KERNnutrition',
  SHORT_NAME: 'KERNnutrition',
  ID: 'kernnutrition',                 // neuer technischer Prefix
  OLD_IDS: ['kernnutrition','kernnutrition','kernnutrition'], // auch frühere Varianten
  VERSION: '2025.09.11',
} as const;

export const key = (suffix: string) => `${APP.ID}-${suffix}`;
