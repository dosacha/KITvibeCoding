"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { readAuthSession, writeAuthSession, type AuthSession } from "../lib/auth";
import type { FrontendLoginResponse } from "../lib/contracts";
import { StatusBox } from "./cards";

const testAccounts = [
  { role: "관리자", email: "admin@unitflow.ai", password: "password123" },
  { role: "강사", email: "instructor@unitflow.ai", password: "password123" },
  { role: "학생", email: "student@unitflow.ai", password: "password123" }
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("instructor@unitflow.ai");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      return;
    }
    router.replace(session.user.role === "student" ? "/student" : "/instructor");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiRequest<FrontendLoginResponse>("/frontend/login", {
        method: "POST",
        body: { email, password }
      });
      const session: AuthSession = {
        accessToken: response.accessToken,
        user: response.user
      };
      writeAuthSession(session);
      startTransition(() => {
        router.replace(response.user.role === "student" ? "/student" : "/instructor");
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했어.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid two" style={{ alignItems: "start" }}>
      <section className="card">
        <div className="eyebrow">로그인</div>
        <h2 className="section-title">계정으로 바로 시작</h2>
        <p className="muted">로그인하면 역할에 맞는 화면으로 이동해.</p>

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
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "확인 중" : "로그인"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="eyebrow">테스트 계정</div>
        <h2 className="section-title">바로 써볼 계정</h2>
        <div className="grid" style={{ gap: 12 }}>
          {testAccounts.map((account) => (
            <button
              key={account.email}
              className="account-preset"
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
            >
              <strong>{account.role}</strong>
              <span>{account.email}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
