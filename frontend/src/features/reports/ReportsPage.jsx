import React, { useState, useEffect } from "react";
import { reportService } from "@/services";
import {
  FileText,
  Mail,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Clock,
  X,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  Heart,
  Copy,
  Filter,
  BarChart3,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReportsPage() {
  const navigate = useNavigate();

  // Estados de Configuração Global
  const [preferences, setPreferences] = useState({
    email_destination: "",
    daily_enabled: true,
    daily_time: "08:00",
    weekly_enabled: true,
    weekly_day: "1",
    weekly_time: "08:00",
    monthly_enabled: true,
    monthly_day: 1,
    monthly_time: "08:00",
    annual_enabled: false,
  });

  const [activeTab, setActiveTab] = useState("daily");
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Filtros Específicos
  const [monthlyFilter, setMonthlyFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [annualFilterYear, setAnnualFilterYear] = useState(
    new Date().getFullYear(),
  );
  const [customFilters, setCustomFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    origin: "",
    sharedOnly: false,
  });

  // Modal HTML
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    loadPreferences();
    loadPreview("daily");
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await reportService.getReportPreferences();
      if (data) {
        setPreferences({
          email_destination: data.email_destination || "",
          daily_enabled: data.daily_enabled ?? true,
          daily_time: data.daily_time || "08:00",
          weekly_enabled: data.weekly_enabled ?? true,
          weekly_day: data.weekly_day || "1",
          weekly_time: data.weekly_time || "08:00",
          monthly_enabled: data.monthly_enabled ?? true,
          monthly_day: data.monthly_day || 1,
          monthly_time: data.monthly_time || "08:00",
          annual_enabled: data.annual_enabled ?? false,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar preferências:", err);
    }
  };

  const loadPreview = async (type = activeTab) => {
    setLoading(true);
    setPreviewData(null);
    try {
      let data = null;
      if (type === "daily") data = await reportService.previewDailyCheckup();
      else if (type === "weekly")
        data = await reportService.previewWeeklyReport();
      else if (type === "monthly") {
        data = await reportService.previewMonthlyReport(
          monthlyFilter.month,
          monthlyFilter.year,
        );
      } else if (type === "annual") {
        data = await reportService.previewAnnualReport(annualFilterYear);
      } else if (type === "custom") {
        data = await reportService.previewCustomReport(customFilters);
      }

      setPreviewData(data);
      if (data && (data.html || typeof data === "string")) {
        setHtmlContent(data.html || data);
      } else {
        setHtmlContent("");
      }
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadPreview(tab);
  };

  // --- HANDLER GENÉRICO DE EXPORTAÇÃO (BLOB) ---
  const handleExport = async (format) => {
    setExporting(true);
    try {
      let blobData = null;
      let filename = `relatorio_${activeTab}_${Date.now()}.${format}`;

      if (activeTab === "monthly") {
        if (format === "pdf") {
          blobData = await reportService.exportMonthlyPdf(
            monthlyFilter.month,
            monthlyFilter.year,
          );
          filename = `relatorio_mensal_${monthlyFilter.month}_${monthlyFilter.year}.pdf`;
        }
      } else if (activeTab === "annual") {
        if (format === "pdf") {
          blobData = await reportService.exportAnnualPdf(annualFilterYear);
          filename = `informe_irpf_${annualFilterYear}.pdf`;
        } else if (format === "excel") {
          blobData = await reportService.exportAnnualExcel(annualFilterYear);
          filename = `informe_irpf_${annualFilterYear}.xlsx`;
        }
      } else if (activeTab === "custom") {
        if (format === "pdf") {
          blobData = await reportService.exportCustomPdf(customFilters);
          filename = `relatorio_custom.pdf`;
        } else if (format === "excel") {
          blobData = await reportService.exportCustomExcel(customFilters);
          filename = `relatorio_custom.xlsx`;
        }
      }

      if (blobData) {
        const url = window.URL.createObjectURL(new Blob([blobData]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao exportar arquivo:", err);
      alert("Falha ao realizar o download do arquivo.");
    } finally {
      setExporting(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await reportService.updateReportPreferences(preferences);
      setFeedback({
        type: "success",
        message: "Configurações automáticas salvas!",
      });
    } catch (err) {
      setFeedback({ type: "error", message: "Erro ao salvar preferências." });
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setLoading(true);
    try {
      if (activeTab === "daily") await reportService.sendDailyCheckupNow();
      else if (activeTab === "weekly")
        await reportService.sendWeeklyReportNow();
      else if (activeTab === "monthly") {
        await reportService.sendMonthlyReportNow(
          monthlyFilter.month,
          monthlyFilter.year,
        );
      } else if (activeTab === "annual") {
        await reportService.sendAnnualReportNow(annualFilterYear);
      } else if (activeTab === "custom") {
        await reportService.sendCustomReportNow(customFilters);
      }
      alert("Relatório disparado com sucesso!");
    } catch (err) {
      alert("Falha ao disparar o relatório.");
    } finally {
      setLoading(false);
    }
  };

  const copyIrpfToClipboard = () => {
    if (!previewData?.irpf) return;
    let text = "DECLARAÇÃO DE BENS E DIREITOS (IRPF)\n\n";
    previewData.irpf.forEach((item) => {
      text += `Ativo: ${item.ativo}\nSaldo 31/12: R$ ${item.saldo}\nRendimentos: R$ ${item.rendimento}\nIR Retido: R$ ${item.imposto}\n---\n`;
    });
    navigator.clipboard.writeText(text);
    alert("Dados do IRPF copiados para a área de transferência!");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 bg-background min-h-screen">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
            <FileText className="text-blue-500 w-8 h-8" /> Central de Relatórios
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestão de disparos automáticos, geração de dashboards e exportação
            em PDF/Excel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ======================= COLUNA ESQUERDA: CONFIGURAÇÕES GLOBAIS ======================= */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
              <Settings className="w-5 h-5 text-blue-400" /> Disparos
              Automáticos
            </h2>

            {feedback.message && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${feedback.type === "success" ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-red-950/40 border-red-500/30 text-red-300"}`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" /> E-mail de
                  Destino
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={preferences.email_destination}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      email_destination: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* DIÁRIO */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Check-up Diário
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.daily_enabled}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        daily_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-800"
                  />
                </div>
                {preferences.daily_enabled && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <input
                      type="time"
                      value={preferences.daily_time}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          daily_time: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-mono outline-none"
                    />
                  </div>
                )}
              </div>

              {/* SEMANAL */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Relatório Semanal
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.weekly_enabled}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        weekly_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-800"
                  />
                </div>
                {preferences.weekly_enabled && (
                  <div className="flex flex-col gap-2">
                    <select
                      value={preferences.weekly_day}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          weekly_day: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      <option value="0">Domingo</option>
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                      <option value="6">Sábado</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <input
                        type="time"
                        value={preferences.weekly_time}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            weekly_time: e.target.value,
                          })
                        }
                        className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-mono outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MENSAL */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Relatório Mensal
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.monthly_enabled}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        monthly_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-800"
                  />
                </div>
                {preferences.monthly_enabled && (
                  <div className="flex flex-col gap-2">
                    <select
                      value={preferences.monthly_day}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          monthly_day: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i} value={i + 1}>
                          Dia {i + 1} do mês
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <input
                        type="time"
                        value={preferences.monthly_time}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            monthly_time: e.target.value,
                          })
                        }
                        className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-1.5 font-mono outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ANUAL */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <span className="text-sm font-bold text-slate-200">
                  IRPF / Consolidado Anual
                </span>
                <input
                  type="checkbox"
                  checked={preferences.annual_enabled}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      annual_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-800"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Agendamentos</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ======================= COLUNA DIREITA: VISUALIZAÇÕES E EXPORTAÇÃO ======================= */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-full">
            {/* ABAS */}
            <div className="flex flex-wrap sm:flex-nowrap bg-slate-900 p-1 rounded-xl border border-slate-800 w-full mb-6 gap-1">
              {[
                { id: "daily", label: "Diário" },
                { id: "weekly", label: "Semanal" },
                { id: "monthly", label: "Mensal" },
                { id: "annual", label: "Anual / IRPF" },
                { id: "custom", label: "Personalizado" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-slate-400 hover:text-white"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* BARRA DE FERRAMENTAS & BOTÕES DE EXPORTAÇÃO */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-700 pb-4">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {activeTab === "monthly" && (
                  <>
                    <select
                      value={monthlyFilter.month}
                      onChange={(e) =>
                        setMonthlyFilter({
                          ...monthlyFilter,
                          month: e.target.value,
                        })
                      }
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                    <select
                      value={monthlyFilter.year}
                      onChange={(e) =>
                        setMonthlyFilter({
                          ...monthlyFilter,
                          year: e.target.value,
                        })
                      }
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                    <button
                      onClick={() => loadPreview("monthly")}
                      className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-300" />
                    </button>
                  </>
                )}

                {activeTab === "annual" && (
                  <>
                    <select
                      value={annualFilterYear}
                      onChange={(e) => setAnnualFilterYear(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                    <button
                      onClick={() => loadPreview("annual")}
                      className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-300" />
                    </button>
                  </>
                )}
              </div>

              {/* GRUPO DE BOTÕES DE AÇÃO E EXPORTAÇÃO BINÁRIA */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto ml-auto justify-end">
                {/* BOTÃO EXPORTAR PDF */}
                {["monthly", "annual", "custom"].includes(activeTab) && (
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={exporting}
                    className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Exportar documento PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                    <span>PDF</span>
                  </button>
                )}

                {/* BOTÃO EXPORTAR EXCEL */}
                {["annual", "custom"].includes(activeTab) && (
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={exporting}
                    className="bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Exportar planilha Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Excel</span>
                  </button>
                )}

                {activeTab === "annual" && previewData?.irpf && (
                  <button
                    onClick={copyIrpfToClipboard}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copiar IRPF</span>
                  </button>
                )}

                {htmlContent && (
                  <button
                    onClick={() => setShowHtmlModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ver HTML</span>
                  </button>
                )}

                <button
                  onClick={handleSendNow}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 justify-center disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Agora</span>
                </button>
              </div>
            </div>

            {/* CONTAINER DE EXIBIÇÃO */}
            <div className="flex-1 bg-slate-950/60 rounded-xl border border-slate-800 p-6 overflow-y-auto min-h-[400px]">
              {loading || exporting ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-xs">
                    {exporting
                      ? "Gerando arquivo para download..."
                      : "Gerando dashboard analítico..."}
                  </p>
                </div>
              ) : previewData ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* DASHBOARD MENSAL */}
                  {activeTab === "monthly" && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />{" "}
                            Receitas
                          </p>
                          <p className="text-lg font-bold text-white mt-1">
                            R${" "}
                            {previewData.cashflow?.entradas?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-500" />{" "}
                            Despesas
                          </p>
                          <p className="text-lg font-bold text-white mt-1">
                            R${" "}
                            {previewData.cashflow?.saidas?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-blue-500" /> Aportes
                          </p>
                          <p className="text-lg font-bold text-white mt-1">
                            R${" "}
                            {previewData.cashflow?.aportes?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-purple-500" />{" "}
                            Saldo Livre
                          </p>
                          <p
                            className={`text-lg font-bold mt-1 ${previewData.cashflow?.saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            R${" "}
                            {previewData.cashflow?.saldo?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />{" "}
                            Evolução do Patrimônio
                          </h4>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">
                              Patrimônio Inicial:
                            </span>
                            <span className="text-sm font-mono text-gray-300">
                              R${" "}
                              {previewData.net_worth?.start?.toLocaleString() ||
                                "0,00"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">
                              Patrimônio Final:
                            </span>
                            <span className="text-sm font-mono text-white font-bold">
                              R${" "}
                              {previewData.net_worth?.end?.toLocaleString() ||
                                "0,00"}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              Variação:
                            </span>
                            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">
                              +{previewData.net_worth?.growth_percentage || "0"}
                              %
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-pink-500" /> Acerto
                            do Casal
                          </h4>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">
                              Você pagou (Compartilhado):
                            </span>
                            <span className="text-sm font-mono text-gray-300">
                              R${" "}
                              {previewData.couple?.user_paid?.toLocaleString() ||
                                "0,00"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">
                              Parceiro(a) pagou:
                            </span>
                            <span className="text-sm font-mono text-gray-300">
                              R${" "}
                              {previewData.couple?.partner_paid?.toLocaleString() ||
                                "0,00"}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              Saldo a acertar:
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${previewData.couple?.settlement >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                            >
                              R${" "}
                              {previewData.couple?.settlement?.toLocaleString() ||
                                "0,00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* DASHBOARD ANUAL (IRPF) */}
                  {activeTab === "annual" && (
                    <>
                      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-6 rounded-xl">
                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-blue-400" />{" "}
                          Retrospectiva Macro {annualFilterYear}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                              Total Recebido
                            </p>
                            <p className="text-lg font-bold text-emerald-400">
                              R${" "}
                              {previewData.macro?.total_income?.toLocaleString() ||
                                "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                              Total Gasto
                            </p>
                            <p className="text-lg font-bold text-red-400">
                              R${" "}
                              {previewData.macro?.total_expense?.toLocaleString() ||
                                "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                              Total Economizado
                            </p>
                            <p className="text-lg font-bold text-blue-400">
                              R${" "}
                              {previewData.macro?.total_saved?.toLocaleString() ||
                                "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                              Taxa de Poupança
                            </p>
                            <p className="text-lg font-bold text-purple-400">
                              {previewData.macro?.saving_rate || "0"}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                          <h4 className="text-sm font-bold text-white">
                            Declaração de Bens e Direitos (IRPF)
                          </h4>
                          <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-1 rounded">
                            Posição em 31/12
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-slate-900/80 text-gray-400 text-xs uppercase">
                              <tr>
                                <th className="px-4 py-3">Ativo</th>
                                <th className="px-4 py-3 text-right">
                                  Saldo 31/12
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Rend. Realizado
                                </th>
                                <th className="px-4 py-3 text-right text-red-400">
                                  IR Retido
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {previewData.irpf &&
                              previewData.irpf.length > 0 ? (
                                previewData.irpf.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-slate-800/50"
                                  >
                                    <td className="px-4 py-3 font-medium text-white">
                                      {item.ativo}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                      R$ {item.saldo?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                                      R$ {item.rendimento?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-red-400">
                                      R$ {item.imposto?.toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan="4"
                                    className="text-center py-6 text-gray-500"
                                  >
                                    Nenhum ativo tributável encontrado neste
                                    ano.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* DASHBOARD CUSTOMIZADO */}
                  {activeTab === "custom" && (
                    <>
                      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Filter className="w-4 h-4 text-blue-400" /> Filtros
                          Dinâmicos
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                              Data Início
                            </label>
                            <input
                              type="date"
                              value={customFilters.startDate}
                              onChange={(e) =>
                                setCustomFilters({
                                  ...customFilters,
                                  startDate: e.target.value,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                              Data Fim
                            </label>
                            <input
                              type="date"
                              value={customFilters.endDate}
                              onChange={(e) =>
                                setCustomFilters({
                                  ...customFilters,
                                  endDate: e.target.value,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                              Categoria
                            </label>
                            <select
                              value={customFilters.category}
                              onChange={(e) =>
                                setCustomFilters({
                                  ...customFilters,
                                  category: e.target.value,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                            >
                              <option value="">Todas</option>
                              <option value="Alimentação">Alimentação</option>
                              <option value="Transporte">Transporte</option>
                              <option value="Moradia">Moradia</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">
                              Origem
                            </label>
                            <select
                              value={customFilters.origin}
                              onChange={(e) =>
                                setCustomFilters({
                                  ...customFilters,
                                  origin: e.target.value,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg p-2 outline-none"
                            >
                              <option value="">Todas</option>
                              <option value="MANUAL">Manual</option>
                              <option value="TELEGRAM">Telegram Bot</option>
                              <option value="IMPORT">
                                Importação / E-mail
                              </option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customFilters.sharedOnly}
                              onChange={(e) =>
                                setCustomFilters({
                                  ...customFilters,
                                  sharedOnly: e.target.checked,
                                })
                              }
                              className="bg-slate-950 border-slate-700 text-pink-500 rounded"
                            />
                            <span className="text-xs text-gray-300">
                              Apenas Despesas de Casal
                            </span>
                          </label>
                          <button
                            onClick={() => loadPreview("custom")}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            Aplicar Filtros
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">
                            Total Entradas
                          </p>
                          <p className="text-lg font-bold text-emerald-400 mt-1">
                            R${" "}
                            {previewData.summary_cards?.entradas?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">
                            Total Saídas
                          </p>
                          <p className="text-lg font-bold text-red-400 mt-1">
                            R${" "}
                            {previewData.summary_cards?.saidas?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">
                            Saldo Período
                          </p>
                          <p className="text-lg font-bold text-white mt-1">
                            R${" "}
                            {previewData.summary_cards?.saldo?.toLocaleString() ||
                              "0,00"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-slate-800 bg-slate-950/50">
                          <h4 className="text-xs font-bold text-white">
                            Transações Filtradas
                          </h4>
                        </div>
                        <div className="overflow-x-auto max-h-[300px]">
                          <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-slate-900/80 text-gray-500 sticky top-0 uppercase">
                              <tr>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2">Descrição</th>
                                <th className="px-4 py-2">Categoria</th>
                                <th className="px-4 py-2 text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {previewData.transactions &&
                              previewData.transactions.length > 0 ? (
                                previewData.transactions.map((t, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-slate-800/50"
                                  >
                                    <td className="px-4 py-2">{t.data}</td>
                                    <td className="px-4 py-2 font-medium text-white">
                                      {t.descricao}
                                    </td>
                                    <td className="px-4 py-2">{t.categoria}</td>
                                    <td
                                      className={`px-4 py-2 text-right font-mono font-bold ${t.valor < 0 ? "text-red-400" : "text-emerald-400"}`}
                                    >
                                      R$ {t.valor?.toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan="4"
                                    className="text-center py-6 text-gray-500"
                                  >
                                    Nenhuma transação encontrada com os filtros
                                    atuais.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* FALLBACK / RESUMO GERAL */}
                  {!previewData.cashflow &&
                    !previewData.macro &&
                    !previewData.transactions && (
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                        {previewData.summary ||
                          JSON.stringify(previewData, null, 2)}
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
                  Nenhum dado retornado para esta pré-visualização.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL COM IFRAME HTML */}
      {showHtmlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" /> Visualização do E-mail
                (HTML)
              </h3>
              <button
                onClick={() => setShowHtmlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-white">
              <iframe
                title="Preview do Relatório HTML"
                srcDoc={
                  htmlContent ||
                  `<html><body style="font-family:sans-serif;padding:20px;"><h2>${previewData?.title || "Relatório"}</h2><p>${previewData?.summary || ""}</p></body></html>`
                }
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
