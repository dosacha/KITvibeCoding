import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">Authentication</div>
        <h1>로그인과 역할 기반 대시보드 연결</h1>
        <p className="muted">
          백엔드 인증 성공 시 토큰 저장.
          이후 강사용과 학생용 화면에서 실제 API 호출 진행.
        </p>
      </section>
      <LoginForm />
    </main>
  );
}

