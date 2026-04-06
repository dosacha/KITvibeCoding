"use client";

export type UserRole = "admin" | "instructor" | "student";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  academy_id: number | null;
  preferred_subject_ids: number[];
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

const AUTH_STORAGE_KEY = "unitflow-auth-session";
const AUTH_EVENT_NAME = "unitflow-auth-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function clearAuthSession(): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function subscribeAuthSession(listener: () => void): () => void {
  if (!isBrowser()) {
    return () => undefined;
  }
  window.addEventListener(AUTH_EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}

