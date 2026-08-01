import api from "../api";

export const emailAutomationService = {
  triggerEmailScan: async () => {
    const response = await api.post("/email-automation/scan");
    return response.data;
  },

  getPendingReconciliations: async () => {
    const response = await api.get("/email-automation/reconcile/pending");
    return response.data;
  },

  confirmReconciliation: async (data) => {
    const response = await api.post("/email-automation/reconcile/match", data);
    return response.data;
  },

  rejectReconciliation: async (matchId) => {
    const response = await api.post("/email-automation/reconcile/reject", {
      banco_transacao_id: String(matchId),
    });
    return response.data;
  },

  chatWithAssistant: async (message) => {
    const response = await api.post("/email-automation/assistant/chat", {
      message,
    });
    return response.data;
  },
  getEmailAccounts: async () => {
    const response = await api.get("/email-automation/accounts");
    return response.data;
  },

  linkEmailAccount: async (data) => {
    const response = await api.post("/email-automation/accounts", data);
    return response.data;
  },

  unlinkEmailAccount: async (accountId) => {
    await api.delete(`/email-automation/accounts/${accountId}`);
  },
};
