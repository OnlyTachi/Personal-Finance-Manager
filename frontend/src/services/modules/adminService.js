import api from "../api";

export const adminService = {
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
};
