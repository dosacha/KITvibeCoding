import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const linkClassName = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const ROLE_LABEL = {
  admin: '관리자',
  instructor: '강사',
  student: '학생',
};

export default function Layout({ title, children, backTo, backLabel = '뒤로' }) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const isStudent = role === 'student';
  const isAdmin = role === 'admin';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>UnitFlow AI</h1>
          <p className="sidebar-tagline">AI 진단 + 목표대학 맞춤 전략</p>
        </div>
        <nav className="nav-menu">
          {isStudent ? (
            <NavLink className={linkClassName} to="/student">
              내 학습 전략
            </NavLink>
          ) : (
            <>
              <NavLink className={linkClassName} to="/instructor">
                {isAdmin ? '운영 대시보드' : '학생 진단 · 전략'}
              </NavLink>
              <NavLink className={linkClassName} to="/exams">
                시험 운영
              </NavLink>
              {isAdmin ? (
                <>
                  <NavLink className={linkClassName} to="/universities">
                    대학 정책 관리
                  </NavLink>
                  <NavLink className={linkClassName} to="/audit">
                    감사 · 재계산
                  </NavLink>
                </>
              ) : null}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{user?.full_name}</strong>
            <span className="small">{user?.email}</span>
            <span className="role-badge">{ROLE_LABEL[role] || role}</span>
          </div>
          <button type="button" className="secondary-button sidebar-logout" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="page-header">
          {backTo ? (
            <p className="page-back">
              <Link to={backTo}>← {backLabel}</Link>
            </p>
          ) : null}
          <h2 className="page-title">{title}</h2>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
