// src/services/modules/coupleService.js
import api from "../api";

export const coupleService = {
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
    const response = await api.get("/couple/summary");
    return response.data;
  },
  getCoupleHistory: async () => {
    const response = await api.get("/couple/history");
    return response.data;
  },
  getGoals: async () => {
    const response = await api.get("/couple/goals");
    return response.data;
  },
  createGoal: async (data) => {
    const response = await api.post("/couple/goals", data);
    return response.data;
  },
  updateGoal: async (id, data) => {
    const response = await api.put(`/couple/goals/${id}`, data);
    return response.data;
  },
  deleteGoal: async (id) => {
    const response = await api.delete(`/couple/goals/${id}`);
    return response.data;
  },
};
