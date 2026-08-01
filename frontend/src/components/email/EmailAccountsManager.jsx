import React, { useState, useEffect } from "react";
import { emailAutomationService as emailService } from "@/services";
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Server,
  ShieldCheck,
} from "lucide-react";

export default function EmailAccountsManager() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    imap_server: "imap.gmail.com",
    imap_port: 993,
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await emailService.getEmailAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error("Erro ao carregar contas de e-mail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await emailService.linkEmailAccount(form);
      setSuccessMsg("Conta de e-mail conectada e verificada com sucesso!");
      setForm({
        email: "",
        password: "",
        imap_server: "imap.gmail.com",
        imap_port: 993,
      });
      loadAccounts();
    } catch (err) {
      // Pega a mensagem detalhada que o backend FastAPI envia
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setErrorMsg(detail);
      } else if (detail?.message) {
        setErrorMsg(detail.message);
      } else {
        setErrorMsg(
          "Não foi possível conectar. Verifique seu e-mail e a Senha de Aplicativo.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async (id, maskedEmail) => {
    if (confirm(`Deseja remover a conta ${maskedEmail}?`)) {
      try {
        await emailService.unlinkEmailAccount(id);
        loadAccounts();
      } catch (err) {
        alert("Erro ao remover conta de e-mail.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" /> Contas de E-mail
            Conectadas
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Vincule seus e-mails para que a inteligência artificial leia suas
            compras e faturas automaticamente.
          </p>
        </div>
      </div>

      {/* Formulário para Adicionar Conta */}
      <form
        onSubmit={handleLinkAccount}
        className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl"
      >
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" /> Adicionar Nova Conta
          IMAP
        </h4>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Endereço de E-mail
            </label>
            <input
              type="email"
              required
              placeholder="seu.email@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 flex justify-between">
              <span>Senha de Aplicativo (App Password)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="**** **** **** ****"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pr-10 text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Server className="w-3 h-3" /> Servidor IMAP
            </label>
            <input
              type="text"
              required
              value={form.imap_server}
              onChange={(e) =>
                setForm({ ...form, imap_server: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Porta IMAP
            </label>
            <input
              type="number"
              required
              value={form.imap_port}
              onChange={(e) =>
                setForm({ ...form, imap_port: parseInt(e.target.value) || 993 })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verificando conexão IMAP...</span>
            </>
          ) : (
            <span>Testar & Salvar Conta</span>
          )}
        </button>
      </form>

      {/* Lista de Contas Conectadas */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Contas Ativas ({accounts.length})
        </h4>

        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Carregando contas...
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            Nenhuma conta de e-mail conectada no momento.
          </div>
        ) : (
          <div className="grid gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    {/* E-mail MASCARADO do Backend */}
                    <p className="font-bold text-white text-sm font-mono tracking-wide">
                      {acc.masked_email}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>
                        {acc.imap_server}:{acc.imap_port}
                      </span>
                      <span>•</span>
                      <span>
                        Última sinc:{" "}
                        {acc.last_synced_at
                          ? new Date(acc.last_synced_at).toLocaleString("pt-BR")
                          : "Nunca"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnlink(acc.id, acc.masked_email)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                  title="Remover conta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
