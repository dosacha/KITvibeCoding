import { MENU_BY_ROLE, ROLE_LABELS } from "../../lib/constants.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { AppStateProvider, useAppState } from "../../contexts/AppStateContext.jsx";

function ShellContent({ children }) {
  const { session, logout } = useAuth();
  const { currentPage, openPage } = useAppState();
  const menuItems = MENU_BY_ROLE[session.user.role] ?? [];

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <h1 className="brand-title">UnitFlow AI</h1>
        <p className="brand-copy">
          학생 진단과 맞춤 학습 전략을 한 화면에서 정리하는 학원 운영 도구야.
        </p>
        <nav className="nav-list">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`nav-button ${currentPage === item.key ? "active" : ""}`}
              type="button"
              onClick={() => openPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h2 className="topbar-title">
              {session.user.role === "student" ? "나의 학습 전략" : "강사용 운영 화면"}
            </h2>
            <p className="topbar-copy">결론, 근거, 다음 행동 순서로 바로 볼 수 있게 정리했어.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="user-chip">
              <strong>{session.user.name}</strong>
              <span className="muted">{ROLE_LABELS[session.user.role]}</span>
            </div>
            <button className="ghost-button" type="button" onClick={logout}>
              로그아웃
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }) {
  const { session } = useAuth();

  return (
    <AppStateProvider role={session.user.role}>
      <ShellContent>{children}</ShellContent>
    </AppStateProvider>
  );
}
