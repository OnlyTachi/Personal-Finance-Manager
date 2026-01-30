import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentsService } from '../services/api';
import { 
  Heart, UserPlus, AlertCircle, 
  Wallet, CreditCard, Unlink, ArrowLeft, PieChart as PieChartIcon, TrendingUp,
  Calculator, Target, X, Eye, EyeOff, Scale, ArrowRight, CheckCircle2,
  Calendar, Plus, Pencil, Trash2, Swords, Trophy, Crown, Sparkles, ArrowDown
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export default function CouplePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados de Dados
  const [status, setStatus] = useState('loading'); 
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]); 
  const [goals, setGoals] = useState([]); 
  const [battle, setBattle] = useState(null); 
  
  // Estados de UI/Controle
  const [partnerUsername, setPartnerUsername] = useState('');
  const [partnerName, setPartnerName] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Estado Modal Simulação
  const [showSimModal, setShowSimModal] = useState(false);
  const [simForm, setSimForm] = useState({ 
    aporte_user: 500,
    aporte_partner: 500,
    anos: 10,
    taxa: 10 
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Estado Modal Metas
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    id: null,
    nome: '',
    valor_alvo: '',
    valor_atual: '',
    data_limite: '',
    cor: '#3b82f6'
  });

  useEffect(() => { 
    fetchCoupleData(); 
  }, []);

  const fetchCoupleData = async () => {
    setLoading(true);
    try {
      const response = await investmentsService.getCoupleSummary();
      setStatus(response.status);
      
      if (response.status === 'linked') {
        setData(response.data);
        
        const [histData, goalsData, battleData] = await Promise.all([
            investmentsService.getCoupleHistory(),
            investmentsService.getGoals(),
            investmentsService.getGamificationBattle() 
        ]);

        const formattedHistory = histData.map(item => ({
            ...item,
            dateStr: new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            fullDate: new Date(item.timestamp).toLocaleDateString('pt-BR')
        }));
        
        setHistory(formattedHistory);
        setGoals(goalsData || []); 
        setBattle(battleData); 

      } else if (response.status === 'pending_approval') {
        setPartnerName(response.partner_name);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do casal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!partnerUsername) return;
    try {
      await investmentsService.linkPartner(partnerUsername);
      alert(`Convite enviado! Peça para ${partnerUsername} te adicionar também.`);
      fetchCoupleData();
    } catch (error) {
      alert("Usuário não encontrado ou erro ao adicionar.");
    }
  };

  const handleUnlink = async () => {
    if (confirm("Deseja realmente desfazer a conexão de casal?")) {
      try {
        await investmentsService.unlinkPartner();
        fetchCoupleData();
      } catch (error) {
        alert("Erro ao desconectar.");
      }
    }
  };

  // --- Lógica de Metas ---
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    try {
        const payload = {
            nome: goalForm.nome,
            valor_alvo: parseFloat(goalForm.valor_alvo),
            valor_atual: parseFloat(goalForm.valor_atual || 0),
            data_limite: goalForm.data_limite ? new Date(goalForm.data_limite).toISOString() : null,
            cor: goalForm.cor
        };

        if (goalForm.id) {
            await investmentsService.updateGoal(goalForm.id, payload);
        } else {
            await investmentsService.createGoal(payload);
        }
        
        setShowGoalModal(false);
        setGoalForm({ id: null, nome: '', valor_alvo: '', valor_atual: '', data_limite: '', cor: '#3b82f6' });
        
        const goalsData = await investmentsService.getGoals();
        setGoals(goalsData);

    } catch (error) {
        alert("Erro ao salvar meta.");
    }
  };

  const handleEditGoal = (g) => {
    setGoalForm({
        id: g.id,
        nome: g.nome,
        valor_alvo: g.valor_alvo,
        valor_atual: g.valor_atual,
        data_limite: g.data_limite ? g.data_limite.split('T')[0] : '',
        cor: g.cor || '#3b82f6'
    });
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
        try {
            await investmentsService.deleteGoal(id);
            const goalsData = await investmentsService.getGoals();
            setGoals(goalsData);
        } catch (error) {
            alert("Erro ao excluir.");
        }
    }
  };

  // --- Lógica de Simulação ---
  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    try {
        const patrimonioAtual = data?.combined?.net_worth || 0;
        const aporteTotal = parseFloat(simForm.aporte_user) + parseFloat(simForm.aporte_partner);
        const anosInput = parseFloat(simForm.anos) || 1;
        const mesesCalculados = Math.floor(anosInput * 12);

        const params = {
            valor_inicial: patrimonioAtual,
            aporte_mensal: aporteTotal,
            meses: mesesCalculados, 
            taxa_anual: parseFloat(simForm.taxa),
            is_isento: false
        };
        const result = await investmentsService.simulateFixedIncome(params);
        setSimResult(result);
    } catch (err) {
        alert("Erro ao simular. Verifique os valores.");
    } finally {
        setSimLoading(false);
    }
  };

  // --- Render Helpers ---
  const renderValue = (val, isCurrency = true) => {
    if (privacyMode) return '•••••••';
    if (!val && val !== 0) return '-';
    if (isCurrency) return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return val;
  };

  const COLORS_CONTRIBUTION = ['#3b82f6', '#ec4899']; 
  const COLORS_ALLOCATION = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#6366f1'];

  const allocationChartData = data?.combined?.allocation 
    ? Object.entries(data.combined.allocation).map(([name, value]) => ({ name, value }))
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg">
          <p className="text-white font-bold">{label}</p>
          <p className="text-gray-300">
            {privacyMode ? '•••••••' : `R$ ${payload[0].value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const settlement = data?.settlement || {}; 
  const userOwes = (settlement.value || 0) < 0; 
  const settlementAmount = Math.abs(settlement.value || 0);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Carregando finanças do casal...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 hover:text-white mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <Heart className="w-8 h-8 text-pink-500" /> Finanças de Casal
            </h1>
            <p className="text-gray-400 text-sm">Visão compartilhada para objetivos em comum.</p>
        </div>
        
        {status === 'linked' && (
            <div className="flex flex-wrap items-center gap-3">
                <button 
                    onClick={() => setPrivacyMode(!privacyMode)} 
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    title={privacyMode ? "Mostrar Valores" : "Ocultar Valores"}
                >
                    {privacyMode ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>

                <button 
                    onClick={() => setShowSimModal(true)} 
                    className="text-pink-400 hover:text-pink-300 text-xs md:text-sm flex items-center gap-2 border border-pink-900/30 px-3 py-2 rounded-lg hover:bg-pink-900/20 transition-colors"
                >
                    <Calculator className="w-4 h-4" /> Projetar
                </button>
                
                <button 
                    onClick={handleUnlink} 
                    className="text-red-400 hover:text-red-300 text-xs md:text-sm flex items-center gap-2 border border-red-900/30 px-3 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
                >
                    <Unlink className="w-4 h-4" /> <span className="hidden sm:inline">Desconectar</span>
                </button>
            </div>
        )}
      </div>

      {status === 'no_partner' && (
        <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
            <div className="w-20 h-20 bg-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-10 h-10 text-pink-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Conecte-se com seu amor</h2>
            <p className="text-gray-400 mb-8">
                Adicione o <strong>username</strong> da sua parceira(o) para verem o patrimônio somado.
            </p>
            <form onSubmit={handleLink} className="flex gap-2">
                <input 
                    placeholder="Username dele(a)" 
                    value={partnerUsername}
                    onChange={e => setPartnerUsername(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-pink-500 outline-none"
                />
                <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">Conectar</button>
            </form>
        </div>
      )}

      {status === 'pending_approval' && (
        <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-yellow-500/30 shadow-xl text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Aguardando Conexão</h2>
            <p className="text-gray-300 mb-6">Você adicionou <strong>{partnerName}</strong>. Aguardando confirmação.</p>
            <button onClick={handleUnlink} className="text-gray-500 hover:text-white underline">Cancelar</button>
        </div>
      )}

      {status === 'linked' && data && (
        <div className="animate-in fade-in duration-500 space-y-8">
            
            {/* ======================= METAS (GOALS) ======================= */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <Target className="w-6 h-6 text-emerald-400"/> Metas Compartilhadas
                    </h3>
                    <button 
                        onClick={() => { setGoalForm({id: null, nome: '', valor_alvo: '', valor_atual: '', data_limite: '', cor: '#10b981'}); setShowGoalModal(true); }} 
                        className="text-xs bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nova Meta
                    </button>
                </div>

                {goals.length === 0 ? (
                    <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <Target className="w-10 h-10 text-gray-600 mx-auto mb-2"/>
                        <p className="text-gray-500 text-sm">Definam objetivos juntos! Nenhuma meta criada ainda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goals.map(g => {
                            const percent = Math.min(100, (g.valor_atual / g.valor_alvo) * 100);
                            const isOwner = g.owner_id === user.username;
                            
                            return (
                                <div key={g.id} className="bg-surface rounded-xl border border-slate-700 p-5 relative group hover:border-slate-500 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg" style={{backgroundColor: `${g.cor}20`}}>
                                                <Target className="w-5 h-5" style={{color: g.cor}} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white leading-tight">{g.nome}</h4>
                                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">
                                                    {isOwner ? 'Você' : data.partner.username}
                                                </span>
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditGoal(g)} className="p-1.5 text-gray-400 hover:text-white bg-slate-800 rounded"><Pencil className="w-3 h-3"/></button>
                                                <button onClick={() => handleDeleteGoal(g.id)} className="p-1.5 text-gray-400 hover:text-red-400 bg-slate-800 rounded"><Trash2 className="w-3 h-3"/></button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Progresso</span>
                                            <span className="font-bold text-white">{percent.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{width: `${percent}%`, backgroundColor: g.cor}}></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">Atual</p>
                                            <p className="font-bold text-white">{renderValue(g.valor_atual)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">Alvo</p>
                                            <p className="font-bold text-gray-300">{renderValue(g.valor_alvo)}</p>
                                        </div>
                                    </div>
                                    
                                    {g.data_limite && (
                                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="w-3 h-3"/> Alvo: {new Date(g.data_limite).toLocaleDateString('pt-BR')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ======================= GAMIFICAÇÃO: BATALHA MENSAL ======================= */}
            {battle && battle.partner && (
                <section className="bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 rounded-2xl border border-fuchsia-500/30 p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Swords className="w-64 h-64 text-white"/></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-fuchsia-500/20 p-2 rounded-lg border border-fuchsia-500/30">
                                <Trophy className="w-6 h-6 text-fuchsia-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Duelo do Mês</h3>
                                <p className="text-fuchsia-200/70 text-sm">Quem está poupando mais?</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mb-6">
                            {/* Card Usuário */}
                            <div className={`p-4 rounded-xl border transition-all ${battle.saver_winner === battle.user.username ? 'bg-fuchsia-500/20 border-fuchsia-400 shadow-lg shadow-fuchsia-900/20' : 'bg-slate-900/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-white flex items-center gap-2">
                                        {battle.saver_winner === battle.user.username && <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400"/>}
                                        Você
                                    </span>
                                    <span className="text-xs text-gray-400">Economia</span>
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-3xl font-black text-white">{battle.user.savings_rate.toFixed(0)}%</span>
                                    <span className="text-sm text-gray-400 mb-1">({renderValue(battle.user.saved)})</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{width: `${Math.max(0, Math.min(100, battle.user.savings_rate))}%`}}></div>
                                </div>
                            </div>

                            {/* Card Parceiro */}
                            <div className={`p-4 rounded-xl border transition-all ${battle.saver_winner === battle.partner.username ? 'bg-fuchsia-500/20 border-fuchsia-400 shadow-lg shadow-fuchsia-900/20' : 'bg-slate-900/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-white flex items-center gap-2">
                                        {battle.saver_winner === battle.partner.username && <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400"/>}
                                        {battle.partner.username}
                                    </span>
                                    <span className="text-xs text-gray-400">Economia</span>
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-3xl font-black text-white">{battle.partner.savings_rate.toFixed(0)}%</span>
                                    <span className="text-sm text-gray-400 mb-1">({renderValue(battle.partner.saved)})</span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-pink-500 rounded-full transition-all duration-1000" style={{width: `${Math.max(0, Math.min(100, battle.partner.savings_rate))}%`}}></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950/30 p-4 rounded-xl border border-white/10 text-center relative">
                            <Sparkles className="w-4 h-4 text-yellow-300 absolute top-2 right-2 animate-pulse"/>
                            <p className="text-fuchsia-200 text-sm font-medium italic">
                                "{battle.reward_message}"
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ======================= CARD SPLITWISE (RESPONSIVO) ======================= */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-slate-700 pb-4 gap-2">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <Scale className="w-6 h-6 text-yellow-400"/> Acerto de Contas do Mês
                    </h3>
                    <span className="text-xs text-gray-400 bg-slate-950 px-2 py-1 rounded">Despesas "Compartilhado"</span>
                </div>
                
                {/* Ajuste Mobile: Flex-col no celular, Flex-row no desktop */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
                    
                    {/* Coluna 1: Você Pagou */}
                    <div className="text-center flex-1 w-full md:w-auto bg-slate-900/30 p-3 rounded-lg md:bg-transparent">
                        <p className="text-xs text-gray-400 uppercase font-bold">Você Pagou</p>
                        <p className="text-xl font-bold text-white">{renderValue(settlement.total_paid_by_user || 0)}</p>
                    </div>
                    
                    {/* Coluna 2: Resultado Central */}
                    <div className="flex-1 w-full md:w-auto flex flex-col items-center">
                        {settlementAmount < 1 ? (
                            <div className="text-green-400 font-bold flex items-center gap-2 bg-green-900/20 px-4 py-2 rounded-full border border-green-500/30">
                                <CheckCircle2 className="w-5 h-5"/> Contas em dia!
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center p-4 rounded-xl border w-full ${userOwes ? 'bg-red-900/10 border-red-500/30' : 'bg-green-900/10 border-green-500/30'}`}>
                                <span className="text-xs text-gray-400 uppercase font-bold mb-1">Resultado</span>
                                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-lg font-bold">
                                    {userOwes ? (
                                        <>
                                            <span className="text-red-400">Você deve</span>
                                            {/* Seta para baixo no mobile, direita no desktop */}
                                            <ArrowRight className="w-5 h-5 text-gray-500 hidden md:block"/>
                                            <ArrowDown className="w-5 h-5 text-gray-500 block md:hidden"/>
                                            <span className="text-white">{data.partner.username}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-white">{data.partner.username} deve</span>
                                            <ArrowRight className="w-5 h-5 text-gray-500 hidden md:block"/>
                                            <ArrowDown className="w-5 h-5 text-gray-500 block md:hidden"/>
                                            <span className="text-green-400">Você</span>
                                        </>
                                    )}
                                </div>
                                <p className={`text-3xl font-black mt-2 ${userOwes ? 'text-red-500' : 'text-green-500'}`}>
                                    {renderValue(settlementAmount)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Coluna 3: Parceiro Pagou */}
                    <div className="text-center flex-1 w-full md:w-auto bg-slate-900/30 p-3 rounded-lg md:bg-transparent">
                        <p className="text-xs text-gray-400 uppercase font-bold">{data.partner.username} Pagou</p>
                        <p className="text-xl font-bold text-white">{renderValue(settlement.total_paid_by_partner || 0)}</p>
                    </div>
                </div>
            </div>

            {/* ======================= DASHBOARD COMBINADO ======================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet className="w-24 h-24" /></div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Ativos Totais (Casal)</h3>
                    <p className="text-3xl font-bold text-white">{renderValue(data.combined.total_assets)}</p>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CreditCard className="w-24 h-24" /></div>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Dívidas Totais</h3>
                    <p className="text-3xl font-bold text-red-400">{renderValue(data.combined.total_liabilities)}</p>
                </div>

                <div className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 p-6 rounded-2xl border border-pink-500/30 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Heart className="w-24 h-24 text-pink-500" /></div>
                    <h3 className="text-pink-200 text-sm uppercase tracking-wider mb-2">Patrimônio Líquido Casal</h3>
                    <p className="text-4xl font-bold text-white">{renderValue(data.combined.net_worth)}</p>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-slate-700 shadow-lg h-80">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400"/> Evolução Patrimonial Combinada
                </h3>
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 10, right: 30, left: -5, bottom: 14 }}>
                            <defs>
                                <linearGradient id="colorCouple" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="dateStr" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={30} />
                            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(val) => privacyMode ? '•••' : `R$${(val/1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="valor_total_bruto" stroke="#ec4899" fillOpacity={1} fill="url(#colorCouple)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">Sem histórico suficiente ainda.</div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-2xl border border-slate-700 h-80 shadow-lg">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-blue-400"/> Contribuição no Patrimônio
                    </h3>
                    <ResponsiveContainer width="99%" height="90%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Você', value: data.user.net_worth },
                                    { name: data.partner.username, value: data.partner.net_worth }
                                ]}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data && [0, 1].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_CONTRIBUTION[index % COLORS_CONTRIBUTION.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" iconType="circle"/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-slate-700 h-80 shadow-lg">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-400"/> Diversificação Global
                    </h3>
                    {allocationChartData.length > 0 ? (
                        <ResponsiveContainer width="99%" height="90%">
                            <PieChart>
                                <Pie
                                    data={allocationChartData}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {allocationChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_ALLOCATION[index % COLORS_ALLOCATION.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">Sem dados de ativos.</div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ======================= MODAIS ======================= */}

      {/* MODAL SIMULAÇÃO */}
      {showSimModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-surface p-6 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowSimModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2"><Calculator className="text-pink-500 w-6 h-6"/> Projetar Futuro Juntos</h2>
                <p className="text-gray-400 text-sm mb-4">Simule o crescimento do patrimônio combinado.</p>
                
                {!simResult ? (
                    <form onSubmit={handleSimulate} className="space-y-4 mt-4">
                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mb-4">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Patrimônio Inicial (Combinado)</p>
                            <p className="text-2xl font-bold text-white">{renderValue(data?.combined.net_worth)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-300 font-medium block mb-1">Seu Aporte (R$)</label>
                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none" value={simForm.aporte_user} onChange={e => setSimForm({...simForm,aporte_user:e.target.value})} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 font-medium block mb-1">Aporte Parceiro(a)</label>
                                <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none" value={simForm.aporte_partner} onChange={e => setSimForm({...simForm,aporte_partner:e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-300 font-medium block mb-1">Tempo (Anos)</label>
                                <input type="number" min="1" max="50" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none" value={simForm.anos} onChange={e => setSimForm({...simForm,anos:e.target.value})} />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 font-medium block mb-1">Taxa Anual (%)</label>
                                <input type="number" step="0.1" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none" value={simForm.taxa} onChange={e => setSimForm({...simForm,taxa:e.target.value})} />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded text-center text-sm text-gray-400">
                            Aporte mensal conjunto: <span className="text-white font-bold">R$ {(parseFloat(simForm.aporte_user || 0) + parseFloat(simForm.aporte_partner || 0)).toLocaleString('pt-BR')}</span>
                        </div>
                        <button type="submit" disabled={simLoading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-colors mt-2">
                            {simLoading ? 'Calculando...' : 'Simular'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6 mt-4 animate-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700"><p className="text-xs text-gray-500 uppercase">Investido</p><p className="text-lg font-bold text-white">R$ {simResult.total_investido.toLocaleString('pt-BR')}</p></div>
                            <div className="bg-slate-900 p-4 rounded-lg border border-pink-500/30 bg-pink-900/10"><p className="text-xs text-pink-300 uppercase">Patrimônio Final</p><p className="text-lg font-bold text-white">R$ {simResult.valor_liquido.toLocaleString('pt-BR')}</p></div>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={simResult.projecao_mensal.filter((_, i) => i % 12 === 0)}><defs><linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/><stop offset="95%" stopColor="#ec4899" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="mes" stroke="#94a3b8" tickFormatter={(v) => `${v/12}a`} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} formatter={(val) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`} labelFormatter={(v) => `Ano ${v/12}`} /><Area type="monotone" dataKey="patrimonio_liquido" stroke="#ec4899" fillOpacity={1} fill="url(#colorSim)" strokeWidth={3} /></AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <button onClick={() => setSimResult(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors">Nova Simulação</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* MODAL METAS */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-surface p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowGoalModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    {goalForm.id ? <Pencil className="w-5 h-5 text-emerald-400"/> : <Plus className="w-5 h-5 text-emerald-400"/>} 
                    {goalForm.id ? 'Editar Meta' : 'Nova Meta'}
                </h2>
                
                <form onSubmit={handleSaveGoal} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Nome do Objetivo</label>
                        <input required placeholder="Ex: Viagem Japão" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={goalForm.nome} onChange={e => setGoalForm({...goalForm,nome:e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Valor Alvo (R$)</label>
                            <input required type="number" step="0.01" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={goalForm.valor_alvo} onChange={e => setGoalForm({...goalForm,valor_alvo:e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Valor Atual (R$)</label>
                            <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={goalForm.valor_atual} onChange={e => setGoalForm({...goalForm,valor_atual:e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Data Limite</label>
                            <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-emerald-500" value={goalForm.data_limite} onChange={e => setGoalForm({...goalForm,data_limite:e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Cor do Card</label>
                            <div className="flex gap-2 mt-2">
                                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(color => (
                                    <button 
                                        key={color} 
                                        type="button" 
                                        onClick={() => setGoalForm({...goalForm,cor:color})}
                                        className={`w-6 h-6 rounded-full border-2 ${goalForm.cor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{backgroundColor:color}}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors mt-2 shadow-lg shadow-emerald-900/20">Salvar Meta</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}