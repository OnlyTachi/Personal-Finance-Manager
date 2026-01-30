import React, { useEffect, useState } from 'react';
import { investmentsService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, CreditCard, Landmark, Percent } from 'lucide-react';

export default function PassivosPage() {
  const navigate = useNavigate();
  const [passivos, setPassivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({
    nome: '', tipo: 'Financiamento', valor_original: '', 
    saldo_devedor: '', taxa_juros_anual: '', prazo_meses: '',
    valor_parcela: ''
  });

  useEffect(() => {
    fetchPassivos();
  }, []);

  const fetchPassivos = async () => {
    try {
      const data = await investmentsService.getPassivos();
      setPassivos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
        const payload = {
            ...form,
            valor_original: parseFloat(form.valor_original),
            saldo_devedor: parseFloat(form.saldo_devedor),
            taxa_juros_anual: parseFloat(form.taxa_juros_anual || 0),
            prazo_meses: parseInt(form.prazo_meses || 0),
            valor_parcela: parseFloat(form.valor_parcela || 0),
            data_inicio: new Date().toISOString()
        };
        await investmentsService.createPassivo(payload);
        setShowModal(false);
        setForm({ nome: '', tipo: 'Financiamento', valor_original: '', saldo_devedor: '', taxa_juros_anual: '', prazo_meses: '', valor_parcela: '' });
        fetchPassivos();
    } catch (error) {
        alert("Erro ao salvar dívida.");
    }
  };

  const inputClass = "w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </button>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <CreditCard className="text-red-500" /> Gestão de Dívidas
        </h1>
        <button onClick={() => setShowModal(true)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      {loading ? <p className="text-center text-gray-500">Carregando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {passivos.map(p => (
            <div 
                key={p.id} 
                onClick={() => navigate(`/passivos/${p.id}`)}
                className="bg-surface p-6 rounded-xl border border-red-900/30 shadow-lg relative group cursor-pointer hover:border-red-500/50 transition-all hover:shadow-xl"
            >
              
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-900/20 p-3 rounded-lg"><Landmark className="w-6 h-6 text-red-500" /></div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors">{p.nome}</h3>
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded text-gray-300">{p.tipo}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-700 pb-2">
                  <span className="text-gray-400">Saldo Devedor</span>
                  <span className="font-bold text-red-400">R$ {p.saldo_devedor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa Juros</span>
                  <span className="flex items-center gap-1 text-yellow-400"><Percent className="w-3 h-3"/> {p.taxa_juros_anual}% a.a.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prazo</span>
                  <span>{p.prazo_meses} meses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Parcela Est.</span>
                  <span>R$ {p.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-gray-500 group-hover:text-white transition-colors">
                Clique para gerenciar parcelas →
              </div>
            </div>
          ))}
          {passivos.length === 0 && <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-slate-700 rounded-xl">Nenhuma dívida cadastrada (Ufa!).</div>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl border border-slate-700 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Adicionar Dívida</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <input required placeholder="Nome (ex: Financiamento Casa)" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className={inputClass} />
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className={inputClass}>
                    <option>Financiamento Imobiliário</option>
                    <option>Financiamento Veículo</option>
                    <option>Empréstimo Pessoal</option>
                    <option>Cartão de Crédito</option>
                    <option>Outros</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="0.01" placeholder="Valor Original" value={form.valor_original} onChange={e => setForm({...form, valor_original: e.target.value})} className={inputClass} />
                    <input required type="number" step="0.01" placeholder="Saldo Atual" value={form.saldo_devedor} onChange={e => setForm({...form, saldo_devedor: e.target.value})} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="0.01" placeholder="Taxa Juros % a.a." value={form.taxa_juros_anual} onChange={e => setForm({...form, taxa_juros_anual: e.target.value})} className={inputClass} />
                    <input required type="number" placeholder="Prazo (meses)" value={form.prazo_meses} onChange={e => setForm({...form, prazo_meses: e.target.value})} className={inputClass} />
                </div>
                <input required type="number" step="0.01" placeholder="Valor da Parcela (R$)" value={form.valor_parcela} onChange={e => setForm({...form, valor_parcela: e.target.value})} className={inputClass} />
                
                <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-700 text-white py-2 rounded">Cancelar</button>
                    <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded">Salvar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}