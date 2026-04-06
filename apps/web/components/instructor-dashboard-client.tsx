"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { readAuthSession, subscribeAuthSession, type AuthSession } from "../lib/auth";
import { NarrativeCard, StatCard } from "./cards";
import { instructorOverview } from "./mock-data";

type InstructorOverviewResponse = {
  generated_at: string;
  students: Array<{
    student_name: string;
    student_profile_id: number;
    primary_weakness_type: string | null;
    weak_subjects: Array<{ subject_code: string }>;
    target_gap: number | null;
    coaching_points: string[];
  }>;
};

export function InstructorDashboardClient() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<InstructorOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateSession = () => setSession(readAuthSession());
    updateSession();
    return subscribeAuthSession(updateSession);
  }, []);

  useEffect(() => {
    async function load() {
      if (!session) {
        setData(null);
        setError("로그인 후 실제 강사 대시보드 조회 가능");
        setIsLoading(false);
        return;
      }
      if (session.user.role === "student") {
        setData(null);
        setError("학생 계정은 강사 대시보드 조회 불가");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await apiRequest<InstructorOverviewResponse>("/dashboard/instructor/overview", { session });
        setData(response);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "강사 대시보드 조회 실패");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [session]);

  const fallback = instructorOverview.students[0];
  const student = data
    ? {
        name: data.students[0]?.student_name ?? fallback.name,
        weaknessType: data.students[0]?.primary_weakness_type ?? fallback.weaknessType,
        weakSubjects: data.students[0]?.weak_subjects.map((subject) => subject.subject_code) ?? fallback.weakSubjects,
        targetGap: data.students[0]?.target_gap ?? fallback.targetGap,
        coachingPoints: data.students[0]?.coaching_points ?? fallback.coachingPoints
      }
    : fallback;

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">Instructor Dashboard</div>
        <h1>학생 진단 요약과 상담 우선순위 확인</h1>
        <p className="muted">
          실제 인증 시 강사 전용 대시보드 조회.
          미인증 상태에서는 예시 화면 표시.
        </p>
        <div className="badge">{data ? "실제 API 연결 상태" : "예시 화면 상태"}</div>
        {error ? <div className="error-box">{error}</div> : null}
        {isLoading ? <div className="info-box">강사 데이터 불러오는 중...</div> : null}
      </section>

      <section className="grid three">
        <StatCard label="학생" value={student.name} detail="대표 학생 기준 요약" />
        <StatCard label="취약 유형" value={student.weaknessType} detail="설명 가능한 규칙 기반 진단 결과" />
        <StatCard label="목표 격차" value={`${student.targetGap} pts`} detail="목표 대학 환산 점수 대비 부족분" />
      </section>

      <section className="grid two">
        <NarrativeCard title="취약 과목" items={student.weakSubjects.map((subject) => `${subject} 과목 보강 우선`)} />
        <NarrativeCard title="상담 포인트" items={student.coachingPoints} />
      </section>
    </main>
  );
}

