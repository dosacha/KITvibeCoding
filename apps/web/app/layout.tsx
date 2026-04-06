import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "../components/auth-panel";

export const metadata: Metadata = {
  title: "UnitFlow AI",
  description: "학생 진단과 맞춤 학습 전략을 돕는 교육 AI"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="page-shell">
          <div className="layout-top">
            <div className="nav-links">
              <Link href="/">서비스 소개</Link>
              <Link href="/login">로그인</Link>
              <Link href="/instructor">강사용 화면</Link>
              <Link href="/student">학생용 화면</Link>
            </div>
            <AuthPanel />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
