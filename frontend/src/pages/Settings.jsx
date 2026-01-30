import React, { useState, useEffect } from 'react';
import { investmentsService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, Smartphone, Key, Shield, LogOut, 
  Trash2, RefreshCw, Copy, Check, ArrowLeft, Bot 
} from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [activeTab, setActiveTab] = useState('telegram');
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [linkCode, setLinkCode] = useState(null);
  
  // Password State
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'telegram') fetchDevices();
  }, [activeTab]);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const data = await investmentsService.getTelegramDevices();
      setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const data = await investmentsService.generateTelegramCode();
      setLinkCode(data.code);
      setCopied(false);
    } catch (err) {
      alert("Erro ao gerar código.");
    }
  };

  const handleUnlink = async (id) => {
    if (confirm("Desconectar este dispositivo?")) {
      try {
        await investmentsService.unlinkTelegramDevice(id);
        fetchDevices();
      } catch (err) {
        alert("Erro ao remover.");
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirmPass) {
        setPassMessage({ type: 'error', text: 'As senhas não coincidem.' });
        return;
    }
    try {
        await investmentsService.changePassword(passData.newPass);
        setPassMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setPassData({ newPass: '', confirmPass: '' });
    } catch (err) {
        setPassMessage({ type: 'error', text: 'Erro ao alterar senha.' });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen pb-20 animate-in fade-in duration-500">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <SettingsIcon className="w-8 h-8 text-gray-200" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
            <p className="text-gray-400">Gerencie sua conta e integrações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* SIDEBAR */}
        <div className="space-y-2">
            <button 
                onClick={() => setActiveTab('telegram')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'telegram' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'}`}
            >
                <Bot className="w-5 h-5"/> Integração Telegram
            </button>
            <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'}`}
            >
                <Shield className="w-5 h-5"/> Segurança & Senha
            </button>
            <button 
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 mt-8"
            >
                <LogOut className="w-5 h-5"/> Sair da Conta
            </button>
        </div>

        {/* CONTEÚDO */}
        <div className="md:col-span-3 bg-surface border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            
            {/* --- ABA TELEGRAM --- */}
            {activeTab === 'telegram' && (
                <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-6 rounded-xl border border-blue-500/20">
                        <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                            <Bot className="w-5 h-5"/> Conectar Novo Bot
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Gere um código abaixo e envie <code>/start CÓDIGO</code> para o nosso bot no Telegram para vincular sua conta.
                        </p>
                        
                        {!linkCode ? (
                            <button onClick={handleGenerateCode} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2">
                                <RefreshCw className="w-4 h-4"/> Gerar Código de Vínculo
                            </button>
                        ) : (
                            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-lg border border-blue-500/50 max-w-sm">
                                <span className="text-2xl font-mono font-bold text-white tracking-widest">{linkCode}</span>
                                <button onClick={copyToClipboard} className="text-gray-400 hover:text-white transition-colors ml-auto" title="Copiar">
                                    {copied ? <Check className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
                                </button>
                            </div>
                        )}
                        {linkCode && <p className="text-xs text-yellow-500 mt-2">⚠️ Este código expira em breve. Use-o agora.</p>}
                    </div>

                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-gray-400"/> Dispositivos Conectados</h3>
                        {loadingDevices ? <div className="text-gray-500">Carregando...</div> : (
                            <div className="space-y-3">
                                {devices.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum Telegram conectado.</p>}
                                {devices.map(d => (
                                    <div key={d.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/20 p-2 rounded-full"><Bot className="w-5 h-5 text-blue-400"/></div>
                                            <div>
                                                <p className="text-white font-medium">{d.device_name}</p>
                                                <p className="text-xs text-gray-500">Conectado em {new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleUnlink(d.id)} className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-900/20 transition-colors">
                                            <Trash2 className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ABA SEGURANÇA --- */}
            {activeTab === 'security' && (
                <div className="max-w-md">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Key className="w-5 h-5 text-yellow-400"/> Alterar Senha
                    </h3>
                    
                    {passMessage.text && (
                        <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${passMessage.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
                            {passMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nova Senha</label>
                            <input 
                                type="password" required 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                                value={passData.newPass} onChange={e => setPassData({...passData, newPass: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Confirmar Senha</label>
                            <input 
                                type="password" required 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                                value={passData.confirmPass} onChange={e => setPassData({...passData, confirmPass: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold transition-colors w-full mt-2">
                            Atualizar Senha
                        </button>
                    </form>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}