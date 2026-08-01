import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { investmentsService } from "@/services";
import {
  ArrowLeft,
  Trophy,
  Lock,
  Footprints,
  Crown,
  Diamond,
  ShieldCheck,
  PieChart,
  Heart,
  Bitcoin,
  Star,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Mapa de ícones (string do backend -> componente React)
const ICON_MAP = {
  Footprints,
  Trophy,
  Crown,
  Diamond,
  ShieldCheck,
  PieChart,
  Heart,
  Bitcoin,
  Star,
};

export default function AchievementsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await investmentsService.getGamificationStatus();
      setStatus(data);
    } catch (err) {
      console.error("Erro ao carregar conquistas", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <RefreshCw className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p>Calculando suas conquistas...</p>
      </div>
    );
  }

  // Tela de Erro Amigável (Caso o backend esteja offline ou tabela faltando)
  if (error || !status) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-900/20 p-6 rounded-full mb-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Ops! Algo deu errado.
        </h2>
        <p className="text-gray-400 mb-6 max-w-md">
          Não foi possível carregar suas conquistas. O servidor pode estar
          reiniciando ou a tabela de gamificação ainda não foi criada.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 rounded-lg border border-slate-700 text-gray-300 hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={loadData}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />{" "}
        Voltar ao Dashboard
      </button>

      {/* HEADER DE NÍVEL */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/20 p-8 rounded-2xl mb-10 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-64 h-64 text-yellow-500" />
        </div>

        <h2 className="text-yellow-500/80 text-xs uppercase tracking-[0.3em] font-bold mb-3">
          Nível de Investidor
        </h2>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-xl tracking-tight">
          {status.level || "Novato"}
        </h1>

        <div className="inline-flex items-center gap-3 bg-slate-950/50 px-5 py-2.5 rounded-full border border-yellow-500/10 backdrop-blur-sm shadow-inner">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-100 font-bold text-lg">
            {status.earned_count}
          </span>
          <span className="text-gray-500 text-sm font-medium">de</span>
          <span className="text-gray-400 font-bold text-lg">
            {status.total_badges}
          </span>
          <span className="text-gray-500 text-sm font-medium uppercase tracking-wide ml-1">
            Desbloqueadas
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="mt-8 max-w-lg mx-auto relative">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all duration-1000 ease-out"
              style={{
                width: `${(status.earned_count / status.total_badges) * 100}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            <span>Início</span>
            <span>Mestre</span>
          </div>
        </div>
      </div>

      {/* GRID DE MEDALHAS */}
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Star className="w-6 h-6 text-purple-400" /> Galeria de Troféus
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {status.badges?.map((badge) => {
          const IconComponent = ICON_MAP[badge.icon] || Trophy;

          return (
            <div
              key={badge.code}
              className={`relative p-6 rounded-xl border transition-all duration-300 group overflow-hidden
                ${
                  badge.earned
                    ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-900/10 hover:-translate-y-1"
                    : "bg-slate-900/30 border-slate-800 opacity-60 grayscale hover:opacity-80"
                }`}
            >
              {/* Efeito de brilho se conquistado */}
              {badge.earned && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              )}

              {/* Ícone */}
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-3xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
                ${badge.earned ? `bg-slate-800 border border-slate-600 ${badge.color}` : "bg-slate-950 border border-slate-800 text-gray-700"}`}
              >
                {badge.earned ? (
                  <IconComponent className="w-8 h-8" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>

              {/* Textos */}
              <h4
                className={`font-bold text-lg mb-2 leading-tight ${badge.earned ? "text-white" : "text-gray-500"}`}
              >
                {badge.name}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {badge.description}
              </p>

              {/* Data da Conquista */}
              {badge.earned && badge.earned_at && (
                <div className="mt-5 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    Conquistado
                  </span>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-900/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {new Date(badge.earned_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
