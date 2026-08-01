// src/services/index.js
import api from "./api";
import {
  cashflowService,
  analyzeFile,
  mapFile,
  importBulk,
  uploadLegacyPreview,
} from "./modules/cashflowService";
import { assetService } from "./modules/assetService";
import { passivoService } from "./modules/passivoService";
import { calculatorService } from "./modules/calculatorService";
import { coupleService } from "./modules/coupleService";
import { gamificationService } from "./modules/gamificationService";
import { adminService } from "./modules/adminService";
import { settingsService } from "./modules/settingsService";
import { emailAutomationService } from "./modules/emailAutomationService";
import { notificationService } from "./modules/notificationService";
import { reportService } from "./modules/reportService";

export const investmentsService = {
  api,
  ...cashflowService,
  ...assetService,
  ...passivoService,
  ...calculatorService,
  ...coupleService,
  ...gamificationService,
  ...adminService,
  ...settingsService,
  ...emailAutomationService,
  ...notificationService,
  ...reportService,
};

export {
  api,
  analyzeFile,
  mapFile,
  importBulk,
  uploadLegacyPreview,
  cashflowService,
  assetService,
  passivoService,
  calculatorService,
  coupleService,
  gamificationService,
  adminService,
  settingsService,
  emailAutomationService,
  notificationService,
  reportService,
};

export default api;
