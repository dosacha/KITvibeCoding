"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { clearAuthSession, readAuthSession, subscribeAuthSession, writeAuthSession, type AuthSession } from "../lib/auth";
import type { FrontendMeResponse } from "../lib/contracts";

function roleLabel(role: string): string {
  if (role === "student") return "학생 계정";
  if (role === "instructor") return "강사 계정";
  return "관리자 계정";
}

export function AuthPanel() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const localSession = readAuthSession();
    setSession(localSession);

    async function validateSession() {
      if (!localSession) {
        return;
      }
      try {
        const response = await apiRequest<FrontendMeResponse>("/frontend/me", { session: localSession });
        writeAuthSession({
          accessToken: localSession.accessToken,
          user: response.user
        });
      } catch {
        clearAuthSession();
      }
    }

    void validateSession();
    return subscribeAuthSession(() => setSession(readAuthSession()));
  }, []);

  return (
    <div className="auth-bar">
      {session ? (
        <>
          <div className="auth-copy">
            <strong>{session.user.name}</strong>
            <span>{roleLabel(session.user.role)}</span>
          </div>
          <button className="ghost-button" type="button" onClick={() => clearAuthSession()}>
            로그아웃
          </button>
        </>
      ) : (
        <>
          <div className="auth-copy">
            <strong>로그인이 필요해</strong>
            <span>실제 학생 정보와 전략을 보려면 로그인해야 해</span>
          </div>
          <Link className="ghost-button" href="/login">
            로그인
          </Link>
        </>
      )}
    </div>
  );
}
