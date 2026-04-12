import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const DEMO_HINTS = [
  { role: 'admin', email: 'admin@unitflow.ai', password: 'password123' },
  { role: 'instructor', email: 'instructor@unitflow.ai', password: 'password123' },
  { role: 'student', email: 'student@unitflow.ai', password: 'password123' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('instructor@unitflow.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      const redirect = location.state?.from?.pathname;
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }
      navigate(user.role === 'student' ? '/student' : '/instructor', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div>
          <p className="eyebrow">UnitFlow AI</p>
          <h1>설명 가능한 진단과 전략 승인 MVP</h1>
          <p className="muted">
            PRD 기준 핵심인 취약 유형 진단, 목표대학 맞춤 전략, 강사 승인 흐름을 바로 확인할 수 있습니다.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            이메일
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="instructor@unitflow.ai" />
          </label>
          <label>
            비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="password123" />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="demo-hints">
          <strong>데모 계정</strong>
          {DEMO_HINTS.map((item) => (
            <button
              key={item.role}
              type="button"
              className="hint-button"
              onClick={() => {
                setEmail(item.email);
                setPassword(item.password);
              }}
            >
              {item.role}: {item.email}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
