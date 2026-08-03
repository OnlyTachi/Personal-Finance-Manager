import React, { useState } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import api from "@/services";

export default function IMAPSyncModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    imap_host: "imap.gmail.com",
    imap_port: 993,
    email_user: "",
    email_password: "",
    days_back: 90,
  });

  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [progressStatus, setProgressStatus] = useState("");
  const [error, setError] = useState(null);

  // Monitora o progresso do Task ID via Polling a cada 3 segundos
  const pollTaskStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/api/v1/pipeline/tasks/${id}`);
        const { status, progress, result, error: taskErr } = response.data;

        if (status === "PROCESSING") {
          setProgressStatus(progress);
        } else if (status === "SUCCESS" || status === "COMPLETED") {
          clearInterval(interval);
          setLoading(false);
          setProgressStatus(result);
          if (onSuccess) onSuccess();
        } else if (status === "FAILED") {
          clearInterval(interval);
          setLoading(false);
          setError(taskErr || "Erro ao sincronizar e-mails.");
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        setError("Falha ao verificar progresso da tarefa.");
      }
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProgressStatus("Iniciando conexão IMAP...");

    try {
      const res = await api.post(
        "/api/v1/pipeline/imap/sync-history",
        formData,
      );
      setTaskId(res.data.task_id);
      pollTaskStatus(res.data.task_id);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || "Erro ao iniciar varredura IMAP.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Importar E-mails Antigos
            </h3>
            <p className="text-xs text-slate-400">
              Varredura retroativa de comprovantes via IMAP
            </p>
          </div>
        </div>

        {!loading && !progressStatus?.includes("concluída") ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Provedor IMAP
              </label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.imap_host}
                onChange={(e) =>
                  setFormData({ ...formData, imap_host: e.target.value })
                }
              >
                <option value="imap.gmail.com">Gmail (imap.gmail.com)</option>
                <option value="outlook.office365.com">
                  Outlook / Hotmail (outlook.office365.com)
                </option>
                <option value="imap.mail.yahoo.com">
                  Yahoo (imap.mail.yahoo.com)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="seu.email@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.email_user}
                onChange={(e) =>
                  setFormData({ ...formData, email_user: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Senha de Aplicativo (16 dígitos)
              </label>
              <input
                type="password"
                required
                placeholder="•••• •••• •••• ••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.email_password}
                onChange={(e) =>
                  setFormData({ ...formData, email_password: e.target.value })
                }
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Use a Senha de App gerada nas configurações de segurança da sua
                conta de e-mail.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Período de Busca Retroativa
              </label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.days_back}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    days_back: Number(e.target.value),
                  })
                }
              >
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias (Recomendado)</option>
                <option value={180}>Últimos 6 meses</option>
                <option value={365}>Último 1 ano</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Iniciar Sincronização</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="py-8 text-center space-y-4">
            {loading ? (
              <>
                <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <p className="text-sm font-medium text-white">
                  Processando Histórico IMAP...
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto animate-pulse">
                  {progressStatus}
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">
                  Concluído com Sucesso!
                </p>
                <p className="text-xs text-slate-300">{progressStatus}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
