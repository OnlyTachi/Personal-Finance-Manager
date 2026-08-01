import api from "../api";

export const passivoService = {
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
      `/investments/passivos/${passivoId}/parcelas/${parcelaId}/toggle`,
    );
    return response.data;
  },
};
