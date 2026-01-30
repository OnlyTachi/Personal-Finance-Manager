import axios from "axios";

const api = axios.create({
  baseURL: "http://100.83.218.55:8000/api/v1",
});

// Interceptor para adicionar token se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("@InvestApp:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Funções de Serviço para o Componente de Importação
export const analyzeFile = async (formData) => {
  const response = await api.post("/cashflow/upload/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const mapFile = async (mappingData) => {
  const response = await api.post("/cashflow/upload/map", mappingData);
  return response.data;
};

export const importBulk = async (transactions) => {
  const response = await api.post("/cashflow/import/bulk", {
    transactions: transactions,
  });
  return response.data;
};

export const uploadLegacyPreview = async (formData) => {
  const response = await api.post("/cashflow/upload/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Objeto de Serviço Antigo (Mantendo compatibilidade)
export const investmentsService = {
  api: api,

  // --- Carteira Pessoal ---
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
  importBulkTransactions: async (data) => importBulk(data), // Alias

  // --- Calculadoras ---
  getIndices: async () => {
    const response = await api.get("/calculator/indices");
    return response.data;
  },

  simulateFixedIncome: async (params) => {
    const response = await api.post("/calculator/simulate", null, { params });
    return response.data;
  },

  simulateSimpleInterest: async (data) => {
    const response = await api.post("/calculator/simple_interest", data);
    return response.data;
  },

  simulateFirstMillion: async (data) => {
    const response = await api.post("/calculator/first_million", data);
    return response.data;
  },

  simulateEmergencyFund: async (data) => {
    const response = await api.post("/calculator/emergency_fund", data);
    return response.data;
  },

  compareScenarios: async (data) => {
    const response = await api.post("/calculator/compare", data);
    return response.data;
  },

  simulateCDI: async (data) => {
    const response = await api.post("/calculator/cdi", data);
    return response.data;
  },

  projectAsset: async (data) => {
    const response = await api.post("/calculator/project_asset", data);
    return response.data;
  },

  simulateQuickRF: async (data) => {
    const response = await api.post("/calculator/quick_rf", data);
    return response.data;
  },

  // --- Ativos ---
  getAssets: async () => {
    const response = await api.get("/investments/assets");
    return response.data;
  },
  getAssetById: async (id) => {
    const response = await api.get(`/investments/assets/${id}`);
    return response.data;
  },
  createAsset: async (assetData) => {
    const response = await api.post("/investments/assets", assetData);
    return response.data;
  },
  updateAsset: async (id, data) => {
    const response = await api.put(`/investments/assets/${id}`, data);
    return response.data;
  },
  deleteAsset: async (id) => {
    const response = await api.delete(`/investments/assets/${id}`);
    return response.data;
  },
  refreshPrices: async () => {
    const response = await api.post("/investments/assets/refresh");
    return response.data;
  },

  // --- Históricos ---
  getHistory: async () => {
    const response = await api.get("/history/");
    return response.data;
  },

  // --- Transações ---
  createTransaction: async (transactionData) => {
    const response = await api.post(
      "/investments/transactions",
      transactionData
    );
    return response.data;
  },
  updateTransaction: async (id, data) => {
    const response = await api.put(`/investments/transactions/${id}`, data);
    return response.data;
  },
  deleteTransaction: async (id) => {
    const response = await api.delete(`/investments/transactions/${id}`);
    return response.data;
  },

  // --- Passivos (Dívidas) ---
  getPassivos: async () => {
    const response = await api.get("/investments/passivos");
    return response.data;
  },
  getPassivoById: async (id) => {
    const response = await api.get(`/investments/passivos/${id}`);
    return response.data;
  },
  createPassivo: async (data) => {
    const response = await api.post("/investments/passivos", data);
    return response.data;
  },
  deletePassivo: async (id) => {
    const response = await api.delete(`/investments/passivos/${id}`);
    return response.data;
  },
  toggleParcela: async (passivoId, parcelaId) => {
    const response = await api.post(
      `/investments/passivos/${passivoId}/parcelas/${parcelaId}/toggle`
    );
    return response.data;
  },

  // --- Casal / Compartilhado ---
  linkPartner: async (partnerUsername) => {
    const response = await api.post("/auth/partner/link", {
      partner_username: partnerUsername,
    });
    return response.data;
  },

  unlinkPartner: async () => {
    const response = await api.post("/auth/partner/unlink");
    return response.data;
  },

  getCoupleSummary: async () => {
    const response = await api.get("/investments/couple/summary");
    return response.data;
  },

  getCoupleHistory: async () => {
    const response = await api.get("/investments/couple/history");
    return response.data;
  },

  // --- Goals (Metas) ---
  getGoals: async () => {
    const response = await api.get("/investments/couple/goals");
    return response.data;
  },
  createGoal: async (data) => {
    const response = await api.post("/investments/goals", data);
    return response.data;
  },
  updateGoal: async (id, data) => {
    const response = await api.put(`/investments/goals/${id}`, data);
    return response.data;
  },
  deleteGoal: async (id) => {
    const response = await api.delete(`/investments/goals/${id}`);
    return response.data;
  },

  // --- Gamification ---
  getGamificationStatus: async () => {
    const response = await api.get("/gamification/status");
    return response.data;
  },
  getGamificationBattle: async () => {
    const response = await api.get("/gamification/battle");
    return response.data;
  },

  // --- ADMIN ---
  adminListUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },
  adminCreateUser: async (data) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },
  adminUpdateUser: async (username, data) => {
    const response = await api.put(`/admin/users/${username}`, data);
    return response.data;
  },
  adminDeleteUser: async (username) => {
    const response = await api.delete(`/admin/users/${username}`);
    return response.data;
  },
  adminGetUserStats: async (username) => {
    const response = await api.get(`/admin/users/${username}/stats`);
    return response.data;
  },

  // --- SETTINGS  ---
  generateTelegramCode: async () => {
    const response = await api.post("/auth/telegram/generate-code");
    return response.data;
  },
  getTelegramDevices: async () => {
    const response = await api.get("/auth/telegram/devices");
    return response.data;
  },
  unlinkTelegramDevice: async (deviceId) => {
    const response = await api.delete(`/auth/telegram/devices/${deviceId}`);
    return response.data;
  },
  changePassword: async (password) => {
    const response = await api.post("/auth/change-password", { password });
    return response.data;
  },
};

export default api;
