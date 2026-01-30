import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api';
import { PlusCircle, ArrowLeft, Save } from 'lucide-react';

export default function AddAssetPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'Renda Fixa',
    tipo_indexador: 'CDI',
    valor_taxa: 100,
    valor_inicial: 0,
    ticker: '',
    data_inicio: '' // <--- Novo Campo
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'valor_inicial' || name === 'valor_taxa' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (['B3', 'CRYPTO'].includes(payload.tipo_indexador)) {
        payload.valor_taxa = 0; 
      }
      
      // Formata a data se existir
      if (payload.data_inicio) {
        payload.data_inicio = new Date(payload.data_inicio).toISOString();
      } else {
        delete payload.data_inicio;
      }

      await investmentsService.createAsset(payload);
      navigate('/dashboard');
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar investimento. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all";
  const labelClass = "block text-sm font-medium mb-2 text-gray-300";
  const isRV = ['B3', 'CRYPTO'].includes(formData.tipo_indexador);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <PlusCircle className="w-8 h-8 text-primary" /> Novo Investimento
      </h1>

      <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-xl shadow-lg border border-secondary/30 space-y-6">
        
        <div>
          <label className={labelClass}>Nome do Investimento</label>
          <input required type="text" name="nome" placeholder="Ex: Bitcoin, Petrobras..." value={formData.nome} onChange={handleChange} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Categoria</label>
            <select name="categoria" value={formData.categoria} onChange={handleChange} className={inputClass}>
              <option>Renda Fixa</option>
              <option>Ações</option>
              <option>FIIs</option>
              <option>Criptomoedas</option>
              <option>Caixinha</option>
              <option>Outros</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Indexador</label>
            <select name="tipo_indexador" value={formData.tipo_indexador} onChange={handleChange} className={inputClass}>
              <option value="CDI">CDI</option>
              <option value="IPCA">IPCA</option>
              <option value="PRE">Pré-fixado</option>
              <option value="B3">B3 (Ações/FIIs)</option>
              <option value="CRYPTO">Cripto (CoinGecko)</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        </div>

        {isRV && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className={labelClass}>{formData.tipo_indexador === 'CRYPTO' ? 'ID CoinGecko' : 'Ticker B3'}</label>
            <input required type="text" name="ticker" placeholder={formData.tipo_indexador === 'CRYPTO' ? 'bitcoin' : 'PETR4.SA'} value={formData.ticker} onChange={handleChange} className={inputClass} />
            {formData.tipo_indexador === 'CRYPTO' && <p className="text-xs text-yellow-500/80 mt-2">⚠️ Use o ID da CoinGecko (ex: 'bitcoin').</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Aporte Inicial (R$)</label>
            <input type="number" step="0.01" name="valor_inicial" value={formData.valor_inicial} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data do Aporte (Opcional)</label>
            <input type="date" name="data_inicio" value={formData.data_inicio} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        {!isRV && (
          <div>
            <label className={labelClass}>Taxa (%)</label>
            <input type="number" step="0.01" name="valor_taxa" value={formData.valor_taxa} onChange={handleChange} className={inputClass} />
            <p className="text-xs text-gray-500 mt-1">Ex: 100 para 100% do CDI</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-8 shadow-lg shadow-blue-900/20">
          {loading ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar Investimento</>}
        </button>
      </form>
    </div>
  );
}