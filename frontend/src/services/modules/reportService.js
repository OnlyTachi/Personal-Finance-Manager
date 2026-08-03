import api from "../api";

export const reportService = {
  // --- Preferências e Agendamentos ---
  getReportPreferences: async () => {
    const response = await api.get("/reports/preferences");
    return response.data;
  },
  updateReportPreferences: async (data) => {
    const response = await api.put("/reports/preferences", data);
    return response.data;
  },

  // --- Relatório Diário (Daily Check-up) ---
  previewDailyCheckup: async () => {
    const response = await api.get("/reports/daily-checkup/preview");
    return response.data;
  },
  sendDailyCheckupNow: async () => {
    const response = await api.post("/reports/daily-checkup/send-now");
    return response.data;
  },
  sendDailyCheckupDirect: async (data) => {
    const response = await api.post("/reports/daily-checkup/send", data);
    return response.data;
  },

  // --- Relatório Semanal ---
  previewWeeklyReport: async () => {
    const response = await api.get("/reports/weekly-report/preview");
    return response.data;
  },
  sendWeeklyReportNow: async () => {
    const response = await api.post("/reports/weekly-report/send-now");
    return response.data;
  },

  // --- Relatório Mensal ---
  previewMonthlyReport: async (month, year) => {
    const response = await api.get("/reports/monthly-report/preview", {
      params: { month, year },
    });
    return response.data;
  },
  sendMonthlyReportNow: async (month, year) => {
    const response = await api.post("/reports/monthly-report/send-now", null, {
      params: { month, year },
    });
    return response.data;
  },

  // --- Relatório Anual / IRPF ---
  previewAnnualReport: async (year) => {
    const response = await api.get("/reports/annual-report/preview", {
      params: { year },
    });
    return response.data;
  },
  sendAnnualReportNow: async (year) => {
    const response = await api.post("/reports/annual-report/send-now", null, {
      params: { year },
    });
    return response.data;
  },

  // --- Relatório Personalizado ---
  previewCustomReport: async (filters) => {
    const response = await api.post("/reports/custom-report/preview", filters);
    return response.data;
  },
  sendCustomReportNow: async (filters) => {
    const response = await api.post("/reports/custom-report/send-now", filters);
    return response.data;
  },

  // --- Endpoints de Exportação de Arquivos (Blob Downloads) ---
  exportMonthlyPdf: async (month, year) => {
    const response = await api.get("/reports/monthly-report/pdf", {
      params: { month, year },
      responseType: "blob",
    });
    return response.data;
  },
  exportAnnualPdf: async (year) => {
    const response = await api.get("/reports/annual-report/pdf", {
      params: { year },
      responseType: "blob",
    });
    return response.data;
  },
  exportCustomPdf: async (filters) => {
    const response = await api.post("/reports/custom-report/pdf", filters, {
      responseType: "blob",
    });
    return response.data;
  },
  exportAnnualExcel: async (year) => {
    const response = await api.get("/reports/annual-report/excel", {
      params: { year },
      responseType: "blob",
    });
    return response.data;
  },
  exportCustomExcel: async (filters) => {
    const response = await api.post("/reports/custom-report/excel", filters, {
      responseType: "blob",
    });
    return response.data;
  },
};
