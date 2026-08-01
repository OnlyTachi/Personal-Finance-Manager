import api from "../api";

export const analyzeFile = async (formData) => {
  const response = await api.post("/pipeline/upload/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const mapFile = async (mappingData) => {
  const response = await api.post("/pipeline/upload/map", mappingData);
  return response.data;
};

export const importBulk = async (transactions) => {
  const response = await api.post("/pipeline/import/bulk", {
    transactions: transactions,
  });
  return response.data;
};

export const uploadLegacyPreview = async (formData) => {
  const response = await api.post("/pipeline/upload/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const cashflowService = {
  getCashflow: async (month, year) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get("/cashflow/", { params });
    return response.data;
  },

  getCashflowSummary: async (month, year) => {
    const response = await api.get("/cashflow/summary", {
      params: { month, year },
    });
    return response.data;
  },

  createMovimentacao: async (data) => {
    const response = await api.post("/cashflow/", data);
    return response.data;
  },

  deleteMovimentacao: async (id) => {
    const response = await api.delete(`/cashflow/${id}`);
    return response.data;
  },

  uploadFilePreview: uploadLegacyPreview,
  importBulkTransactions: importBulk,
};
