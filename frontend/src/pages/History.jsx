import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api';
import { ArrowLeft, TrendingUp, Calendar, RefreshCcw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await investmentsService.getHistory();
        
        // Remove duplicatas e formata
        const uniqueDataMap = new Map();
        data.forEach(item => {
            const dateKey = new Date(item.timestamp).toLocaleDateString('pt-BR');
            uniqueDataMap.set(dateKey, item);
        });
        
        const uniqueData = Array.from(uniqueDataMap.values());
        const formattedData = uniqueData.map(item => ({
          ...item,
          dateStr: new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          fullDate: new Date(item.timestamp).toLocaleDateString('pt-BR')
        }));
        
        formattedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setHistory(formattedData);
      } catch (error) {
        console.error("Erro ao carregar histórico");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
                <TrendingUp className="w-8 h-8 text-primary" /> Evolução Patrimonial
            </h1>
            <p className="text-gray-400">Acompanhe seu crescimento e movimentações diárias.</p>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-surface p-6 rounded-xl border border-secondary/30 shadow-lg h-[450px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Carregando histórico...</div>
        ) : history.length < 1 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Calendar className="w-12 h-12 mb-4 opacity-20" />
            <p>Sem dados suficientes.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="dateStr" 
                stroke="#94a3b8" 
                tickLine={false}
                axisLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis 
                stroke="#94a3b8" 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                labelFormatter={(label, payload) => payload[0]?.payload.fullDate}
              />
              <Area 
                name="Patrimônio Total"
                type="monotone" 
                dataKey="valor_total_bruto" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorValor)" 
                strokeWidth={3}
              />
              <Line 
                name="Total Investido"
                type="monotone" 
                dataKey="valor_total_investido" 
                stroke="#64748b" 
                strokeWidth={2} 
                dot={false}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Tabela de Dados */}
      <div className="mt-8 bg-surface rounded-xl border border-secondary/30 overflow-hidden">
        <div className="p-4 border-b border-secondary/30 font-bold text-white flex justify-between items-center">
          <span>Movimentações Diárias</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-slate-900/50 text-gray-400 sticky top-0 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-green-400 text-right">Aportes Dia</th>
                <th className="px-6 py-4 text-red-400 text-right">Saques Dia</th>
                <th className="px-6 py-4 text-right">Total Investido</th>
                <th className="px-6 py-4 text-right">Patrimônio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/30">
              {[...history].reverse().map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-3 font-medium">{item.fullDate}</td>
                  
                  {/* Coluna Aportes */}
                  <td className="px-6 py-3 text-right">
                    {item.total_aportes > 0 ? (
                        <span className="text-green-400 flex items-center justify-end gap-1">
                            <ArrowUpCircle className="w-3 h-3"/> +{item.total_aportes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    ) : '-'}
                  </td>

                  {/* Coluna Saques */}
                  <td className="px-6 py-3 text-right">
                    {item.total_saques > 0 ? (
                        <span className="text-red-400 flex items-center justify-end gap-1">
                            <ArrowDownCircle className="w-3 h-3"/> -{item.total_saques.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    ) : '-'}
                  </td>

                  <td className="px-6 py-3 text-right text-gray-500">
                    R$ {item.valor_total_investido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-white">
                    R$ {item.valor_total_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}