import React, { useState } from "react";
import {
  analyzeFile,
  mapFile,
  importBulk,
  uploadLegacyPreview,
} from "@/services";
import {
  X,
  Upload,
  ArrowRight,
  Check,
  AlertCircle,
  FileWarning,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function CsvMapperModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [file, setFile] = useState(null); // Guardamos o arquivo raw para leitura local
  const [fileToken, setFileToken] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [previewData, setPreviewData] = useState([]);

  const [mapping, setMapping] = useState({
    date_col: "",
    history_col: "",
    description_col: "",
    amount_col: "",
    use_history_for_ai: false,
  });

  if (!isOpen) return null;

  const reset = () => {
    setStep(1);
    setFileToken(null);
    setFile(null);
    setHeaders([]);
    setSampleRows([]);
    setPreviewData([]);
    setError(null);
    setMapping({
      date_col: "",
      history_col: "",
      description_col: "",
      amount_col: "",
      use_history_for_ai: false,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // --- Função Auxiliar: Leitor CSV Local (Fallback) ---
  const parseLocalCSVForHistory = async (fileObj, historyColName) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n/);
        const delimiter = text.includes(";") ? ";" : ",";

        const headerRow = lines[0]
          .split(delimiter)
          .map((h) => h.replace(/['"]+/g, "").trim());
        const historyIndex = headerRow.findIndex((h) => h === historyColName);

        if (historyIndex === -1) return resolve([]);

        const historyData = lines.slice(1).map((line) => {
          const matches =
            line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) ||
            line.split(delimiter);
          if (!matches || !matches[historyIndex]) return "";
          return matches[historyIndex].replace(/['"]+/g, "").trim();
        });
        resolve(historyData);
      };
      reader.readAsText(fileObj);
    });
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    const ext = uploadedFile.name.split(".").pop().toLowerCase();
    const isLegacyFormat = ["pdf", "ofx"].includes(ext);

    try {
      if (isLegacyFormat) {
        // CORREÇÃO: O serviço já retorna os dados, não precisa de .data
        const res = await uploadLegacyPreview(formData);

        if (res && res.length > 0) {
          setPreviewData(res);
          setStep(3);
        } else {
          setError("Nenhuma transação encontrada neste arquivo.");
        }
      } else {
        const res = await analyzeFile(formData);

        // CORREÇÃO: Acessa res.headers diretamente
        if (res.headers && res.headers.length > 0) {
          setFileToken(res.file_token);
          setHeaders(res.headers);
          setSampleRows(res.sample_rows || []);
          setStep(2);

          // Auto-mapeamento
          const autoMap = {
            date_col: "",
            history_col: "",
            description_col: "",
            amount_col: "",
            use_history_for_ai: false,
          };
          res.headers.forEach((h) => {
            const lower = String(h).toLowerCase();
            if (lower.includes("data") || lower.includes("date"))
              autoMap.date_col = h;
            if (lower.includes("valor") || lower.includes("amount"))
              autoMap.amount_col = h;

            if (
              lower.includes("hist") ||
              lower.includes("memo") ||
              lower.includes("complemento")
            ) {
              autoMap.history_col = h;
            }
            if (
              lower.includes("desc") ||
              lower.includes("estab") ||
              lower.includes("loja")
            ) {
              autoMap.description_col = h;
            }
          });

          if (
            autoMap.history_col &&
            (!autoMap.description_col ||
              autoMap.description_col.toLowerCase().includes("tipo"))
          ) {
            autoMap.use_history_for_ai = true;
          }

          setMapping(autoMap);
        } else {
          setError("Não conseguimos identificar colunas neste arquivo.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar arquivo. Verifique se o formato é válido.");
    } finally {
      setLoading(false);
    }
  };

  const handleMappingSubmit = async () => {
    if (!mapping.date_col || !mapping.amount_col || !mapping.description_col) {
      setError("Por favor, mapeie as colunas obrigatórias.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiPayload = {
        file_token: fileToken,
        mapping: { ...mapping, memo_col: mapping.history_col },
      };

      const res = await mapFile(apiPayload);
      let processedData = res;

      // PATCH LOCAL para CSV
      if (file && file.name.endsWith(".csv") && mapping.history_col) {
        try {
          const localHistoryList = await parseLocalCSVForHistory(
            file,
            mapping.history_col,
          );
          if (localHistoryList.length > 0) {
            processedData = processedData.map((item, index) => ({
              ...item,
              historico:
                item.historico || item.memo || localHistoryList[index] || "",
            }));
          }
        } catch (parseErr) {
          console.warn("Falha ao ler histórico localmente", parseErr);
        }
      }

      if (processedData && processedData.length > 0) {
        setPreviewData(processedData);
        setStep(3);
      } else {
        setError("O mapeamento não gerou nenhuma transação válida.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar o mapeamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalImport = async () => {
    setLoading(true);
    try {
      const res = await importBulk(previewData);
      alert(res.message || "Importação concluída!");
      onSuccess();
      handleClose();
    } catch (err) {
      setError("Erro ao salvar transações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-xl border border-slate-700 shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800 rounded-t-xl shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Importar Transações{" "}
            {step > 1 && step < 3 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                Passo {step}/3
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded z-10"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body - Flex Grow para ocupar espaço e permitir scroll */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg flex items-start gap-3 text-sm animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-400" />
              <div>{error}</div>
            </div>
          )}

          {/* PASSO 1: UPLOAD */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.ofx"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-400 font-medium animate-pulse">
                    Analisando arquivo...
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Upload size={32} className="text-blue-400" />
                  </div>
                  <p className="text-gray-300 font-medium text-lg text-center mb-1">
                    Arraste ou clique para selecionar
                  </p>
                  <p className="text-gray-500 text-sm text-center mb-6">
                    Suporta CSV, Excel, PDF e OFX
                  </p>
                  <div className="flex gap-2">
                    <span className="bg-slate-800 text-gray-400 px-2 py-1 rounded text-xs border border-slate-700">
                      Nubank
                    </span>
                    <span className="bg-slate-800 text-gray-400 px-2 py-1 rounded text-xs border border-slate-700">
                      Inter
                    </span>
                    <span className="bg-slate-800 text-gray-400 px-2 py-1 rounded text-xs border border-slate-700">
                      XP
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PASSO 2: MAPEAMENTO */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-blue-900/20 p-4 rounded-xl text-sm text-blue-200 flex items-start gap-3 border border-blue-500/20">
                <FileWarning
                  size={20}
                  className="mt-0.5 shrink-0 text-blue-400"
                />
                <div>
                  <p className="font-bold mb-1 text-white">
                    Identifique as Colunas
                  </p>
                  <p className="text-blue-200/80">
                    O sistema tentou adivinhar, mas confira se as colunas do seu
                    arquivo correspondem aos campos abaixo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <MappingField
                  label="Data do Lançamento"
                  value={mapping.date_col}
                  onChange={(v) => setMapping({ ...mapping, date_col: v })}
                  options={headers}
                  required
                />

                <MappingField
                  label="Valor (R$)"
                  value={mapping.amount_col}
                  onChange={(v) => setMapping({ ...mapping, amount_col: v })}
                  options={headers}
                  required
                />

                <MappingField
                  label="Descrição Principal"
                  value={mapping.description_col}
                  onChange={(v) =>
                    setMapping({ ...mapping, description_col: v })
                  }
                  options={headers}
                  required
                  aiActive={!mapping.use_history_for_ai}
                  description="Nome do estabelecimento ou título da transação."
                />

                <MappingField
                  label="Histórico / Detalhes (Opcional)"
                  value={mapping.history_col}
                  onChange={(v) => setMapping({ ...mapping, history_col: v })}
                  options={headers}
                  aiActive={mapping.use_history_for_ai}
                  description="Informações extras (ex: 'Compra Parc 1/3', 'Pix enviado')."
                />
              </div>

              {/* TOGGLE PARA IA */}
              <div className="p-5 bg-purple-900/20 border border-purple-500/20 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 p-2.5 rounded-lg border border-purple-500/30">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">
                      Inteligência Artificial
                    </span>
                    <span className="text-sm text-gray-400">
                      Qual coluna a IA deve ler para categorizar?
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                  <span
                    className={`text-xs font-bold uppercase transition-colors ${!mapping.use_history_for_ai ? "text-purple-400" : "text-gray-500"}`}
                  >
                    Descrição
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={mapping.use_history_for_ai}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          use_history_for_ai: e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 transition-colors"></div>
                  </label>
                  <span
                    className={`text-xs font-bold uppercase transition-colors ${mapping.use_history_for_ai ? "text-purple-400" : "text-gray-500"}`}
                  >
                    Histórico
                  </span>
                </div>
              </div>

              {/* AMOSTRA */}
              {sampleRows.length > 0 && (
                <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="w-3 h-3" /> Amostra do Arquivo
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left text-gray-300">
                      <thead>
                        <tr>
                          {headers.map((h, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 font-bold border-b border-slate-700 whitespace-nowrap bg-slate-800/30 text-white"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx}>
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className="px-4 py-3 border-b border-slate-800 whitespace-nowrap max-w-[200px] truncate text-gray-400"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 3: PREVIEW */}
          {step === 3 && (
            <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm font-bold border border-green-500/30 flex items-center gap-2">
                    <Check className="w-4 h-4" /> {previewData.length}{" "}
                    Lançamentos
                  </span>
                  <p className="text-sm text-gray-400">
                    Confira se a categorização da IA está correta.
                  </p>
                </div>
              </div>

              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900 shadow-inner flex-1 min-h-[300px]">
                <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-700">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-800 sticky top-0 shadow-lg z-10">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Histórico / Descrição
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Categoria (IA)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-slate-900">
                      {previewData.map((t, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-800/50 transition-colors group"
                        >
                          <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap font-mono border-l-2 border-transparent group-hover:border-blue-500">
                            {new Date(t.data_temp).toLocaleDateString("pt-BR")}
                          </td>

                          <td className="px-5 py-3">
                            <div className="text-sm text-white font-medium">
                              {t.descricao}
                            </div>
                            {t.historico && (
                              <div className="text-xs text-gray-500 font-mono mt-0.5 max-w-sm truncate">
                                {t.historico}
                              </div>
                            )}
                          </td>

                          <td
                            className={`px-5 py-3 text-sm text-right font-bold whitespace-nowrap ${t.valor < 0 ? "text-red-400" : "text-emerald-400"}`}
                          >
                            {t.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>

                          <td className="px-5 py-3 text-sm">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-purple-300 border border-slate-700 group-hover:border-purple-500/50 transition-colors">
                              <Sparkles className="w-3 h-3 mr-1.5 opacity-70 text-purple-400" />
                              {t.categoria_sugerida}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-800 rounded-b-xl shrink-0">
          {step > 1 && (
            <button
              onClick={() =>
                setStep(step === 3 && !headers.length ? 1 : step - 1)
              }
              className="px-5 py-2.5 text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600 hover:text-white rounded-xl shadow-sm text-sm font-medium transition-all"
              disabled={loading}
            >
              Voltar
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleMappingSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                "Processando..."
              ) : (
                <>
                  Pré-visualizar <ArrowRight size={16} />
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleFinalImport}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 flex items-center gap-2 text-sm font-bold shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                "Salvando..."
              ) : (
                <>
                  Confirmar Importação <Check size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MappingField({
  label,
  value,
  onChange,
  options,
  description,
  required,
  aiActive,
}) {
  return (
    <div
      className={`rounded-xl transition-all duration-300 ${aiActive ? "bg-purple-900/20 border border-purple-500/40 p-4 -m-4 shadow-lg scale-[1.02] z-10" : ""}`}
    >
      <label className="block text-sm font-bold text-gray-300 mb-2 items-center gap-1">
        {label} {required && <span className="text-red-400 ml-0.5">*</span>}
        {aiActive && (
          <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wide font-extrabold flex items-center gap-1 border border-purple-500/30 animate-pulse">
            <Sparkles size={10} /> Lendo para IA
          </span>
        )}
      </label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full rounded-lg border border-slate-600 bg-slate-900 text-white shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-3 pl-3 pr-10 appearance-none transition-all cursor-pointer hover:border-slate-500 ${!value && required ? "border-red-900/50 bg-red-900/10" : ""}`}
        >
          <option value="" className="text-gray-500">
            Selecione a coluna...
          </option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 group-hover:text-white transition-colors">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </div>
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-gray-500 font-medium">
          {description}
        </p>
      )}
    </div>
  );
}
