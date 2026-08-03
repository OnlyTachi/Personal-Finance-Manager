import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { investmentsService, reportService } from "@/services";
import { useAuth } from "@/context/AuthContext";
import EmailAccountsManager from "@/components/email/EmailAccountsManager";
import {
  Settings as SettingsIcon,
  Smartphone,
  Key,
  Shield,
  LogOut,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  Bot,
  Mail,
  MessageSquare,
  Webhook,
  Send,
} from "lucide-react";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Abas: telegram | discord | emails | security
  const [activeTab, setActiveTab] = useState("telegram");

  // Estados Telegram
  const [telegramDevices, setTelegramDevices] = useState([]);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);

  // Estados Discord (Pareamento + Webhook)
  const [discordDevices, setDiscordDevices] = useState([]);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  const [discordCode, setDiscordCode] = useState(null);
  const [webhookUrl, setDiscordWebhookUrl] = useState("");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Estados Segurança
  const [passData, setPassData] = useState({ newPass: "", confirmPass: "" });
  const [passMessage, setPassMessage] = useState({ type: "", text: "" });

  // Feedback de Cópia
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (activeTab === "telegram") fetchTelegramDevices();
    if (activeTab === "discord") {
      fetchDiscordDevices();
      fetchReportPreferences();
    }
  }, [activeTab]);

  // --- TELEGRAM ---
  const fetchTelegramDevices = async () => {
    setLoadingTelegram(true);
    try {
      const data = await investmentsService.getTelegramDevices();
      setTelegramDevices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTelegram(false);
    }
  };

  const handleGenerateTelegramCode = async () => {
    try {
      const data = await investmentsService.generateTelegramCode();
      setTelegramCode(data.code);
      setCopiedCode(false);
    } catch (err) {
      alert("Erro ao gerar código do Telegram.");
    }
  };

  const handleUnlinkTelegram = async (id) => {
    if (confirm("Desconectar este dispositivo do Telegram?")) {
      try {
        await investmentsService.unlinkTelegramDevice(id);
        fetchTelegramDevices();
      } catch (err) {
        alert("Erro ao remover.");
      }
    }
  };

  // --- DISCORD ---
  const fetchDiscordDevices = async () => {
    setLoadingDiscord(true);
    try {
      const data = await investmentsService.getDiscordDevices();
      setDiscordDevices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiscord(false);
    }
  };

  const fetchReportPreferences = async () => {
    try {
      const prefs = await reportService.getReportPreferences();
      if (prefs && prefs.discord_webhook_url) {
        setDiscordWebhookUrl(prefs.discord_webhook_url);
      }
    } catch (err) {
      console.error("Erro ao carregar preferências:", err);
    }
  };

  const handleGenerateDiscordCode = async () => {
    try {
      const data = await investmentsService.generateDiscordCode();
      setDiscordCode(data.code);
      setCopiedCode(false);
    } catch (err) {
      alert("Erro ao gerar código do Discord.");
    }
  };

  const handleUnlinkDiscord = async (id) => {
    if (confirm("Desconectar esta conta do Discord?")) {
      try {
        await investmentsService.unlinkDiscordDevice(id);
        fetchDiscordDevices();
      } catch (err) {
        alert("Erro ao desvincular Discord.");
      }
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return alert("Insira uma URL de Webhook válida.");
    setTestingWebhook(true);
    try {
      await investmentsService.testDiscordWebhook(webhookUrl);
      alert("Notificação de teste enviada para o canal do Discord!");
    } catch (err) {
      alert("Falha ao testar o Webhook. Verifique a URL.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSaveWebhook = async (e) => {
    e.preventDefault();
    setSavingWebhook(true);
    try {
      await reportService.updateReportPreferences({
        discord_webhook_url: webhookUrl,
      });
      alert("URL do Webhook do Discord salva com sucesso!");
    } catch (err) {
      alert("Erro ao salvar Webhook.");
    } finally {
      setSavingWebhook(false);
    }
  };

  // --- ALTERAR SENHA ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirmPass) {
      setPassMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }
    try {
      await investmentsService.changePassword(passData.newPass);
      setPassMessage({ type: "success", text: "Senha alterada com sucesso!" });
      setPassData({ newPass: "", confirmPass: "" });
    } catch (err) {
      setPassMessage({ type: "error", text: "Erro ao alterar senha." });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen pb-20 animate-in fade-in duration-500">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
          <SettingsIcon className="w-8 h-8 text-gray-200" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400">
            Gerencie sua conta e integrações externas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SIDEBAR DE ABAS */}
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab("telegram")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "telegram"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <Bot className="w-5 h-5" /> Telegram
          </button>

          <button
            onClick={() => setActiveTab("discord")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "discord"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                : "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Discord
          </button>

          <button
            onClick={() => setActiveTab("emails")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "emails"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <Mail className="w-5 h-5" /> E-mails
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <Shield className="w-5 h-5" /> Segurança
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 mt-8"
          >
            <LogOut className="w-5 h-5" /> Sair da Conta
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="md:col-span-3 bg-surface border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          {/* --- ABA TELEGRAM --- */}
          {activeTab === "telegram" && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <Bot className="w-5 h-5" /> Conectar Bot do Telegram
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Gere um código e envie <code>/start CODIGO</code> para o nosso
                  bot no Telegram.
                </p>
                {!telegramCode ? (
                  <button
                    onClick={handleGenerateTelegramCode}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Gerar Código
                  </button>
                ) : (
                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-lg border border-blue-500/50 max-w-sm">
                    <span className="text-2xl font-mono font-bold text-white tracking-widest">
                      {telegramCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(telegramCode)}
                      className="text-gray-400 hover:text-white transition-colors ml-auto"
                    >
                      {copiedCode ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-gray-400" /> Dispositivos
                  Conectados
                </h3>
                {loadingTelegram ? (
                  <div className="text-gray-500">Carregando...</div>
                ) : (
                  <div className="space-y-3">
                    {telegramDevices.length === 0 && (
                      <p className="text-gray-500 text-sm italic">
                        Nenhum Telegram vinculado.
                      </p>
                    )}
                    {telegramDevices.map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {d.device_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Conectado em{" "}
                            {new Date(d.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnlinkTelegram(d.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-900/20"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- ABA DISCORD (WEBHOOKS & BOT) --- */}
          {activeTab === "discord" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* 1. SEÇÃO WEBHOOK DO DISCORD */}
              <div className="bg-slate-900/60 p-6 rounded-xl border border-indigo-500/20 space-y-4">
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                  <Webhook className="w-5 h-5" /> Webhook do Discord
                  (Notificações)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Insira a URL do Webhook do seu servidor no Discord para
                  receber alertas de orçamento, faturas e resumos de relatórios
                  diretamente em um canal.
                </p>

                <form onSubmit={handleSaveWebhook} className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/123456/abcdef..."
                    value={webhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !webhookUrl}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {testingWebhook ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>Testar Webhook</span>
                    </button>
                    <button
                      type="submit"
                      disabled={savingWebhook}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                    >
                      {savingWebhook ? "Salvando..." : "Salvar Webhook"}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. PAREAMENTO COM O BOT DO DISCORD */}
              <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-500/20 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-400" />{" "}
                      Pareamento com Bot do Discord
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Status:{" "}
                      <span
                        className={`font-bold ${discordDevices.length > 0 ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {discordDevices.length > 0
                          ? "Conectado"
                          : "Desconectado"}
                      </span>
                    </p>
                  </div>
                </div>

                {!discordCode ? (
                  <button
                    onClick={handleGenerateDiscordCode}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                    <RefreshCw className="w-4 h-4" /> Gerar Código de Pareamento
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-indigo-500/50 max-w-sm">
                      <span className="text-2xl font-mono font-bold text-white tracking-widest">
                        {discordCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(discordCode)}
                        className="text-gray-400 hover:text-white transition-colors ml-auto"
                      >
                        {copiedCode ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* CAIXA INFORMATIVA COM O COMANDO DO BOT */}
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
                      <strong>Instrução:</strong> No Discord, envie o comando
                      abaixo para o bot:
                      <div className="mt-1 font-mono text-white bg-slate-950 p-2 rounded border border-slate-800">
                        /vincular codigo: {discordCode}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. TABELA DE DISPOSITIVOS/CONTAS DISCORD CONECTADAS */}
              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  Contas do Discord Pareadas ({discordDevices.length})
                </h3>
                {loadingDiscord ? (
                  <div className="text-gray-500 text-xs">Carregando...</div>
                ) : (
                  <div className="space-y-3">
                    {discordDevices.length === 0 && (
                      <p className="text-gray-500 text-xs italic bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-center">
                        Nenhuma conta de Discord pareada no momento.
                      </p>
                    )}
                    {discordDevices.map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">
                              {d.username || d.device_name || "Discord User"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Conectado em{" "}
                              {new Date(d.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlinkDiscord(d.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- ABA E-MAILS --- */}
          {activeTab === "emails" && <EmailAccountsManager />}

          {/* --- ABA SEGURANÇA --- */}
          {activeTab === "security" && (
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" /> Alterar Senha
              </h3>
              {passMessage.text && (
                <div
                  className={`p-3 rounded-lg mb-4 text-sm font-medium ${passMessage.type === "success" ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}
                >
                  {passMessage.text}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                    value={passData.newPass}
                    onChange={(e) =>
                      setPassData({ ...passData, newPass: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                    value={passData.confirmPass}
                    onChange={(e) =>
                      setPassData({ ...passData, confirmPass: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold transition-colors w-full mt-2"
                >
                  Atualizar Senha
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
