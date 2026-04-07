import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { TEST_ACCOUNTS } from "../lib/constants.js";
import { StatusBox } from "../components/common/StatusBox.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("instructor@unitflow.ai");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인에 실패했어.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-grid">
        <section className="hero-card">
          <div className="pill-row">
            <span className="pill">학생 진단</span>
            <span className="pill">학습 전략</span>
            <span className="pill">목표 대학 반영</span>
          </div>
          <h1>오늘 먼저 볼 학생과 지금 해야 할 공부를 바로 확인</h1>
          <p className="muted">
            학생에게는 지금 해야 할 공부를, 강사에게는 오늘 먼저 봐야 할 학생과 상담 포인트를 보여줘.
          </p>
        </section>

        <section className="panel">
          <h2>로그인</h2>
          <p className="muted">계정 역할에 맞는 화면으로 바로 이동해.</p>
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>이메일</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="field">
              <span>비밀번호</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </label>
            {error ? <StatusBox tone="error" title="로그인 실패" description={error} /> : null}
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "확인 중" : "로그인"}
            </button>
          </form>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 10 }}>테스트 계정</h3>
            <div className="three-grid">
              {TEST_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  className="nav-button"
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  <strong>{account.role}</strong>
                  <div className="muted">{account.email}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
