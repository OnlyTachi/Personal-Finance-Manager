import api from "../api";

export const notificationService = {
  getNotifications: async () => {
    const response = await api.get("/notifications/");
    return response.data;
  },
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
};
