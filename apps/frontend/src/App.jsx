import { useEffect, useRef } from "react";
import { AppShell } from "./components/layout/AppShell.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MainRouter } from "./router/MainRouter.jsx";

function defaultPathForRole(role) {
  return role === "student" ? "/student" : "/dashboard";
}

function AppContent() {
  const { session, isHydrating } = useAuth();
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (isHydrating) return;

    if (!session) {
      hadSessionRef.current = false;
      if (window.location.pathname !== "/login") {
        window.history.replaceState({}, "", "/login");
      }
      return;
    }

    const targetPath = defaultPathForRole(session.user.role);
    if (!hadSessionRef.current) {
      if (window.location.pathname === "/login" || window.location.pathname === "/") {
        window.history.pushState({}, "", targetPath);
      }
    } else if (window.location.pathname === "/login" || window.location.pathname === "/") {
      window.history.replaceState({}, "", targetPath);
    }
    hadSessionRef.current = true;
  }, [session, isHydrating]);

  if (isHydrating) {
    return <div className="screen-message">로그인 상태를 확인하고 있어.</div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <MainRouter />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
