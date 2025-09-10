#!/bin/bash
# Lokales CI-Skript für KERNbalance/KERNnutrition
npm i
npm run lint
npm run type-check
npm test
npm run build
