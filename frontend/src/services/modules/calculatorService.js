import api from "../api";

export const calculatorService = {
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
};
