import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import FloatingChatWidget from "@/components/email/FloatingChatWidget";

// Features
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import CashFlowPage from "./features/cashflow/CashFlowPage";
import PassivosPage from "./features/passivos/PassivosPage";
import PassivoDetailsPage from "./features/passivos/PassivoDetailsPage";
import AddAssetPage from "./features/investments/AddAssetPage";
import AssetDetailsPage from "./features/investments/AssetDetailsPage";
import CalculatorPage from "./features/calculator/CalculatorPage";
import HistoryPage from "./features/history/HistoryPage";
import AchievementsPage from "./features/gamification/AchievementsPage";
import CouplePage from "./features/couple/CouplePage";
import SettingsPage from "./features/settings/SettingsPage";
import AdminPage from "./features/admin/AdminPage";
import HelpPage from "./features/help/HelpPage";
import EmailsPage from "./features/emails/EmailsPage";
import ReportsPage from "./features/reports/ReportsPage";

function PrivateRoute({ children }) {
  const { signed, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  return signed ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user, signed } = useAuth();
  if (!signed) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-blue-500/30 relative">
      <Navbar />

      <main className="animate-in fade-in duration-500">
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/cashflow"
            element={
              <PrivateRoute>
                <CashFlowPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <HistoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/calculator"
            element={
              <PrivateRoute>
                <CalculatorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/passivos"
            element={
              <PrivateRoute>
                <PassivosPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/passivos/:id"
            element={
              <PrivateRoute>
                <PassivoDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-investment"
            element={
              <PrivateRoute>
                <AddAssetPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/asset/:id"
            element={
              <PrivateRoute>
                <AssetDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/couple"
            element={
              <PrivateRoute>
                <CouplePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <PrivateRoute>
                <AchievementsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/emails"
            element={
              <PrivateRoute>
                <EmailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/help"
            element={
              <PrivateRoute>
                <HelpPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                {user?.is_admin ? <AdminPage /> : <Navigate to="/" />}
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Widget do Chat com IA (Visível em todas as rotas autenticadas) */}
      <FloatingChatWidget />
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
