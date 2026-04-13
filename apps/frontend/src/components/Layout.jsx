import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

const ROLE_LABEL = {
  admin: '관리자',
  instructor: '강사',
  student: '학생',
};

const STUDENT_NAV = [
  { to: '/student', label: '홈', mobileLabel: '홈', end: true },
  { to: '/student/diagnosis', label: '진단', mobileLabel: '진단' },
  { to: '/student/strategy-workspace', label: '전략 설계실', mobileLabel: '전략' },
  { to: '/student/planner', label: '주간 플래너', mobileLabel: '플래너' },
  { to: '/student/growth', label: '성장 리포트', mobileLabel: '성장' },
  { to: '/student/simulator', label: '시뮬레이터', mobileLabel: '시뮬' },
];

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
            STUDENT_NAV.map(({ to, label, end }) => (
              <NavLink key={to} className={linkClass} to={to} end={end}>
                {label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink className={linkClass} to="/instructor">
                {isAdmin ? '운영 대시보드' : '학생 진단과 전략'}
              </NavLink>
              <NavLink className={linkClass} to="/exams">
                시험 관리
              </NavLink>
              {isAdmin ? (
                <>
                  <NavLink className={linkClass} to="/universities">
                    목표대학 정책
                  </NavLink>
                  <NavLink className={linkClass} to="/audit">
                    감사 로그
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
              <Link to={backTo}>{backLabel}</Link>
            </p>
          ) : null}
          <h2 className="page-title">{title}</h2>
        </header>
        <section className="page-content">{children}</section>
      </main>

      {isStudent ? (
        <nav className="student-bottom-nav" aria-label="학생 하단 메뉴">
          {STUDENT_NAV.map(({ to, mobileLabel, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="bottom-nav-label">{mobileLabel}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
