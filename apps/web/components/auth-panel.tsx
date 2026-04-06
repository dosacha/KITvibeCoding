"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import {
  clearAuthSession,
  readAuthSession,
  subscribeAuthSession,
  writeAuthSession,
  type AuthSession,
  type AuthUser
} from "../lib/auth";

type CurrentUserResponse = {
  user: AuthUser;
};

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
        const response = await apiRequest<CurrentUserResponse>("/auth/me", { session: localSession });
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
            <strong>{session.user.full_name}</strong>
            <span>{session.user.role}</span>
          </div>
          <button className="ghost-button" type="button" onClick={() => clearAuthSession()}>
            로그아웃
          </button>
        </>
      ) : (
        <>
          <div className="auth-copy">
            <strong>로그인 필요</strong>
            <span>실제 API 조회 전 인증 필요</span>
          </div>
          <Link className="ghost-button" href="/login">
            로그인
          </Link>
        </>
      )}
    </div>
  );
}
