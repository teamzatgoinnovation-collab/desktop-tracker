import { LoadingState } from "@zatgo/ui";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/layouts/AppShell";
import { hydrateErpnextSession } from "@/lib/client";
import { ConnectionPage } from "@/pages/ConnectionPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { TasksPage } from "@/pages/TasksPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { useSessionStore } from "@/store/session";

const Router = window.zatgoDesktop ? HashRouter : BrowserRouter;

function RequireAuth({ children }: { children: React.ReactNode }) {
  const connected = useSessionStore((s) => s.connected);
  if (!connected) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:name" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:name" element={<TaskDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="connection" element={<ConnectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void hydrateErpnextSession().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingState label="Starting Tracker…" />
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
