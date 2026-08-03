import api from "../api";

export const settingsService = {
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
  generateDiscordCode: async () => {
    const response = await api.post("/auth/discord/generate-code");
    return response.data;
  },
  getDiscordDevices: async () => {
    const response = await api.get("/auth/discord/devices");
    return response.data;
  },
  unlinkDiscordDevice: async (deviceId) => {
    const response = await api.delete(`/auth/discord/devices/${deviceId}`);
    return response.data;
  },
  testDiscordWebhook: async (webhookUrl) => {
    const response = await api.post("/reports/preferences/test-webhook", {
      discord_webhook_url: webhookUrl,
    });
    return response.data;
  },
  changePassword: async (password) => {
    const response = await api.post("/auth/change-password", { password });
    return response.data;
  },
};
