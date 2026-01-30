import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api';
import { LayoutDashboard, Wallet, TrendingUp, RefreshCw, PieChart as PieIcon, CreditCard, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [passivos, setPassivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsData, passivosData] = await Promise.all([
        investmentsService.getAssets(),
        investmentsService.getPassivos()
      ]);
      setAssets(assetsData);
      setPassivos(passivosData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      await investmentsService.refreshPrices();
      await fetchData();
    } catch (err) {
      alert("Falha ao atualizar cotações.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalAtivos = assets.reduce((acc, curr) => acc + (curr.valor_atual_bruto || 0), 0);
  const totalPassivos = passivos.reduce((acc, curr) => acc + (curr.saldo_devedor || 0), 0);
  const patrimonioLiquido = totalAtivos - totalPassivos;

  const dataPorCategoria = assets.reduce((acc, asset) => {
    const cat = asset.categoria || 'Outros';
    acc[cat] = (acc[cat] || 0) + asset.valor_atual_bruto;
    return acc;
  }, {});

  const chartData = Object.keys(dataPorCategoria).map(key => ({
    name: key,
    value: dataPorCategoria[key]
  })).filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary" /> Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Visão consolidada da sua vida financeira</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => navigate('/passivos')} className="bg-red-900/50 hover:bg-red-900/80 border border-red-700 text-red-200 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Dívidas
            </button>
            <button onClick={() => navigate('/add-investment')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            + Novo Ativo
            </button>
            <button onClick={handleRefreshPrices} disabled={refreshing} className={`p-2 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors text-gray-400 hover:text-white ${refreshing ? 'opacity-50' : ''}`}>
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
        </div>
      </div>

      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet className="w-24 h-24" /></div>
          <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total em Ativos</h3>
          <p className="text-3xl font-bold text-white">R$ {totalAtivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-red-900/30 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500"><CreditCard className="w-24 h-24" /></div>
          <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total em Dívidas</h3>
          <p className="text-3xl font-bold text-red-400">R$ {totalPassivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-green-500"><DollarSign className="w-24 h-24" /></div>
          <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Patrimônio Líquido</h3>
          <p className={`text-3xl font-bold ${patrimonioLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8 h-80">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-purple-400"/> Alocação por Categoria
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}/>
              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista Rápida */}
      <h2 className="text-xl font-semibold mb-4">Meus Ativos</h2>
      {loading ? <div className="text-center py-10 text-gray-500">Carregando...</div> : assets.length === 0 ? <div className="bg-slate-800 p-10 text-center text-gray-500 rounded-xl border border-dashed border-slate-700">Nenhum ativo encontrado.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((ativo) => (
            <div key={ativo.id} onClick={() => navigate(`/asset/${ativo.id}`)} className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg group relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{ativo.nome}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-gray-300">{ativo.categoria}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${ativo.status === 'Ativo' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{ativo.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between pt-2 border-t border-slate-700/50"><span className="text-gray-400">Valor Atual</span><span className="font-bold text-green-400">R$ {ativo.valor_atual_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}