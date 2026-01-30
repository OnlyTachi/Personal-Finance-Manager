import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api.js';
import {
  ArrowLeft, Plus, Calendar, TrendingUp, TrendingDown,
  Trash2, FileText, Upload,
  Search, Filter, PieChart, BarChart3, Wallet, ArrowUpRight, ArrowDownRight,
  Users, Heart, Bot, Smartphone, ChevronLeft, ChevronRight, FileClock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import CsvMapperModal from '../components/CsvMapperModal';

export default function CashFlowPage() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isMapperOpen, setIsMapperOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    descricao: '',
    historico: '',
    valor: '',
    tipo: 'SAIDA',
    categoria: 'Alimentação',
    data: new Date().toISOString().split('T')[0],
    shared: false
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      const [list, sum] = await Promise.all([
        investmentsService.getCashflow(month, year),
        investmentsService.getCashflowSummary(month, year)
      ]);
      setTransactions(list || []);
      setSummary(sum || { entradas: 0, saidas: 0, saldo: 0 });
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  // Função auxiliar para pegar o histórico/observação de forma segura
  const getHistorico = (t) => {
    // O backend pode mandar como 'historico' ou 'observacao'
    return t.historico || t.observacao || '';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getHistorico(t).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const dailyChartData = useMemo(() => {
    const days = {};
    transactions.forEach(t => {
      const dateObj = new Date(t.data);
      const day = dateObj.getDate();
      if (!days[day]) days[day] = { dia: day, entradas: 0, saidas: 0 };
      if (t.valor > 0) days[day].entradas += t.valor;
      else days[day].saidas += Math.abs(t.valor);
    });
    return Object.values(days).sort((a, b) => a.dia - b.dia);
  }, [transactions]);

  const categoryChartData = useMemo(() => {
    const cats = {};
    transactions.filter(t => t.valor < 0).forEach(t => {
      if (!cats[t.categoria]) cats[t.categoria] = 0;
      cats[t.categoria] += Math.abs(t.valor);
    });
    return Object.keys(cats).map(key => ({ name: key, value: cats[key] }));
  }, [transactions]);

  const savingsRate = useMemo(() => {
    if (summary.entradas === 0) return 0;
    const saved = summary.entradas - Math.abs(summary.saidas);
    return (saved / summary.entradas) * 100;
  }, [summary]);

  const changeMonth = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-');
    setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const val = parseFloat(form.valor);
      const finalValue = form.tipo === 'SAIDA' ? -Math.abs(val) : Math.abs(val);
      await investmentsService.createMovimentacao({
        descricao: form.descricao,
        historico: form.historico || form.descricao,
        valor: finalValue,
        categoria: form.categoria,
        data: new Date(form.data).toISOString(),
        origem: 'MANUAL',
        conciliado: true,
        shared: form.shared
      });
      setShowModal(false);
      setForm({ ...form, descricao: '', historico: '', valor: '', shared: false });
      fetchData();
    } catch (error) {
      alert("Erro ao salvar.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Excluir este lançamento?")) {
      try {
        await investmentsService.deleteMovimentacao(id);
        fetchData();
      } catch (error) { alert("Erro ao excluir."); }
    }
  };

  const getOrigemIcon = (origem) => {
    switch (origem) {
      case 'TELEGRAM': return <Bot className="w-4 h-4 text-blue-400" title="Telegram Bot" />;
      case 'IMPORT': return <FileText className="w-4 h-4 text-yellow-400" title="Importação Arquivo" />;
      case 'OCR': return <Smartphone className="w-4 h-4 text-purple-400" title="Scanner OCR" />;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 bg-background min-h-screen font-sans">

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-2 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Wallet className="text-blue-500 w-8 h-8" /> Carteira Pessoal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative group text-center min-w-[140px] px-2">
              <input type="month" value={selectedDate.toISOString().slice(0, 7)} onChange={handleDateChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex flex-col items-center pointer-events-none">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  {selectedDate.getFullYear()}
                </span>
                <span className="text-base font-black text-white uppercase flex items-center gap-2">
                  {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                </span>
              </div>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-800 mx-2"></div>

          <button onClick={() => setIsMapperOpen(true)} className="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700">
            <Upload className="w-4 h-4 text-yellow-400" /> <span className="text-sm font-medium">Importar</span>
          </button>

          <button onClick={() => setShowModal(true)} className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-0.5">
            <Plus className="w-5 h-5" /> <span>Lançar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Receitas</p>
          <p className="text-2xl font-bold text-white">R$ {summary.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Despesas</p>
          <p className="text-2xl font-bold text-white">R$ {summary.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm`}>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo do Mês</p>
          <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {summary.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400 uppercase font-bold">Taxa Economia</span>
            <span className={`text-xl font-black ${savingsRate > 20 ? 'text-emerald-400' : 'text-yellow-400'}`}>{savingsRate.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${savingsRate > 20 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}></div>
          </div>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Fluxo Diário</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dia" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} cursor={{ fill: '#334155', opacity: 0.2 }} />
                  <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
                  <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-500" /> Categorias</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} formatter={(val) => `R$ ${val.toLocaleString()}`} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-slate-700/50 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/30">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por descrição, histórico ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 placeholder-gray-500"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Filter className="w-4 h-4" /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Histórico/Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Origem</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredTransactions.map(t => {
                // Recupera o histórico usando o campo 'observacao' (banco) ou 'historico' (frontend)
                const historicoReal = getHistorico(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono whitespace-nowrap">
                      {new Date(t.data).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          {/* LINHA SUPERIOR: DESCRIÇÃO EM BRANCO E NEGRITO */}
                          <span className="text-sm font-bold text-white">{t.descricao}</span>

                          {/* BADGES AO LADO DA DESCRIÇÃO */}
                          {t.conciliado && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold tracking-wide">OK</span>}
                          {t.shared && <span className="text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/20 font-bold tracking-wide flex items-center gap-1"><Heart className="w-2 h-2 fill-current" /> Casal</span>}
                        </div>

                        {/* LINHA INFERIOR: HISTÓRICO EM CINZA (Se existir e for diferente) */}
                        {historicoReal && historicoReal !== t.descricao && (
                          <span className="text-xs text-gray-500 truncate max-w-[350px] font-medium" title={historicoReal}>
                            {historicoReal}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                        {t.categoria}
                      </span>
                    </td>

                    <td className={`px-6 py-4 text-right font-bold text-sm ${t.valor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      R$ {Math.abs(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center opacity-70 hover:opacity-100 transition-opacity">
                        {getOrigemIcon(t.origem)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-600 hover:text-red-400 p-1.5 hover:bg-red-900/10 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm">
                    Nenhum lançamento encontrado neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-6">Novo Lançamento</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
                <button type="button" onClick={() => setForm({ ...form, tipo: 'SAIDA' })} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${form.tipo === 'SAIDA' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>DESPESA</button>
                <button type="button" onClick={() => setForm({ ...form, tipo: 'ENTRADA' })} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${form.tipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>RECEITA</button>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Descrição</label>
                <input required placeholder="Ex: Mercado Semanal" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><FileClock className="w-3 h-3" /> Detalhes / Histórico</label>
                <input placeholder="Ex: COMPRA ELO *SUPERMERCADO" value={form.historico} onChange={e => setForm({ ...form, historico: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors text-sm font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Valor</label>
                  <input required type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors">
                  <option>Alimentação</option>
                  <option>Transporte</option>
                  <option>Moradia & Contas</option>
                  <option>Lazer & Assinaturas</option>
                  <option>Saúde</option>
                  <option>Salário & Renda</option>
                  <option>Investimentos</option>
                  <option>Compras</option>
                  <option>Outros</option>
                </select>
              </div>

              {form.tipo === 'SAIDA' && (
                <div className="flex items-center gap-3 bg-pink-900/20 p-3 rounded-lg border border-pink-500/30">
                  <input type="checkbox" id="shared" checked={form.shared} onChange={e => setForm({ ...form, shared: e.target.checked })} className="w-5 h-5 text-pink-600 bg-slate-900 border-slate-600 rounded focus:ring-pink-500" />
                  <label htmlFor="shared" className="text-sm text-pink-200 font-medium cursor-pointer flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Dividir com Casal (50/50)
                  </label>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CsvMapperModal isOpen={isMapperOpen} onClose={() => setIsMapperOpen(false)} onSuccess={fetchData} />

    </div>
  );
}