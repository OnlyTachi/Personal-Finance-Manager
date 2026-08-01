import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, HelpCircle, TrendingUp, DollarSign, Calculator,
  CreditCard, Activity, RefreshCw, FileText, Bot, Info,
  Trophy, Heart, Sparkles, UserPlus, Shield,
  AlertTriangle, BookOpen, Terminal, Coins, Lock,
  Unlock, Upload, ChevronRight, Menu, X, Share2, Target,
  Calendar, PieChart, Wallet, Zap, Layers,
  GraduationCap, Flame, CheckCircle2, Crown, ArrowRight,
  Search, ExternalLink, Bookmark
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ==========================================
// 🎨 MICRO-DESIGN SYSTEM APRIMORADO
// ==========================================

const SectionTitle = ({ icon: Icon, title, subtitle, color = "text-blue-400", bgColor = "bg-blue-500/10" }) => (
  <div className="mb-10 pb-8 border-b border-slate-800/60 flex flex-col md:flex-row md:items-start gap-6 group">
    <div className={`p-4 rounded-3xl ${bgColor} border border-white/5 shadow-2xl shadow-black/50 ring-1 ring-white/10 w-fit transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
      <Icon className={`w-10 h-10 ${color}`} strokeWidth={1.5} />
    </div>
    <div className="flex-1">
      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-400 text-lg mt-3 font-medium leading-relaxed max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const TipBox = ({ title, children, type = "info" }) => {
  const styles = {
    info: { bg: "bg-blue-950/20", border: "border-blue-500/20", iconColor: "text-blue-400", Icon: Info, glow: "shadow-blue-500/5" },
    warning: { bg: "bg-amber-950/20", border: "border-amber-500/20", iconColor: "text-amber-400", Icon: AlertTriangle, glow: "shadow-amber-500/5" },
    success: { bg: "bg-emerald-950/20", border: "border-emerald-500/20", iconColor: "text-emerald-400", Icon: CheckCircle2, glow: "shadow-emerald-500/5" },
    pro: { bg: "bg-purple-950/20", border: "border-purple-500/20", iconColor: "text-purple-400", Icon: Crown, glow: "shadow-purple-500/5" },
    danger: { bg: "bg-red-950/20", border: "border-red-500/20", iconColor: "text-red-400", Icon: Flame, glow: "shadow-red-500/5" },
  };

  const s = styles[type] || styles.info;
  const IconComponent = s.Icon;

  return (
    <div className={`${s.bg} border ${s.border} p-6 rounded-2xl flex flex-col sm:flex-row gap-5 my-8 relative overflow-hidden group hover:border-opacity-40 transition-all duration-300 shadow-lg ${s.glow}`}>
      <div className={`absolute top-0 right-0 p-20 ${s.bg.replace('/20', '/5')} blur-3xl rounded-full -mr-10 -mt-10 transition-all group-hover:scale-150`}></div>

      <div className="shrink-0">
        <div className={`p-3 rounded-xl bg-[#0f172a] border border-white/5 shadow-inner w-fit`}>
          <IconComponent className={`w-6 h-6 ${s.iconColor}`} />
        </div>
      </div>

      <div className="flex-1 z-10">
        <div className="flex items-center gap-3 mb-2">
          <h4 className={`font-bold ${s.iconColor} text-sm uppercase tracking-widest`}>
            {title}
          </h4>
          {type === 'pro' && (
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold shadow-lg shadow-purple-900/50">
              PRO
            </span>
          )}
        </div>
        <div className="text-slate-300 leading-relaxed text-base font-light">
          {children}
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, tags = [] }) => (
  <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 hover:border-blue-500/40 hover:bg-slate-800/80 transition-all duration-300 group cursor-default h-full flex flex-col shadow-lg relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

    <div className="flex justify-between items-start mb-5">
      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 group-hover:border-slate-600 transition-colors shadow-inner">
        <Icon className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" strokeWidth={1.5} />
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        {tags.map((tag, i) => (
          <span key={i} className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-500 tracking-wide">
            {tag}
          </span>
        ))}
      </div>
    </div>

    <h3 className="font-bold text-white text-lg mb-3 group-hover:text-blue-100 transition-colors leading-tight">
      {title}
    </h3>
    <p className="text-sm text-slate-400 leading-relaxed flex-1 opacity-90">
      {description}
    </p>
  </div>
);

const ChatBubble = ({ sender, text, time, type = "sent" }) => (
  <div className={`flex flex-col ${type === 'sent' ? 'items-end' : 'items-start'} mb-4 animate-in slide-in-from-bottom-2 fade-in duration-500`}>
    <div className={`max-w-[85%] p-4 rounded-2xl text-sm relative shadow-md backdrop-blur-sm ${type === 'sent'
      ? 'bg-blue-600 text-white rounded-br-none shadow-blue-900/20'
      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700 shadow-slate-900/50'
      }`}>
      <p className="leading-snug whitespace-pre-line" dangerouslySetInnerHTML={{ __html: text }} />
      <span className={`text-[10px] block mt-2 text-right font-medium opacity-80 ${type === 'sent' ? 'text-blue-100' : 'text-slate-500'}`}>
        {time}
        {type === 'sent' && <span className="ml-1 opacity-100">✓✓</span>}
      </span>
    </div>
    <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-bold tracking-wide uppercase opacity-60">
      {sender}
    </span>
  </div>
);

const StepByStep = ({ steps }) => (
  <div className="relative pl-8 border-l-2 border-slate-800 ml-4 my-12 space-y-10">
    {steps.map((step, idx) => (
      <div key={idx} className="relative group">
        <div className="absolute -left-[41px] top-0 w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-blue-500 group-hover:text-blue-400 text-slate-500 flex items-center justify-center font-bold text-sm transition-all z-10 shadow-[0_0_0_4px_#0f172a]">
          {idx + 1}
        </div>
        <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 hover:border-slate-600/50 transition-colors hover:bg-slate-800/30">
          <h4 className="font-bold text-white mb-2 text-lg group-hover:text-blue-400 transition-colors flex items-center gap-2">
            {step.title}
          </h4>
          <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
        </div>
      </div>
    ))}
  </div>
);

const MathFormula = ({ title, formula, explanation, variables }) => (
  <div className="bg-[#0b1120] p-8 rounded-2xl border border-slate-800 my-10 shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

    <div className="flex items-center gap-3 mb-6 relative z-10">
      <div className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-pink-500 shadow-sm">
        <Calculator className="w-5 h-5" />
      </div>
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{title}</span>
    </div>

    <div className="text-center py-8 px-4 bg-[#0f172a] rounded-xl border border-slate-700/50 mb-8 font-mono text-lg md:text-xl text-emerald-400 overflow-x-auto shadow-inner relative z-10 mx-auto w-full">
      {formula}
    </div>

    <div className="space-y-5 relative z-10">
      <p className="text-sm text-slate-300 italic text-center border-b border-slate-800 pb-5 px-4">
        "{explanation}"
      </p>
      {variables && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 pt-2">
          {variables.map((v, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
              <span className="font-mono text-pink-400 font-bold bg-pink-950/30 px-2 py-0.5 rounded text-[10px]">{v.k}</span>
              <span className="text-slate-300">{v.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const FeaturePreview = ({ icon: Icon, title, description, badge, details }) => (
  <div className="relative group perspective-1000 h-full">
    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-300 cursor-help h-full flex flex-col transform">
      <div className="flex justify-between items-start mb-4">
        <Icon className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
        {badge && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${badge === 'Novo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              badge === 'Beta' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
            {badge}
          </span>
        )}
      </div>

      <h4 className="font-bold text-white text-lg mb-2 group-hover:text-blue-200 transition-colors">{title}</h4>
      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-4">{description}</p>

      <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center text-[10px] font-bold text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest gap-2">
        <Info className="w-3 h-3" /> Passe o mouse para detalhes
      </div>
    </div>

    {/* Tooltip Avançado */}
    <div className="absolute z-50 w-80 p-6 bg-[#0f172a] border border-slate-600 rounded-xl shadow-2xl opacity-0 translate-y-4 invisible group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 bottom-[calc(100%+1rem)] left-1/2 -translate-x-1/2 pointer-events-none ring-1 ring-white/10">
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-b border-r border-slate-600 transform rotate-45"></div>

      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700/80">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span className="font-bold text-white text-sm">Como Funciona</span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {description}
      </p>

      {details && (
        <ul className="space-y-2">
          {details.map((d, i) => (
            <li key={i} className="text-[11px] text-slate-400 flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

const SECTIONS = [
  { id: 'visao-geral', label: '1. Visão Geral', icon: Activity },
  { id: 'ativos', label: '2. Investimentos', icon: TrendingUp },
  { id: 'passivos', label: '3. Gestão de Dívidas', icon: CreditCard },
  { id: 'caixa', label: '4. Fluxo de Caixa', icon: DollarSign },
  { id: 'importacao', label: '5. Importação', icon: Upload },
  { id: 'calculadoras', label: '6. Ferramentas', icon: Calculator },
  { id: 'gamificacao', label: '7. Conquistas', icon: Trophy },
  { id: 'casal', label: '8. Modo Casal', icon: Heart },
  { id: 'automacao', label: '9. Bastidores', icon: RefreshCw },
  { id: 'faq', label: '10. FAQ', icon: HelpCircle },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('visao-geral');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Scroll Spy Logic
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden !scroll-smooth">

      {/* HEADER MOBILE */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0f172a]/90 backdrop-blur-xl border-b border-slate-800 z-50 flex items-center justify-between px-4 shadow-lg transition-all">
        <Link to="/dashboard" className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-white flex items-center gap-2 text-sm tracking-wide">
          <BookOpen className="w-4 h-4 text-blue-500" /> CENTRAL DE AJUDA
        </span>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors focus:ring-2 focus:ring-blue-500/50 outline-none"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex pt-16 lg:pt-0 relative">

        {/* SIDEBAR NAVEGAÇÃO - FIXA EM DESKTOP */}
        <aside className={`
          fixed inset-y-0 left-0 w-72 bg-[#0f172a] border-r border-slate-800 z-40 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-80 shrink-0 flex flex-col pt-4 lg:pt-0 shadow-2xl lg:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Header Sidebar */}
          <div className="p-6 lg:p-8 shrink-0 bg-[#0f172a] z-10">
            <div className="hidden lg:flex items-center gap-3 mb-8 pb-6 border-b border-slate-800/60">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-blue-900/30 ring-1 ring-white/10">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg leading-tight tracking-tight">Central de Ajuda</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Versão 2.1.0 (Stable)</p>
              </div>
            </div>

            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-all group text-sm font-bold shadow-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Dashboard
            </Link>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar tópico..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
                disabled
              />
              <span className="absolute right-2 top-2 text-[10px] bg-slate-800 px-1.5 rounded text-slate-500 border border-slate-700">⌘K</span>
            </div>

            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 mt-6 mb-2">Tópicos</div>
          </div>

          {/* Lista de Tópicos Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-8 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left group relative overflow-hidden ${activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-500'
                  : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
                  }`}
              >
                <section.icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${activeSection === section.id ? 'scale-110 text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="truncate tracking-tight">{section.label.split('. ')[1]}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-100 animate-in slide-in-from-left-2 fade-in" />
                )}
              </button>
            ))}

            {/* Atalhos */}
            <div className="pt-6 mt-4 px-2">
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                <h5 className="text-white font-bold text-[10px] mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Terminal className="w-3 h-3 text-emerald-400" /> Cheat Sheet
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800/50 last:border-0">
                    <span className="text-slate-400">Telegram Bot</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono border border-slate-700 text-[10px]">/start</kbd>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800/50 last:border-0">
                    <span className="text-slate-400">Novo Registro</span>
                    <kbd className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono border border-slate-700 text-[10px]">N</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay Mobile */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* MAIN CONTENT - MARGEM ESQUERDA PARA COMPENSAR SIDEBAR FIXA */}
        <main className="flex-1 min-w-0 bg-[#0f172a] lg:ml-80">
          <div className="px-4 py-8 lg:px-16 lg:py-16 pb-32 max-w-7xl mx-auto">

            {/* HERO BANNER */}
            <div className="relative mb-24 p-8 md:p-14 rounded-[2rem] bg-gradient-to-r from-slate-900 via-[#0f172a] to-blue-950/20 border border-white/5 overflow-hidden shadow-2xl ring-1 ring-white/5 group">
              <div className="absolute top-0 right-0 p-40 bg-blue-500/10 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none transition-opacity group-hover:opacity-70"></div>
              <div className="absolute bottom-0 left-0 p-32 bg-purple-500/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-widest mb-6 hover:bg-blue-500/20 transition-colors cursor-default">
                    <Sparkles className="w-3 h-3" /> Documentação Oficial v2.1
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                    Domine suas <br />
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Finanças Pessoais</span>
                  </h1>
                  <p className="text-lg text-slate-400 leading-relaxed">
                    Bem-vindo à central de conhecimento do seu gerenciador financeiro.
                    Aqui você aprenderá não apenas como usar o sistema, mas a filosofia matemática
                    e contábil por trás de cada cálculo de rentabilidade, imposto e projeção.
                  </p>

                  <div className="flex gap-4 mt-8">
                    <button onClick={() => scrollTo('visao-geral')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
                      Começar Leitura <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => scrollTo('faq')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all">
                      Ir para FAQ
                    </button>
                  </div>
                </div>

                {/* Card Flutuante Decorativo */}
                <div className="hidden xl:block relative transform rotate-6 hover:rotate-0 transition-all duration-500">
                  <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-6 rounded-2xl w-64 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Patrimônio</div>
                        <div className="text-lg font-bold text-white">R$ 124.500</div>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[70%]"></div>
                    </div>
                    <div className="mt-3 text-[10px] text-emerald-400 font-bold">+12% este mês</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================= 1. VISÃO GERAL ======================= */}
            <section id="visao-geral" className="scroll-mt-32 animate-in fade-in slide-in-from-bottom-8 duration-700 mb-24">
              <SectionTitle icon={Activity} title="Dashboard & Filosofia" subtitle="A verdade nua e crua sobre seu patrimônio líquido" />

              <div className="prose prose-invert prose-lg max-w-none text-slate-300 space-y-8">
                <p>
                  A maioria dos aplicativos financeiros comete um erro fatal: eles mostram apenas o lado bom (Ativos).
                  Nosso sistema foi desenhado com a filosofia contábil de <strong>"Balanço Patrimonial Real"</strong>.
                  Isso significa que para saber quanto você realmente tem, precisamos subtrair rigorosamente o que você deve.
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-12">
                  <div className="bg-slate-900/40 p-8 rounded-3xl border-t-4 border-emerald-500 shadow-xl backdrop-blur-sm hover:translate-y-[-5px] transition-transform duration-300">
                    <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Ativos</h3>
                    <div className="text-4xl font-black text-white mb-3 tracking-tighter">Positivo</div>
                    <p className="text-sm text-slate-400 leading-relaxed font-light">
                      Dinheiro em conta, investimentos, imóveis e criptomoedas. Tudo que coloca dinheiro no seu bolso.
                    </p>
                  </div>

                  <div className="bg-slate-900/40 p-8 rounded-3xl border-t-4 border-red-500 shadow-xl backdrop-blur-sm hover:translate-y-[-5px] transition-transform duration-300">
                    <h3 className="text-red-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Passivos</h3>
                    <div className="text-4xl font-black text-white mb-3 tracking-tighter">Negativo</div>
                    <p className="text-sm text-slate-400 leading-relaxed font-light">
                      Saldo devedor de financiamentos, empréstimos e todas as parcelas futuras no cartão de crédito.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-3xl border-t-4 border-blue-500 shadow-2xl relative overflow-hidden ring-1 ring-blue-500/20 hover:translate-y-[-5px] transition-transform duration-300">
                    <div className="absolute -right-10 -top-10 p-20 bg-blue-600/10 blur-3xl rounded-full"></div>
                    <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Resultado</h3>
                    <div className="text-4xl font-black text-white mb-3 tracking-tighter">Líquido</div>
                    <p className="text-sm text-slate-400 leading-relaxed relative z-10 font-light">
                      A métrica definitiva. <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-200 font-mono text-xs">Ativos - Passivos</code>. É o valor que sobraria se você liquidasse tudo hoje.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-auto items-stretch">
                  <FeaturePreview
                    icon={TrendingUp}
                    title="Atualização em Tempo Real"
                    description="O Dashboard se conecta a APIs externas para atualizar o valor dos seus ativos (Bolsa e Criptomoedas) a cada 15 minutos, garantindo precisão."
                    badge="Live"
                    details={['Cotações B3 via Yahoo Finance', 'Criptomoedas via CoinGecko', 'Taxa Selic/CDI via Banco Central']}
                  />
                  <FeaturePreview
                    icon={PieChart}
                    title="Alocação Inteligente"
                    description="Gráficos automáticos mostram se você está muito exposto em uma categoria específica (ex: 90% em Cripto) para ajudar no rebalanceamento de carteira."
                    badge="Auto"
                    details={['Gráfico de Rosca Interativo', 'Divisão por Classe de Ativo', 'Alertas de Diversificação']}
                  />
                </div>

                <TipBox title="Mentalidade de Investidor" type="pro">
                  Se o seu Patrimônio Líquido for <strong>negativo</strong> (comum ao financiar um imóvel recentemente), não desanime.
                  O jogo financeiro consiste em transformar essa curva ao longo dos anos. Use a aba "Passivos" para criar um plano de amortização agressivo.
                </TipBox>
              </div>
            </section>

            {/* ======================= 2. ATIVOS ======================= */}
            <section id="ativos" className="scroll-mt-32 mb-24">
              <SectionTitle icon={TrendingUp} title="Gestão de Investimentos" subtitle="O motor de crescimento do seu capital" color="text-emerald-400" bgColor="bg-emerald-500/10" />

              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                  <p className="text-slate-300 text-lg leading-relaxed">
                    O sistema suporta três classes principais de ativos, cada uma com uma lógica de atualização de preço específica e rigorosa.
                  </p>

                  <div className="grid gap-6">
                    <FeatureCard
                      icon={TrendingUp}
                      title="Renda Fixa (Pós-Fixada)"
                      description="Ideal para CDBs, LCIs e LCAs atrelados ao CDI. O sistema consulta a taxa Selic/CDI oficial do Banco Central diariamente e aplica a correção pro-rata dia útil automaticamente."
                      tags={['API BCB', 'Taxa Diária']}
                    />
                    <FeatureCard
                      icon={Activity}
                      title="Renda Variável (B3 & USA)"
                      description="Ações, FIIs, ETFs e Stocks. Cotações atualizadas via Yahoo Finance. Basta inserir o ticker correto (ex: WEGE3.SA, AAPL) para rastreamento."
                      tags={['Delay 15min', 'Yahoo Finance']}
                    />
                    <FeatureCard
                      icon={Lock}
                      title="Criptomoedas"
                      description="Integração nativa com a API da CoinGecko. Use o ID da moeda (ex: bitcoin, ethereum) para ter cotação 24/7 em tempo real convertida para BRL."
                      tags={['CoinGecko', '24/7']}
                    />
                  </div>
                </div>

                {/* Explicação Técnica do FIFO */}
                <div className="lg:col-span-5 h-full">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative h-full flex flex-col shadow-2xl">
                    <div className="absolute -top-3 -right-3 bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 shadow-emerald-900/20 shadow-lg backdrop-blur">
                      Engine Interna
                    </div>

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <Layers className="w-6 h-6 text-emerald-500" /> O Segredo: FIFO
                    </h3>

                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                      Para calcular o Imposto de Renda (IR) regressivo corretamente, o sistema não olha apenas para o montante total. Ele rastreia cada aporte individualmente (Lotes), usando o método <em>First-In, First-Out</em>.
                    </p>

                    <div className="space-y-4 font-mono text-xs mb-8 bg-[#0b1120] p-5 rounded-2xl border border-slate-800 shadow-inner">
                      <div className="flex items-center gap-4 opacity-40 line-through">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                        <span className="text-slate-500">Jan 2022: R$ 1.000 (Sacado)</span>
                      </div>
                      <div className="flex items-center gap-4 p-2 bg-emerald-500/5 rounded border border-emerald-500/20">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                        <span className="text-emerald-400 font-bold">Mar 2023: R$ 500 (Ativo - 17.5% IR)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        <span className="text-blue-400">Hoje: R$ 200 (Ativo - 22.5% IR)</span>
                      </div>
                    </div>

                    <div className="mt-auto p-5 bg-gradient-to-br from-emerald-950/30 to-slate-900 rounded-2xl border border-emerald-500/20 text-sm text-slate-300 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-2xl rounded-full -mt-10 -mr-10"></div>
                      <span className="text-emerald-400 font-bold block mb-2 text-xs uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> Cenário de Saque
                      </span>
                      Se você sacar R$ 600 agora, o sistema retirará todos os R$ 500 de Mar/23 (menor imposto) e apenas R$ 100 do aporte de Hoje (maior imposto), otimizando sua tributação automaticamente.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================= 3. PASSIVOS ======================= */}
            <section id="passivos" className="scroll-mt-32 mb-24">
              <SectionTitle icon={CreditCard} title="Gestão de Dívidas" subtitle="Controle rigoroso para amortização eficiente" color="text-red-400" bgColor="bg-red-500/10" />

              <div className="flex flex-col md:flex-row gap-12 items-start">
                <div className="flex-1">
                  <TipBox title="Atenção ao Saldo Devedor" type="warning">
                    O sistema projeta as parcelas futuras para cálculo de fluxo de caixa, mas <strong>não baixa o saldo devedor automaticamente</strong>.
                    Isso é intencional: amortizações extraordinárias mudam a curva de juros composta. Você deve atualizar o saldo manualmente no card da dívida.
                  </TipBox>

                  <StepByStep steps={[
                    { title: "Cadastro Inicial", desc: "Informe o valor total original da dívida, a taxa de juros (apenas informativo para projeção) e o prazo em meses." },
                    { title: "Geração do Cronograma", desc: "O sistema criará automaticamente uma lista de pagamentos pendentes (Parcelas) baseada no prazo informado." },
                    { title: "Baixa Mensal", desc: "Ao pagar uma fatura na vida real, vá na aba 'Parcelas' da dívida e marque como 'Paga'. Isso serve para seu controle de fluxo e histórico." },
                    { title: "Correção de Saldo", desc: "A cada pagamento ou amortização extra, edite o campo 'Saldo Devedor' no topo da página para refletir o valor exato que consta no app do banco." }
                  ]} />
                </div>

                <div className="w-full md:w-[26rem] shrink-0 mt-8 md:mt-0 sticky top-32">
                  <div className="bg-slate-800 p-8 rounded-[2rem] border border-red-500/20 shadow-2xl relative overflow-hidden group hover:border-red-500/40 transition-colors">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div>
                        <h4 className="text-white font-bold text-xl tracking-tight">Casa Própria</h4>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Caixa Econômica • 9.5% a.a.</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-xl text-red-400 shadow-inner ring-1 ring-red-500/20">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div>
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-slate-400 font-medium">Saldo Restante</span>
                          <span className="text-white font-bold font-mono text-lg">R$ 184.500,00</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden shadow-inner border border-slate-700/50">
                          <div className="h-full bg-gradient-to-r from-red-600 to-red-400 w-[65%] rounded-full shadow-[0_0_15px_rgba(248,113,113,0.4)] relative">
                            <div className="absolute top-0 right-0 w-1 h-full bg-white/20"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-mono uppercase tracking-wide font-bold">
                          <span>35% Pago</span>
                          <span>240 Meses Restantes</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-center">
                          <span className="text-[10px] text-slate-500 uppercase block mb-1 font-bold tracking-wider">Próxima Parcela</span>
                          <span className="text-white font-bold text-lg">R$ 1.850</span>
                        </div>
                        <button className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-900/20 hover:shadow-red-900/40 flex flex-col items-center justify-center gap-1">
                          <span>Gerenciar</span>
                          <span className="opacity-60 text-[9px] font-normal">Amortizar / Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================= 4. FLUXO DE CAIXA ======================= */}
            <section id="caixa" className="scroll-mt-32 mb-24">
              <SectionTitle icon={DollarSign} title="Fluxo de Caixa & IA" subtitle="Automação extrema para preguiçosos produtivos" color="text-purple-400" bgColor="bg-purple-500/10" />

              <div className="grid lg:grid-cols-2 gap-16 items-start">

                {/* TELEGRAM BOT DEMO */}
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-500/20 rounded-2xl ring-1 ring-blue-500/30">
                      <Bot className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">O Bot do Telegram</h3>
                      <p className="text-slate-400 text-sm mt-1">Seu contador pessoal de bolso, disponível 24/7.</p>
                    </div>
                  </div>

                  <div className="bg-[#0e1621] border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl max-w-sm mx-auto lg:mx-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

                    {/* Telegram Header */}
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-4 mb-6 relative z-10">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">FB</div>
                      <div>
                        <div className="text-white font-bold text-base">FinanceBot</div>
                        <div className="text-blue-400 text-xs font-medium">online • bot</div>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10 min-h-[300px]">
                      <ChatBubble sender="Você" text="15.90 Padaria da Esquina" time="08:42" type="sent" />
                      <ChatBubble
                        sender="FinanceBot"
                        text={`✅ <b>Registrado com Sucesso!</b><br/><br/>📂 Categoria: <b>Alimentação</b><br/>💰 Valor: R$ 15,90`}
                        time="08:42"
                        type="received"
                      />
                      <ChatBubble sender="Você" text="Quanto gastei com Uber esse mês?" time="14:10" type="sent" />
                      <ChatBubble
                        sender="FinanceBot"
                        text={`📊 <b>Análise Rápida:</b><br/><br/>🚗 Transporte (Setembro):<br/><b>R$ 245,50</b> em 12 corridas.`}
                        time="14:10"
                        type="received"
                      />
                    </div>

                    {/* Input Fake */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="h-9 flex-1 bg-slate-900 rounded-2xl border border-slate-800 px-3 text-xs text-slate-500 flex items-center">
                        Mensagem...
                      </div>
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
                    <h4 className="font-bold text-white text-xs uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-purple-400" /> Comandos de Poder
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-400 font-mono">
                      <li className="flex gap-3 items-center">
                        <span className="text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20">Valor Descrição</span>
                        <span className="opacity-80">Registro rápido (Ex: "50 Gasolina")</span>
                      </li>
                      <li className="flex gap-3 items-center">
                        <span className="text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20">/resumo</span>
                        <span className="opacity-80">Saldo e gastos do mês atual</span>
                      </li>
                      <li className="flex gap-3 items-center">
                        <span className="text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded border border-purple-500/20">[FOTO]</span>
                        <span className="opacity-80">Envie foto da nota fiscal (OCR + IA)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* IA EXPLAINER */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-purple-400" /> Categorizador Neural
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-lg">
                      Nosso motor de IA não usa apenas regras fixas ("Se tem Uber é Transporte"). Ele utiliza <strong>Aprendizado Few-Shot</strong>.
                      Ele analisa seu histórico passado para entender como <em>VOCÊ</em> prefere categorizar as coisas.
                    </p>
                  </div>

                  <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-grid-slate-700/[0.1] -z-10"></div>

                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Input do Usuário</span>
                      <span className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">Predição da IA</span>
                    </div>

                    {[
                      { in: "Mcdonalds Drive Thru", out: "Alimentação", conf: "99%" },
                      { in: "Pgto Eletropaulo", out: "Moradia & Contas", conf: "95%" },
                      { in: "Steam Games", out: "Lazer & Assinaturas", conf: "98%" },
                      { in: "Drogasil S/A", out: "Saúde", conf: "92%" },
                      { in: "Pix enviado Jose Silva", out: "Transferências", conf: "80%" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between group hover:bg-slate-800/80 p-3 rounded-xl transition-all border border-transparent hover:border-slate-700/50">
                        <span className="text-slate-200 text-sm font-medium pl-2">{item.in}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">{item.conf}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-300 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm font-medium min-w-[120px] text-center">
                            {item.out}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <TipBox title="Treinamento Contínuo" type="success">
                    Se a IA errar, basta editar a categoria manualmente no Dashboard <strong>uma única vez</strong>.
                    O sistema aprenderá com a correção e aplicará o novo padrão automaticamente nas próximas transações similares.
                  </TipBox>
                </div>
              </div>
            </section>

            {/* ======================= 5. IMPORTAÇÃO ======================= */}
            <section id="importacao" className="scroll-mt-32 mb-24">
              <SectionTitle icon={Upload} title="Central de Importação" subtitle="Integração massiva de dados sem dor de cabeça" color="text-yellow-400" bgColor="bg-yellow-500/10" />

              <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 lg:p-14 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-transparent"></div>

                <div className="grid md:grid-cols-3 gap-10 text-center">
                  <div className="group bg-slate-900/50 p-6 rounded-2xl border border-transparent hover:border-yellow-500/20 transition-all">
                    <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl border border-slate-700 group-hover:border-yellow-500/50 group-hover:shadow-yellow-900/20">
                      <FileText className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h4 className="font-bold text-white text-lg mb-2">OFX Bancário</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Padrão Ouro. Exporte o arquivo .ofx do seu Internet Banking e arraste pra cá. O sistema detecta duplicatas automaticamente.
                    </p>
                  </div>

                  <div className="group bg-slate-900/50 p-6 rounded-2xl border border-transparent hover:border-green-500/20 transition-all">
                    <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl border border-slate-700 group-hover:border-green-500/50 group-hover:shadow-green-900/20">
                      <div className="relative">
                        <FileText className="w-10 h-10 text-green-500" />
                        <div className="absolute -bottom-2 -right-2 bg-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded border border-green-500 text-green-500 uppercase">CSV</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-lg mb-2">Excel / CSV</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Para quem ama planilhas. O sistema possui um "Mapeador de Colunas" inteligente para entender qualquer formato de tabela.
                    </p>
                  </div>

                  <div className="group bg-slate-900/50 p-6 rounded-2xl border border-transparent hover:border-red-500/20 transition-all">
                    <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl border border-slate-700 group-hover:border-red-500/50 group-hover:shadow-red-900/20">
                      <div className="relative">
                        <FileText className="w-10 h-10 text-red-500" />
                        <div className="absolute -bottom-2 -right-2 bg-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-500 text-red-500 uppercase">PDF</div>
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-lg mb-2">Fatura PDF</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Leitor avançado de faturas de cartão (Nubank, Inter, XP). Extrai data, estabelecimento e valor diretamente do PDF.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================= 6. CALCULADORAS ======================= */}
            <section id="calculadoras" className="scroll-mt-32 mb-24">
              <SectionTitle icon={Calculator} title="Engenharia Financeira" subtitle="A matemática jogando a favor do seu bolso" color="text-pink-400" bgColor="bg-pink-500/10" />

              <div className="space-y-20">
                {/* Calculadora 1 */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 text-base font-bold ring-1 ring-pink-500/30">1</div>
                    Comparador Renda Fixa (CDB vs LCI)
                  </h3>
                  <p className="text-slate-400 mb-8 max-w-3xl leading-relaxed">
                    A dúvida eterna do investidor: "Um CDB de 115% do CDI (com imposto) é melhor que uma LCI de 95% (isenta)?".
                    Nossa calculadora resolve isso equalizando as taxas baseadas no prazo exato do investimento (Gross Up).
                  </p>
                  <MathFormula
                    title="Equivalência de Taxas"
                    formula="Taxa_LCI = Taxa_CDB × (1 - Alíquota_IR)"
                    explanation="A alíquota de IR varia de 22.5% (até 180 dias) a 15% (acima de 720 dias). O simulador ajusta a alíquota dinamicamente conforme o prazo escolhido no input."
                    variables={[
                      { k: 'Taxa_CDB', v: 'Rentabilidade Bruta' },
                      { k: 'Alíquota_IR', v: 'Imposto Regressivo (15% a 22.5%)' }
                    ]}
                  />
                </div>

                {/* Calculadora 2 */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 text-base font-bold ring-1 ring-pink-500/30">2</div>
                    Juros Compostos com Aportes
                  </h3>
                  <p className="text-slate-400 mb-8 max-w-3xl leading-relaxed">
                    A oitava maravilha do mundo. Veja a curva exponencial do seu patrimônio considerando não apenas o rendimento, mas a disciplina dos seus aportes mensais constantes.
                  </p>
                  <MathFormula
                    title="Valor Futuro (Série Uniforme)"
                    formula="VF = P(1+r)^t + PMT × [((1+r)^t - 1) / r]"
                    explanation="Fórmula clássica de anuidades antecipadas adaptada para aportes mensais."
                    variables={[
                      { k: 'P', v: 'Principal (Valor Inicial)' },
                      { k: 'PMT', v: 'Pagamento Mensal (Aporte)' },
                      { k: 'r', v: 'Taxa de Juros Mensal' },
                      { k: 't', v: 'Tempo em Meses' }
                    ]}
                  />
                </div>
              </div>
            </section>

            {/* ======================= 7. GAMIFICAÇÃO ======================= */}
            <section id="gamificacao" className="scroll-mt-32 mb-24">
              <SectionTitle icon={Trophy} title="Sistema de Conquistas" subtitle="Transformando disciplina em dopamina" color="text-yellow-400" bgColor="bg-yellow-500/10" />

              <div className="flex flex-col xl:flex-row gap-12 items-start">
                <div className="flex-1 space-y-8">
                  <p className="text-slate-300 text-lg leading-relaxed">
                    Investir a longo prazo pode ser entediante. O sistema analisa sua saúde financeira em tempo real (via background jobs) e desbloqueia medalhas e títulos conforme você evolui.
                  </p>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-6 border-b border-slate-800 pb-4 flex items-center gap-2">
                      <Crown className="w-4 h-4" /> Escada de Evolução
                    </h4>
                    <div className="space-y-6">
                      {[
                        { l: 'Novato Financeiro', c: '0 Conquistas', desc: 'Acabou de começar a jornada. Bem-vindo!', color: 'text-slate-500' },
                        { l: 'Poupador Aprendiz', c: '1-2 Conquistas', desc: 'Já tem o hábito de poupar mensalmente.', color: 'text-emerald-400' },
                        { l: 'Investidor Focado', c: '3-5 Conquistas', desc: 'Carteira diversificada e crescendo.', color: 'text-blue-400' },
                        { l: 'Mestre da Alocação', c: '6-7 Conquistas', desc: 'Domina todas as classes de ativos com maestria.', color: 'text-purple-400' },
                        { l: 'Lenda dos Dividendos', c: 'Todas as 8', desc: 'Liberdade financeira atingida. O jogo foi zerado.', color: 'text-yellow-400 font-black' },
                      ].map((level, idx) => (
                        <div key={idx} className="flex items-start gap-5 group">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 mt-1 transition-transform group-hover:scale-110 ${level.color.includes('yellow') ? 'border-yellow-500 bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'border-slate-700 bg-slate-800'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-bold text-base ${level.color}`}>{level.l}</span>
                              <span className="text-slate-600 text-[9px] font-bold uppercase bg-slate-950 px-2 py-1 rounded border border-slate-800">{level.c}</span>
                            </div>
                            <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{level.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full xl:w-auto grid grid-cols-1 md:grid-cols-2 gap-5 self-stretch">
                  <FeatureCard icon={Shield} title="Nome Limpo" description="Zero dívidas ativas cadastradas no sistema." tags={['Badge', 'Segurança']} />
                  <FeatureCard icon={UserPlus} title="Casal Unido" description="Conectar conta com um parceiro financeiro." tags={['Badge', 'Social']} />
                  <FeatureCard icon={Coins} title="Clube dos 100k" description="Patrimônio Líquido > R$ 100.000." tags={['Elite', 'Meta']} />
                  <FeatureCard icon={Share2} title="Diversificador" description="Possuir ativos em 3+ categorias diferentes." tags={['Badge', 'Estratégia']} />
                </div>
              </div>
            </section>

            {/* ======================= 8. MODO CASAL ======================= */}
            <section id="casal" className="scroll-mt-32 mb-24">
              <SectionTitle icon={Heart} title="Modo Casal (Finanças a Dois)" subtitle="Juntos no amor e na construção do patrimônio" color="text-pink-500" bgColor="bg-pink-500/10" />

              <div className="space-y-12">
                <div className="bg-gradient-to-r from-pink-900/20 via-purple-900/20 to-indigo-900/20 p-8 md:p-12 rounded-[2.5rem] border border-pink-500/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-pink-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                    <Target className="w-7 h-7 text-pink-400" /> Recurso "Acerto de Contas"
                  </h3>

                  <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-3xl relative z-10">
                    Inspirado no <em>Splitwise</em>. Quando você marca uma despesa como <strong>"Compartilhado"</strong> (via Bot ou Site), o sistema entende que aquela conta deve ser dividida 50/50.
                    No fim do mês, o Dashboard mostra quem deve a quem para equalizar os gastos domésticos, sem planilhas complexas.
                  </p>

                  {/* Visualização do Settlement */}
                  <div className="flex flex-col xl:flex-row gap-8 items-center bg-slate-950/60 p-8 rounded-3xl border border-pink-500/10 backdrop-blur-md relative z-10 w-full max-w-4xl mx-auto shadow-xl">
                    <div className="text-center w-full xl:w-auto">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Você pagou</div>
                      <div className="text-3xl font-black text-white tracking-tight">R$ 2.000</div>
                    </div>

                    <div className="hidden xl:block h-16 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>

                    <div className="text-center w-full xl:w-auto">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Amor pagou</div>
                      <div className="text-3xl font-black text-white tracking-tight">R$ 1.000</div>
                    </div>

                    <div className="xl:ml-auto w-full xl:w-auto bg-slate-900 p-6 rounded-2xl border border-slate-700 flex items-center justify-between xl:justify-start gap-6 shadow-inner ring-1 ring-white/5">
                      <div className="text-right">
                        <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-1">Resultado</div>
                        <div className="text-xs text-slate-400">Amor te deve</div>
                      </div>
                      <div className="text-3xl font-black text-emerald-400 tracking-tight">R$ 500</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-6 text-lg pl-2 border-l-4 border-pink-500">Privacidade e Segurança</h4>
                  <ul className="grid md:grid-cols-2 gap-6">
                    <li className="flex gap-5 bg-slate-800/40 p-6 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors">
                      <div className="p-3 bg-slate-900 rounded-xl h-fit border border-slate-700 shadow-sm">
                        <Lock className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white mb-2 text-base">Soberania dos Dados</h5>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          As contas permanecem individuais. Você só vê o total consolidado do parceiro se ele permitir a conexão explicitamente. Seus gastos pessoais continuam privados.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-5 bg-slate-800/40 p-6 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors">
                      <div className="p-3 bg-slate-900 rounded-xl h-fit border border-slate-700 shadow-sm">
                        <Unlock className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white mb-2 text-base">Kill Switch (Desconexão)</h5>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          A qualquer momento você pode desconectar a conta. O acesso aos seus dados é revogado instantaneamente para a outra parte.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ======================= 9. AUTOMAÇÃO ======================= */}
            <section id="automacao" className="scroll-mt-32 mb-24">
              <SectionTitle icon={RefreshCw} title="Automação & Bastidores" subtitle="O que acontece nos servidores enquanto você dorme" color="text-cyan-400" bgColor="bg-cyan-500/10" />

              <div className="relative border-l-2 border-cyan-900/30 pl-8 space-y-12 ml-4 md:ml-10">
                <div className="relative group">
                  <span className="absolute -left-[45px] top-0 bg-cyan-950 text-cyan-400 text-xs font-bold px-2 py-1 rounded border border-cyan-800 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(34,211,238,0.2)]">09:00</span>
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 group-hover:border-cyan-500/30 transition-colors hover:bg-slate-900">
                    <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" /> Abertura de Mercado & Taxas
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      O sistema consulta a API do Banco Central (SGS) para verificar a taxa Selic/CDI oficial do dia.
                      Se houve reunião do COPOM na noite anterior, a nova taxa é aplicada automaticamente a todos os seus CDBs pós-fixados.
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  <span className="absolute -left-[45px] top-0 bg-cyan-950 text-cyan-400 text-xs font-bold px-2 py-1 rounded border border-cyan-800 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(34,211,238,0.2)]">18:15</span>
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 group-hover:border-cyan-500/30 transition-colors hover:bg-slate-900">
                    <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" /> Fechamento B3 & Cripto
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Um robô varre seus ativos de Renda Variável (com atraso de 15min do fechamento). Ele consulta o Yahoo Finance para ações e CoinGecko para criptos,
                      atualizando seu patrimônio com o valor de fechamento oficial do dia.
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  <span className="absolute -left-[45px] top-0 bg-cyan-950 text-cyan-400 text-xs font-bold px-2 py-1 rounded border border-cyan-800 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(34,211,238,0.2)]">23:59</span>
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 group-hover:border-cyan-500/30 transition-colors hover:bg-slate-900">
                    <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" /> Snapshot Histórico (Backup)
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Uma "foto" do seu saldo final de todos os ativos e passivos é salva no banco de dados.
                      É esse registro imutável que gera o gráfico de linha "Evolução Patrimonial" no Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================= 10. FAQ ======================= */}
            <section id="faq" className="scroll-mt-32 mb-20 animate-in slide-in-from-bottom-4 duration-700">
              <SectionTitle icon={HelpCircle} title="Perguntas Frequentes" subtitle="Soluções rápidas para dúvidas comuns" color="text-slate-400" bgColor="bg-slate-800" />

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { q: "Meus dados estão seguros?", a: "Sim. O banco de dados roda localmente ou no seu servidor privado (Firebase/Supabase). Nada é enviado para terceiros além das consultas de cotação (que são anônimas, enviando apenas o código do ativo, não quem o possui)." },
                  { q: "O sistema paga as contas sozinho?", a: "Não. O sistema apenas gerencia a informação e te avisa. Você deve pagar pelo app do seu banco e depois dar baixa aqui para manter o controle." },
                  { q: "Posso usar sem internet?", a: "O sistema carrega (PWA), mas as cotações de ativos (Bolsa/Cripto) e o Bot do Telegram não funcionarão sem conexão com a rede." },
                  { q: "Como reseto minha senha?", a: "Por segurança, apenas o Administrador do sistema (geralmente o primeiro usuário criado) pode acessar o painel Admin e enviar um email de redefinição." },
                  { q: "A taxa CDI está errada no Dashboard.", a: "O sistema usa a taxa oficial do dia anterior divulgada pelo BC. Se o COPOM mudou a taxa hoje, ela refletirá no sistema amanhã automaticamente." },
                  { q: "O gráfico de evolução está zerado.", a: "O gráfico precisa de pelo menos 1 dia de histórico (snapshot noturno) para começar a desenhar a linha. Aguarde até amanhã." },
                  { q: "O que é 'Liquidez Diária'?", a: "Significa que você pode resgatar o dinheiro no mesmo dia. Se não for diária, o dinheiro fica preso até o vencimento (ex: LCI de 90 dias)." },
                  { q: "Como adiciono o Bot no Telegram?", a: "Vá em Configurações > Integrações. Lá haverá um QR Code e um Token único. Envie o Token para o Bot para vincular sua conta." },
                ].map((faq, i) => (
                  <div key={i} className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/30 transition-all cursor-help group h-full">
                    <h4 className="text-white font-bold mb-3 text-base flex items-start gap-3 group-hover:text-blue-200 transition-colors">
                      <div className="mt-0.5 p-1 bg-slate-800 rounded text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </div>
                      {faq.q}
                    </h4>
                    <p className="text-sm text-slate-400 pl-9 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>

              {/* Glossário Rápido (Novo) */}
              <div className="mt-12 pt-10 border-t border-slate-800">
                <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-500" /> Glossário Rápido
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="block text-blue-400 font-bold text-xs uppercase mb-1">Selic</span>
                    <span className="text-slate-400 text-xs">Taxa básica de juros da economia.</span>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="block text-blue-400 font-bold text-xs uppercase mb-1">CDI</span>
                    <span className="text-slate-400 text-xs">Taxa que os bancos cobram entre si. Segue a Selic.</span>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="block text-blue-400 font-bold text-xs uppercase mb-1">Amortização</span>
                    <span className="text-slate-400 text-xs">Pagamento para reduzir o valor original da dívida.</span>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="block text-blue-400 font-bold text-xs uppercase mb-1">Dividendo</span>
                    <span className="text-slate-400 text-xs">Parte do lucro da empresa pago ao acionista.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <div className="border-t border-slate-800 pt-12 pb-8 text-center text-slate-600 text-sm">
              <div className="flex justify-center gap-6 mb-6 font-medium">
                <a href="#" className="hover:text-blue-400 transition-colors">Termos de Uso</a>
                <span className="text-slate-800">•</span>
                <a href="https://github.com/OnlyTachi/personal-finance-manager" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2">
                  Github <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-800">•</span>
                <a href="#" className="hover:text-blue-400 transition-colors">Reportar Bug</a>
              </div>
              <p className="mb-2">Desenvolvido com 💜 e Matemática.</p>
              <p className="font-mono text-xs opacity-40 uppercase tracking-widest">Build v2.1.0 • Dezembro 2025</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}