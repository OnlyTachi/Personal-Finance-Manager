import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  LogOut, User, Shield, 
  LayoutDashboard, Wallet, CreditCard, Calculator, History, HelpCircle, Heart, Trophy, Settings 
} from 'lucide-react';

import CalculatorPage from './pages/Calculator';
import DashboardPage from './pages/Dashboard';
import AddAssetPage from './pages/AddAsset';
import AssetDetailsPage from './pages/AssetDetails';
import PassivosPage from './pages/Passivos';
import PassivoDetailsPage from './pages/PassivoDetails';
import LoginPage from './pages/Login';
import HelpPage from './pages/Help';
import HistoryPage from './pages/History';
import CashFlowPage from './pages/CashFlow';
import AdminPage from './pages/Admin';
import CouplePage from './pages/Couple';
import AchievementsPage from './pages/Achievements';
import SettingsPage from './pages/Settings'; // Import restored

function PrivateRoute({ children }) {
  const { signed, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-white">Carregando...</div>;
  return signed ? children : <Navigate to="/login" />;
}

function NavLink({ to, icon: Icon, children, delayClass = "" }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '/dashboard');
  
  const baseClass = "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border animate-slide-in";
  const activeClass = "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]";
  const inactiveClass = "text-gray-400 border-transparent hover:text-white hover:bg-slate-800";

  return (
    <Link to={to} className={`${baseClass} ${isActive ? activeClass : inactiveClass} ${delayClass}`}>
      {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />}
      {children}
    </Link>
  );
}

function AppContent() {
  const { user, signOut, signed } = useAuth();

  if (!signed) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-blue-500/30">
      <nav className="border-b border-slate-800 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-500/20 p-2 rounded-lg animate-slide-in"> 
               <Wallet className="w-6 h-6 text-blue-400"/>
            </div>
            <span className="animate-slide-in inline-block delay-100">
              Bem-vindo de volta, {user?.username}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 animate-slide-in delay-200">
              <NavLink to="/" icon={LayoutDashboard} delayClass="delay-300">Dashboard</NavLink>
              <div className="w-px h-4 bg-slate-800 mx-1 animate-slide-in delay-300"></div>
              <NavLink to="/cashflow" icon={Wallet} delayClass="delay-400">Carteira</NavLink> 
              <NavLink to="/passivos" icon={CreditCard} delayClass="delay-500">Dívidas</NavLink>
              <NavLink to="/calculator" icon={Calculator} delayClass="delay-600">Calc</NavLink>
              <div className="w-px h-4 bg-slate-800 mx-1 animate-slide-in delay-600"></div>
              <NavLink to="/achievements" icon={Trophy} delayClass="delay-700">Conquistas</NavLink>
              <NavLink to="/couple" icon={Heart} delayClass="delay-700">Casal</NavLink>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800 animate-slide-in delay-700">
              
              {/* 1. Botão ADMIN (Só aparece se user.is_admin) */}
              {user?.is_admin && (
                <Link to="/admin" className="p-2 text-purple-400 hover:text-white hover:bg-purple-900/20 rounded-lg transition-colors" title="Admin">
                  <Shield className="w-4 h-4"/>
                </Link>
              )}
              
              {/* 2. Botão SETTINGS (Aparece para todos) */}
              <Link to="/settings" className="text-gray-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Configurações">
                <Settings className="w-4 h-4" />
              </Link>

              {/* 3. Botão HELP */}
              <Link to="/help" className="text-gray-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors" title="Ajuda">
                <HelpCircle className="w-4 h-4" />
              </Link>

              {/* 4. Botão SAIR */}
              <button onClick={signOut} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-colors" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="animate-in fade-in duration-500">
        <Routes>
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
          <Route path="/calculator" element={<PrivateRoute><CalculatorPage /></PrivateRoute>} />
          <Route path="/passivos" element={<PrivateRoute><PassivosPage /></PrivateRoute>} />
          <Route path="/passivos/:id" element={<PrivateRoute><PassivoDetailsPage /></PrivateRoute>} />
          <Route path="/cashflow" element={<PrivateRoute><CashFlowPage /></PrivateRoute>} />
          <Route path="/couple" element={<PrivateRoute><CouplePage /></PrivateRoute>} />
          <Route path="/achievements" element={<PrivateRoute><AchievementsPage /></PrivateRoute>} /> 
          
          {/* Rota Settings restaurada */}
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          
          <Route path="/admin" element={
            <PrivateRoute>
              {user?.is_admin ? <AdminPage /> : <Navigate to="/" />}
            </PrivateRoute>
          } />

          <Route path="/dashboard" element={<Navigate to="/" replace />} /> 
          <Route path="/add-investment" element={<PrivateRoute><AddAssetPage /></PrivateRoute>} />
          <Route path="/asset/:id" element={<PrivateRoute><AssetDetailsPage /></PrivateRoute>} />
          <Route path="/help" element={<PrivateRoute><HelpPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}