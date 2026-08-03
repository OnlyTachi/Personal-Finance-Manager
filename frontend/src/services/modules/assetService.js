import api from "../api";

export const assetService = {
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

  getHistory: async () => {
    const response = await api.get("/history/");
    return response.data;
  },

  createTransaction: async (transactionData) => {
    const response = await api.post(
      "/investments/transactions",
      transactionData,
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
};
