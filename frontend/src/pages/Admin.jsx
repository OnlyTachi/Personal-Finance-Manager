import React, { useEffect, useState } from 'react';
import { investmentsService } from '../services/api';
import { Users, Trash2, Shield, ShieldOff, Key, Plus, Activity, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [showCreate, setShowCreate] = useState(false);
  const [statsUser, setStatsUser] = useState(null);
  
  // Forms
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ username: null, password: '' });

  useEffect(() => { fetchUsers() }, []);

  const fetchUsers = async () => {
    try {
      const data = await investmentsService.adminListUsers();
      setUsers(data);
    } catch (error) {
      alert("Acesso negado ou erro ao buscar usuários.");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await investmentsService.adminCreateUser(newUser);
      setShowCreate(false);
      setNewUser({ username: '', password: '' });
      fetchUsers();
    } catch (err) { alert("Erro ao criar usuário. Talvez já exista."); }
  };

  const handleUpdatePass = async (e) => {
    e.preventDefault();
    try {
      await investmentsService.adminUpdateUser(passwordForm.username, { password: passwordForm.password });
      setPasswordForm({ username: null, password: '' });
      alert("Senha alterada com sucesso.");
    } catch (err) { alert("Erro ao mudar senha."); }
  };

  const toggleAdmin = async (u) => {
    if (!confirm(`Tornar ${u.username} ${u.is_admin ? 'Usuário Comum' : 'Admin'}?`)) return;
    try {
      await investmentsService.adminUpdateUser(u.username, { is_admin: !u.is_admin });
      fetchUsers();
    } catch (err) { alert("Erro ao alterar permissão."); }
  };

  const handleDelete = async (username) => {
    if (!confirm(`Tem certeza que deseja apagar ${username}? Todos os dados financeiros dele serão perdidos.`)) return;
    try {
      await investmentsService.adminDeleteUser(username);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.detail || "Erro ao deletar."); }
  };

  const handleAnalyze = async (username) => {
    try {
      const stats = await investmentsService.adminGetUserStats(username);
      setStatsUser(stats);
    } catch (err) { alert("Erro ao analisar."); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Shield className="text-purple-500 w-8 h-8" /> Administração
        </h1>
        <button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-slate-900 text-gray-400 uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Último Login</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map(u => (
              <tr key={u.username} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                <td className="px-6 py-4">
                  {u.is_admin 
                    ? <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs border border-purple-700/50 font-bold">ADMIN</span>
                    : <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded text-xs border border-slate-600/50">USER</span>
                  }
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                  {u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <button onClick={() => handleAnalyze(u.username)} title="Analisar Patrimônio" className="p-2 hover:bg-blue-900/30 text-blue-400 rounded transition-colors"><Activity className="w-4 h-4"/></button>
                  <button onClick={() => setPasswordForm({username: u.username, password: ''})} title="Mudar Senha" className="p-2 hover:bg-yellow-900/30 text-yellow-400 rounded transition-colors"><Key className="w-4 h-4"/></button>
                  <button onClick={() => toggleAdmin(u)} title={u.is_admin ? "Remover Admin" : "Tornar Admin"} className={`p-2 rounded transition-colors ${u.is_admin ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-purple-900/30 text-purple-400'}`}>
                    {u.is_admin ? <ShieldOff className="w-4 h-4"/> : <Shield className="w-4 h-4"/>}
                  </button>
                  <button onClick={() => handleDelete(u.username)} title="Deletar Usuário" className="p-2 hover:bg-red-900/30 text-red-400 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL ANALISAR */}
      {statsUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface p-6 rounded-xl border border-slate-700 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setStatsUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Activity className="text-blue-400"/> {statsUser.username}</h2>
            <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Patrimônio Líquido</p>
                    <p className="text-3xl font-bold text-green-400">R$ {statsUser.patrimonio_liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <p className="text-gray-500 text-xs uppercase">Ativos</p>
                        <p className="text-white font-bold">R$ {statsUser.total_ativos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <p className="text-gray-500 text-xs uppercase">Dívidas</p>
                        <p className="text-red-400 font-bold">R$ {statsUser.total_dividas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
                <p className="text-xs text-center text-gray-600 mt-4">Membro desde {statsUser.data_cadastro ? new Date(statsUser.data_cadastro).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MUDAR SENHA */}
      {passwordForm.username && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface p-6 rounded-xl border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white mb-4 text-lg">Nova senha para <span className="text-yellow-400">{passwordForm.username}</span></h3>
            <form onSubmit={handleUpdatePass}>
                <input autoFocus type="password" placeholder="Digite a nova senha..." className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white mb-6 focus:border-yellow-500 outline-none transition-colors" 
                    value={passwordForm.password} onChange={e => setPasswordForm({...passwordForm, password: e.target.value})}
                />
                <div className="flex gap-3">
                    <button type="button" onClick={() => setPasswordForm({username: null, password: ''})} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg font-medium transition-colors">Salvar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAR USER */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface p-6 rounded-xl border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white mb-6 text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-purple-400"/> Criar Usuário</h3>
            <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Username</label>
                    <input required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none" 
                        value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Senha Inicial</label>
                    <input required type="password" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none" 
                        value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-medium transition-colors">Criar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}