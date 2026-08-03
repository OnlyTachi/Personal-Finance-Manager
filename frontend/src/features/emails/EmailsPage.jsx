import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emailAutomationService, api } from "@/services";
import {
  Mail,
  Settings,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileSearch,
  Building2,
  CreditCard,
  Sparkles,
  History,
  Info,
} from "lucide-react";

export default function EmailsPage() {
  const navigate = useNavigate();
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noAccountError, setNoAccountError] = useState(false);

  // Estados de Sincronização Retroativa
  const [daysBack, setDaysBack] = useState(90);
  const [syncingHistory, setSyncingHistory] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    setNoAccountError(false);
    try {
      const data = await emailAutomationService.getPendingReconciliations();
      setPendingMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar pendências reais do servidor:", err);
      const detail = err.response?.data?.detail;
      if (
        err.response?.status === 400 &&
        detail?.code === "EMAIL_NOT_CONFIGURED"
      ) {
        setNoAccountError(true);
      } else {
        setPendingMatches([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleScan = async () => {
    setLoading(true);
    try {
      await emailAutomationService.triggerEmailScan();
      setTimeout(() => {
        fetchPending();
      }, 1000);
    } catch (err) {
      alert("Erro ao acionar a varredura IMAP.");
      setLoading(false);
    }
  };

  // Dispara varredura retroativa via pipeline
  const handleHistoricalSync = async () => {
    setSyncingHistory(true);
    try {
      await api.post("/pipeline/imap/sync-history", {
        days_back: Number(daysBack),
      });
      alert(
        `Busca retroativa dos últimos ${daysBack} dias iniciada em segundo plano!`,
      );
    } catch (err) {
      alert("Erro ao iniciar sincronização histórica.");
    } finally {
      setSyncingHistory(false);
    }
  };

  const handleConfirmMatch = async (matchId) => {
    try {
      await emailAutomationService.confirmReconciliation({
        banco_transacao_id: String(matchId),
        status: "confirmed",
      });
      setPendingMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      alert("Erro ao confirmar conciliação.");
    }
  };

  const handleRejectMatch = async (matchId) => {
    try {
      await emailAutomationService.rejectReconciliation(matchId);
      setPendingMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      alert("Erro ao descartar conciliação no servidor.");
    }
  };

  if (noAccountError) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center my-12 animate-in fade-in duration-300">
        <div className="bg-amber-950/20 border border-amber-500/30 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Nenhum e-mail vinculado
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Sua conta ainda não possui e-mails cadastrados para sincronização
            automatizada. Vincule sua caixa de entrada nas configurações.
          </p>
          <button
            onClick={() => navigate("/settings")}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2 mx-auto text-sm cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Ir para Configurações
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500 space-y-8">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-500" /> Caixa de Conciliação
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Sincronização inteligente de notas fiscais, faturas e recibos.
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Varrendo..." : "Sincronizar Agora"}
        </button>
      </div>

      {/* PAINEL DE SINCRONIZAÇÃO HISTÓRICA / RETROATIVA */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">
              Busca Histórica IMAP
            </h3>
            <p className="text-xs text-slate-400">
              Importe comprovantes e notas de períodos passados da sua caixa de
              entrada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 outline-none font-medium"
          >
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 180 dias</option>
          </select>
          <button
            onClick={handleHistoricalSync}
            disabled={syncingHistory}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-purple-900/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            {syncingHistory ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <History className="w-3.5 h-3.5" />
            )}
            <span>Buscar Antigos</span>
          </button>
        </div>
      </div>

      {/* TABELA DE PENDÊNCIAS DE RECONCILIAÇÃO */}
      <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-700 flex items-center gap-2 bg-slate-800/50">
          <FileSearch className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-white text-sm">
            Pendentes de Confirmação
          </h2>
          <span className="ml-auto bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full font-bold">
            {pendingMatches.length} encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Dados do E-mail (Nota)</th>
                <th className="px-6 py-4">Sugestão do Banco (Extrato)</th>
                <th className="px-6 py-4 text-center">Score IA</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {pendingMatches.map((match) => (
                <tr
                  key={match.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">
                          {match.estabelecimento_ou_instituicao ||
                            match.email_data?.loja ||
                            "Sem nome"}
                        </p>
                        <p className="text-xs text-gray-400">
                          R${" "}
                          {(
                            match.valor_total ||
                            match.email_data?.valor ||
                            0
                          ).toFixed(2)}{" "}
                          |{" "}
                          {match.data_hora
                            ? new Date(match.data_hora).toLocaleDateString(
                                "pt-BR",
                              )
                            : match.email_data?.data}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-900/20 rounded-lg">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-blue-100 font-bold">
                          {match.banco_data?.descricao ||
                            match.meio_pagamento ||
                            "Extrato Bancário"}
                        </p>
                        <p className="text-xs text-blue-300/70">
                          R${" "}
                          {(
                            match.valor_total ||
                            match.banco_data?.valor ||
                            0
                          ).toFixed(2)}{" "}
                          | {match.origem_categoria || "BANCO"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 text-xs font-bold px-2 py-1 rounded border border-purple-500/20">
                      <Sparkles className="w-3 h-3" /> {match.confianca || 95}%
                      Match
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRejectMatch(match.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                        title="Descartar"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleConfirmMatch(match.id)}
                        className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors cursor-pointer"
                        title="Confirmar Vínculo"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingMatches.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                  >
                    Tudo limpo! Nenhuma nota fiscal pendente de conciliação.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
