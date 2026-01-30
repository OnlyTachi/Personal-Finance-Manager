import React, { useState, useEffect } from 'react';
import { investmentsService } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Coins, RefreshCw, Calculator as CalcIcon, ArrowLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rf');
  const [loading, setLoading] = useState(false);
  
  // Estados para Índices Econômicos (Selic, CDI, IPCA)
  const [indices, setIndices] = useState({ selic: 0, cdi: 0, ipca: 0 });
  const [loadingIndices, setLoadingIndices] = useState(false);

  // Estados Simulador Renda Fixa
  const [rfData, setRfData] = useState({
    valor_inicial: 1000,
    aporte_mensal: 500,
    periodo_meses: 60, // 5 anos
    taxa_juros_anual: 10.0,
    isento_ir: false
  });
  const [rfResult, setRfResult] = useState(null);

  // Estados Reserva de Emergência
  const [reservaData, setReservaData] = useState({
    despesa_mensal: 3000,
    meses: 6
  });
  const [reservaResult, setReservaResult] = useState(null);

  // Busca Índices ao carregar a página
  useEffect(() => {
    fetchIndices();
  }, []);

  const fetchIndices = async () => {
    setLoadingIndices(true);
    try {
      const data = await investmentsService.getIndices();
      if (data) {
        setIndices(data);
        // Atualiza a taxa padrão se vier valor válido e usuário ainda não mexeu
        if (data.selic > 0 && rfData.taxa_juros_anual === 10.0) {
          setRfData(prev => ({ ...prev, taxa_juros_anual: data.selic }));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar índices:", error);
    } finally {
      setLoadingIndices(false);
    }
  };

  const handleSimularRF = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mapeia os dados do form para o formato que o backend espera (Query Params para /simulate)
      const params = {
        valor_inicial: rfData.valor_inicial,
        aporte_mensal: rfData.aporte_mensal,
        meses: rfData.periodo_meses,
        taxa_anual: rfData.taxa_juros_anual,
        is_isento: rfData.isento_ir
      };
      
      const data = await investmentsService.simulateFixedIncome(params);
      setRfResult(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao calcular simulação. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimularReserva = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mapeia para o schema do backend (ReservaEmergenciaInput)
      const payload = {
        despesa_mensal: reservaData.despesa_mensal,
        meses_protecao: reservaData.meses
      };
      
      const data = await investmentsService.simulateEmergencyFund(payload);
      setReservaResult(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao calcular reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER & ÍNDICES DE MERCADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <CalcIcon className="w-8 h-8 text-primary" />
              Simuladores
            </h1>
            <p className="text-gray-400">Planeje seus investimentos com dados reais.</p>
          </div>

          {/* Card de Índices (Barra) */}
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-slate-700 flex flex-wrap gap-6 items-center">
             <div className="text-center">
               <span className="block text-gray-400 text-xs font-semibold uppercase tracking-wider">Selic</span>
               <span className="font-bold text-lg text-emerald-400">
                 {loadingIndices ? '...' : `${indices.selic}%`}
               </span>
             </div>
             <div className="w-px h-8 bg-slate-700 hidden md:block"></div>
             <div className="text-center">
               <span className="block text-gray-400 text-xs font-semibold uppercase tracking-wider">CDI</span>
               <span className="font-bold text-lg text-blue-400">
                  {loadingIndices ? '...' : `${indices.cdi}%`}
               </span>
             </div>
             <div className="w-px h-8 bg-slate-700 hidden md:block"></div>
             <div className="text-center">
               <span className="block text-gray-400 text-xs font-semibold uppercase tracking-wider">IPCA (12m)</span>
               <span className="font-bold text-lg text-orange-400">
                  {loadingIndices ? '...' : `${indices.ipca}%`}
               </span>
             </div>
             <button 
               onClick={fetchIndices} 
               disabled={loadingIndices}
               className="ml-auto p-2 text-gray-400 hover:text-primary hover:bg-slate-800 rounded-full transition-all"
               title="Atualizar Índices"
             >
               <RefreshCw className={`w-5 h-5 ${loadingIndices ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>

        {/* NAVEGAÇÃO / TABS */}
        <div className="flex gap-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('rf')}
            className={`pb-4 px-2 flex items-center gap-2 font-medium transition-colors relative ${
              activeTab === 'rf' ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Renda Fixa & Juros
            {activeTab === 'rf' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
          </button>
          
          <button
            onClick={() => setActiveTab('reserva')}
            className={`pb-4 px-2 flex items-center gap-2 font-medium transition-colors relative ${
              activeTab === 'reserva' ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            Reserva de Emergência
            {activeTab === 'reserva' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="transition-all duration-300">
          
          {/* === SIMULADOR RENDA FIXA === */}
          {activeTab === 'rf' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
              {/* Formulário */}
              <div className="lg:col-span-4 bg-surface p-6 rounded-2xl shadow-sm border border-slate-700 h-fit">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Parâmetros
                </h3>
                
                <form onSubmit={handleSimularRF} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Valor Inicial (R$)</label>
                    <input
                      type="number"
                      required
                      value={rfData.valor_inicial}
                      onChange={(e) => setRfData({ ...rfData, valor_inicial: Number(e.target.value) })}
                      className="w-full bg-slate-900 rounded-lg border border-slate-600 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Aporte Mensal (R$)</label>
                    <input
                      type="number"
                      required
                      value={rfData.aporte_mensal}
                      onChange={(e) => setRfData({ ...rfData, aporte_mensal: Number(e.target.value) })}
                      className="w-full bg-slate-900 rounded-lg border border-slate-600 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Taxa Anual (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={rfData.taxa_juros_anual}
                        onChange={(e) => setRfData({ ...rfData, taxa_juros_anual: Number(e.target.value) })}
                        className="w-full bg-slate-900 rounded-lg border border-slate-600 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary p-2.5 text-white outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setRfData({ ...rfData, taxa_juros_anual: indices.selic })}
                        className="px-4 py-2 bg-slate-800 text-gray-400 border border-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                        title="Usar Selic Atual"
                      >
                        SELIC
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Tempo (Meses)</label>
                    <input
                      type="number"
                      required
                      value={rfData.periodo_meses}
                      onChange={(e) => setRfData({ ...rfData, periodo_meses: Number(e.target.value) })}
                      className="w-full bg-slate-900 rounded-lg border border-slate-600 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary p-2.5 text-white outline-none"
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {Math.floor(rfData.periodo_meses / 12)} anos e {rfData.periodo_meses % 12} meses
                    </div>
                  </div>

                  <div className="flex items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <input
                      type="checkbox"
                      id="isento_ir"
                      checked={rfData.isento_ir}
                      onChange={(e) => setRfData({ ...rfData, isento_ir: e.target.checked })}
                      className="h-5 w-5 text-primary focus:ring-primary border-slate-600 rounded bg-slate-800"
                    />
                    <label htmlFor="isento_ir" className="ml-3 block text-sm font-medium text-gray-300 cursor-pointer select-none">
                      Isento de IR (LCI/LCA)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-all font-semibold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Calcular Projeção'}
                  </button>
                </form>
              </div>

              {/* Resultados e Gráfico */}
              <div className="lg:col-span-8 space-y-6">
                {rfResult ? (
                  <>
                    {/* Cards Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-surface p-5 rounded-xl border border-slate-700 shadow-sm">
                        <p className="text-sm text-gray-400 mb-1">Total Investido</p>
                        <p className="text-xl font-bold text-white">
                          R$ {rfResult.total_investido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      <div className="bg-surface p-5 rounded-xl border border-slate-700 shadow-sm">
                        <p className="text-sm text-gray-400 mb-1">Rendimento Bruto</p>
                        <p className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                          + R$ {rfResult.lucro_bruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-xl text-white shadow-lg shadow-blue-900/30">
                        <p className="text-blue-100 text-sm mb-1">Resultado Líquido</p>
                        <p className="text-2xl font-bold">
                          R$ {rfResult.valor_liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>

                    {/* Gráfico */}
                    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-slate-700 h-[400px]">
                      <h4 className="text-white font-semibold mb-6">Evolução Patrimonial</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={rfResult.projecao_mensal.filter((_, i) => i % (rfResult.projecao_mensal.length > 50 ? 6 : 1) === 0)}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                          <XAxis 
                            dataKey="mes" 
                            stroke="#94a3b8" 
                            tickFormatter={(mes) => mes === 0 ? 'Hoje' : `${Math.floor(mes/12)}a`} 
                          />
                          <YAxis 
                            stroke="#94a3b8"
                            tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #475569', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="patrimonio_bruto" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorPatrimonio)" 
                            name="Patrimônio"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="total_investido" 
                            stroke="#64748b" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={false}
                            name="Investido"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-surface rounded-2xl border-2 border-dashed border-slate-700 text-gray-500">
                    <CalcIcon className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Preencha os dados e simule</p>
                    <p className="text-sm">O gráfico da evolução aparecerá aqui.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === SIMULADOR RESERVA DE EMERGÊNCIA === */}
          {activeTab === 'reserva' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-surface p-8 rounded-2xl shadow-sm border border-slate-700">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-primary border border-blue-500/30">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Reserva de Emergência</h3>
                  <p className="text-gray-400 mt-2">
                    A reserva deve cobrir entre 6 a 12 meses do seu custo de vida.
                  </p>
                </div>

                <form onSubmit={handleSimularReserva} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Custo de Vida Mensal (R$)</label>
                    <input
                      type="number"
                      required
                      value={reservaData.despesa_mensal}
                      onChange={(e) => setReservaData({ ...reservaData, despesa_mensal: Number(e.target.value) })}
                      className="w-full text-center text-2xl font-bold bg-slate-900 rounded-lg border-slate-600 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary p-4 border text-white outline-none"
                      placeholder="Ex: 3000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 text-center">Quantos meses de segurança?</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 6, 9, 12].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setReservaData({...reservaData, meses: m})}
                          className={`py-3 rounded-lg font-medium transition-all ${
                            reservaData.meses === m 
                            ? 'bg-primary text-white shadow-lg shadow-blue-900/50' 
                            : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {m} meses
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-800 border border-slate-600 text-white py-4 rounded-xl hover:bg-slate-700 transition-all font-bold text-lg shadow-lg hover:border-primary"
                  >
                    Calcular Minha Meta
                  </button>
                </form>

                {reservaResult && (
                   <div className="mt-8 pt-8 border-t border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <p className="text-center text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Você precisa acumular</p>
                     <p className="text-center text-5xl font-extrabold text-primary mb-4">
                       R$ {reservaResult.valor_reserva.toLocaleString('pt-BR')}
                     </p>
                     <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg text-blue-200 text-sm text-center">
                       {reservaResult.descricao}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}