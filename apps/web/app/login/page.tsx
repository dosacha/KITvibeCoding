import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">로그인</div>
        <h1>역할에 맞는 화면으로 바로 들어가기</h1>
        <p className="muted">강사와 학생은 같은 데이터 기반을 보되, 필요한 정보만 다르게 보여줘.</p>
      </section>
      <LoginForm />
    </main>
  );
}
