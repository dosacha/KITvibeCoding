import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "../components/auth-panel";

export const metadata: Metadata = {
  title: "UnitFlow AI",
  description: "Explainable education AI for student diagnosis and strategy generation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="page-shell">
          <div className="layout-top">
            <div className="nav-links">
              <Link href="/">Overview</Link>
              <Link href="/login">Login</Link>
              <Link href="/instructor">Instructor Dashboard</Link>
              <Link href="/student">Student Dashboard</Link>
            </div>
            <AuthPanel />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
