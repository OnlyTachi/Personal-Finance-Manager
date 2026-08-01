import api from "../api";

export const gamificationService = {
  getGamificationStatus: async () => {
    const response = await api.get("/gamification/status");
    return response.data;
  },

  getGamificationBattle: async () => {
    const response = await api.get("/gamification/battle");
    return response.data;
  },
};
