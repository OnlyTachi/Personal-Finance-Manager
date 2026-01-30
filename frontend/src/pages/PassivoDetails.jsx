import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api.js';
import { ArrowLeft, Trash2, Calendar, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function PassivoDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [passivo, setPassivo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const data = await investmentsService.getPassivoById(id);
      if (data && data.parcelas) {
        data.parcelas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
      }
      setPassivo(data);
    } catch (error) {
      console.error("Erro ao carregar detalhes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const handleToggleParcela = async (parcelaId) => {
    try {
      const updatedPassivo = await investmentsService.toggleParcela(id, parcelaId);
      
      // Proteção Robusta: Verifica se o retorno é válido antes de atualizar o estado
      if (updatedPassivo && Array.isArray(updatedPassivo.parcelas)) {
        updatedPassivo.parcelas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
        setPassivo(updatedPassivo);
      } else {
        // Se a resposta vier incompleta, recarrega tudo do servidor
        console.warn("Resposta parcial detectada, recarregando...");
        fetchDetails();
      }
    } catch (error) {
      alert("Erro ao alterar status da parcela.");
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja apagar essa dívida?")) {
      await investmentsService.deletePassivo(id);
      navigate('/passivos');
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Carregando...</div>;
  if (!passivo) return <div className="p-10 text-center text-red-400">Dívida não encontrada.</div>;

  // Garante que parcelas seja sempre um array, mesmo que venha nulo
  const parcelas = Array.isArray(passivo.parcelas) ? passivo.parcelas : [];
  const parcelasPagas = parcelas.filter(p => p.status === 'Pago').length;
  const parcelasTotal = parcelas.length;
  const progresso = parcelasTotal > 0 ? (parcelasPagas / parcelasTotal) * 100 : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/passivos')} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Dívidas
      </button>

      <div className="flex justify-between items-center mb-8 bg-surface p-6 rounded-xl border border-red-900/30">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{passivo.nome}</h1>
          <div className="flex gap-4 text-sm text-gray-400">
            <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{passivo.tipo}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {passivo.prazo_meses} Meses</span>
          </div>
        </div>
        <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Saldo Devedor Atual</p>
            <p className="text-4xl font-bold text-red-400">R$ {passivo.saldo_devedor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-8 bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 relative group">
        <div 
            className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-500" 
            style={{width: `${progresso}%`}}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
            {parcelasPagas} de {parcelasTotal} Pagas ({progresso.toFixed(0)}%)
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckCircle2 className="text-green-500"/> Parcelas</h2>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 border border-red-900/50 px-3 py-1 rounded hover:bg-red-900/20 transition-colors">
            <Trash2 className="w-4 h-4" /> Excluir Dívida
        </button>
      </div>

      {/* Lista de Parcelas */}
      <div className="bg-surface rounded-xl border border-secondary/30 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-slate-900/50 text-gray-400 sticky top-0 uppercase text-xs">
                <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ação</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-secondary/30">
                {parcelas.map((p) => {
                    const isPaid = p.status === 'Pago';
                    const isLate = !isPaid && new Date(p.data_vencimento) < new Date();
                    
                    return (
                        <tr key={p.id} className={`hover:bg-slate-800/50 transition-colors ${isPaid ? 'opacity-50 hover:opacity-100' : ''}`}>
                            <td className="px-6 py-3 font-mono text-gray-500">{p.numero}</td>
                            <td className="px-6 py-3">
                                {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                                {isLate && <span className="ml-2 text-xs bg-red-900/50 text-red-200 px-2 py-0.5 rounded">Atrasada</span>}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-white">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${isPaid ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                    {p.status}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-center">
                                <button 
                                    onClick={() => handleToggleParcela(p.id)}
                                    className={`flex items-center justify-center mx-auto gap-1 px-3 py-1 rounded transition-colors ${
                                        isPaid 
                                        ? 'text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400' 
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                                    }`}
                                >
                                    {isPaid ? 'Desmarcar' : 'Pagar'}
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
            {parcelas.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                    Nenhuma parcela gerada automaticamente.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}