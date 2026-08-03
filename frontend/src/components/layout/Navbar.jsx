import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services";
import {
  Wallet,
  LayoutDashboard,
  CreditCard,
  Calculator,
  Trophy,
  Heart,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  Mail,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Users,
  PartyPopper,
  RefreshCw,
} from "lucide-react";

// Mapeamento visual por Categoria de Notificação (Superset unificado de ambos os códigos)
const NOTIFICATION_CONFIG = {
  CREDIT_CARD: {
    icon: CreditCard,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    label: "Cartão de Crédito",
  },
  credit_card: {
    icon: CreditCard,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    label: "Cartão de Crédito",
  },
  GOAL: {
    icon: PartyPopper,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    label: "Meta Atingida",
  },
  goal: {
    icon: Trophy,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    label: "Meta Atingida",
  },
  ANOMALY: {
    icon: AlertTriangle,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    label: "Anomalia Detectada",
  },
  anomaly: {
    icon: AlertTriangle,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    label: "Anomalia Detectada",
  },
  COUPLE: {
    icon: Users,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    label: "Modo Casal",
  },
  couple: {
    icon: Users,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    label: "Modo Casal",
  },
  EMAIL: {
    icon: Mail,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    label: "E-mail / Sincronização",
  },
  DEFAULT: {
    icon: Bell,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    label: "Notificação",
  },
  default: {
    icon: Bell,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    label: "Notificação",
  },
};

function NavLink({
  to,
  icon: Icon,
  children,
  delayClass = "",
  onRef,
  isActive,
}) {
  const baseClass =
    "relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 animate-slide-in group";
  const activeClass = "text-blue-400 font-semibold";
  const inactiveClass = "text-gray-400 hover:text-white";
  return (
    <Link
      ref={onRef}
      to={to}
      className={`${baseClass} ${isActive ? activeClass : inactiveClass} ${delayClass}`}
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
            isActive
              ? "text-blue-400"
              : "text-slate-500 group-hover:text-slate-200"
          }`}
        />
      )}
      <span>{children}</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const indicatorRef = useRef(null);
  const linkRefs = useRef([]);
  const dropdownRef = useRef(null);

  // Estados de Notificação
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/cashflow", label: "Carteira", icon: Wallet },
    { to: "/passivos", label: "Dívidas", icon: CreditCard },
    { to: "/calculator", label: "Calc", icon: Calculator },
    { to: "/emails", label: "Emails", icon: Mail },
    { to: "/achievements", label: "Conquistas", icon: Trophy },
    { to: "/couple", label: "Casal", icon: Heart },
  ];

  const activeIndex = tabs.findIndex(
    (tab) =>
      location.pathname === tab.to ||
      (tab.to === "/" && location.pathname === "/dashboard"),
  );

  // Busca lista de notificações
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll periódico de notificações a cada 60s
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Indicador deslizante do Menu
  useEffect(() => {
    const indicator = indicatorRef.current;
    const activeLink = linkRefs.current[activeIndex];
    if (!indicator || !activeLink) {
      return undefined;
    }
    const updateIndicator = () => {
      const parentRect = indicator.parentElement.getBoundingClientRect();
      const currentActiveRect = activeLink.getBoundingClientRect();
      const left = currentActiveRect.left - parentRect.left;
      indicator.style.width = `${currentActiveRect.width}px`;
      indicator.style.transform = `translateX(${left}px)`;
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeIndex, location.pathname]);

  // Ação ao clicar em uma notificação
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
      }
      setIsOpen(false);

      // Suporte a action_url ou link customizado, fallbacks por categoria
      const targetRoute = notification.action_url || notification.link;
      if (targetRoute) {
        navigate(targetRoute);
      } else {
        const cat = notification.category?.toUpperCase();
        switch (cat) {
          case "CREDIT_CARD":
            navigate("/passivos");
            break;
          case "GOAL":
          case "COUPLE":
            navigate("/couple");
            break;
          case "EMAIL":
            navigate("/emails");
            break;
          case "ANOMALY":
            navigate("/cashflow");
            break;
          default:
            break;
        }
      }
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="border-b border-slate-800 bg-surface/80 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        {/* LOGO E SAUDAÇÃO */}
        <Link
          to="/"
          className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="bg-blue-500/20 p-2 rounded-lg animate-slide-in">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-sm sm:text-base md:text-base font-bold text-slate-100 animate-slide-in inline-block delay-100 truncate max-w-[220px]">
            Bem-vindo de volta, {user?.username || user?.name || "Usuário"}
          </span>
        </Link>

        {/* Links de Navegação com Indicador Deslizante */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 animate-slide-in delay-200 shadow-inner relative">
            <span
              ref={indicatorRef}
              className="absolute top-1.5 bottom-1.5 left-0 rounded-lg border border-blue-500/30 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-all duration-300 ease-out pointer-events-none"
            />
            <NavLink
              to="/"
              icon={LayoutDashboard}
              delayClass="delay-300"
              onRef={(element) => {
                linkRefs.current[0] = element;
              }}
              isActive={activeIndex === 0}
            >
              Dashboard
            </NavLink>
            <div className="w-px h-4 bg-slate-800 mx-1 z-10"></div>
            <NavLink
              to="/cashflow"
              icon={Wallet}
              delayClass="delay-400"
              onRef={(element) => {
                linkRefs.current[1] = element;
              }}
              isActive={activeIndex === 1}
            >
              Carteira
            </NavLink>
            <NavLink
              to="/passivos"
              icon={CreditCard}
              delayClass="delay-500"
              onRef={(element) => {
                linkRefs.current[2] = element;
              }}
              isActive={activeIndex === 2}
            >
              Dívidas
            </NavLink>
            <NavLink
              to="/calculator"
              icon={Calculator}
              delayClass="delay-600"
              onRef={(element) => {
                linkRefs.current[3] = element;
              }}
              isActive={activeIndex === 3}
            >
              Calc
            </NavLink>
            <NavLink
              to="/emails"
              icon={Mail}
              delayClass="delay-600"
              onRef={(element) => {
                linkRefs.current[4] = element;
              }}
              isActive={activeIndex === 4}
            >
              Emails
            </NavLink>
            <div className="w-px h-4 bg-slate-800 mx-1 z-10"></div>
            <NavLink
              to="/achievements"
              icon={Trophy}
              delayClass="delay-700"
              onRef={(element) => {
                linkRefs.current[5] = element;
              }}
              isActive={activeIndex === 5}
            >
              Conquistas
            </NavLink>
            <NavLink
              to="/couple"
              icon={Heart}
              delayClass="delay-700"
              onRef={(element) => {
                linkRefs.current[6] = element;
              }}
              isActive={activeIndex === 6}
            >
              Casal
            </NavLink>
          </div>

          {/* Menu Utilitários & Notificações */}
          <div
            className="flex items-center gap-2 pl-4 border-l border-slate-800 animate-slide-in delay-700 relative"
            ref={dropdownRef}
          >
            {/* BOTÃO DA CENTRAL DE NOTIFICAÇÕES */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 hover:scale-105"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse shadow-lg shadow-red-900/50">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* DROPDOWN DE NOTIFICAÇÕES */}
            {isOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header Dropdown */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">
                      Notificações
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {unreadCount} Não lidas
                      </span>
                    )}
                  </div>
                  <button
                    onClick={fetchNotifications}
                    disabled={loading}
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded"
                    title="Atualizar"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>

                {/* Lista de Notificações */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-700">
                  {loading && notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Carregando alertas...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                      Nenhuma notificação por enquanto!
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const config =
                        NOTIFICATION_CONFIG[item.category] ||
                        NOTIFICATION_CONFIG.DEFAULT;
                      const IconComp = config.icon;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-4 hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3.5 items-start relative group ${
                            !item.read
                              ? "bg-blue-950/20 hover:bg-blue-900/30"
                              : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* Indicador Lateral/Ponto de Não Lida */}
                          {!item.read && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_8px_#3b82f6]"></span>
                          )}

                          <div
                            className={`p-2 rounded-xl border shrink-0 ${config.color}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex justify-between items-baseline mb-1">
                              <p className="text-xs font-bold text-white leading-tight truncate">
                                {item.title}
                              </p>
                              {item.created_at && (
                                <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                                  {new Date(item.created_at).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Dropdown */}
                <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Exibindo os últimos alertas recebidos
                  </span>
                </div>
              </div>
            )}

            {/* AÇÕES DE PERFIL / SISTEMA */}
            {user?.is_admin && (
              <Link
                to="/admin"
                className="p-2 text-purple-400 hover:text-white hover:bg-purple-900/30 rounded-lg transition-all duration-200 hover:scale-105"
                title="Admin"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}
            <Link
              to="/settings"
              className="text-gray-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all duration-200 hover:scale-105"
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <Link
              to="/help"
              className="text-gray-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all duration-200 hover:scale-105"
              title="Ajuda"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>
            <button
              onClick={signOut}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-all duration-200 hover:scale-105"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
