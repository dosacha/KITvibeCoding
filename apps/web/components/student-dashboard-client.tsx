"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { readAuthSession, subscribeAuthSession, type AuthSession } from "../lib/auth";
import { NarrativeCard, StatCard } from "./cards";
import { studentSnapshot } from "./mock-data";

type StudentDashboardResponse = {
  student_name: string;
  current_position_summary: string;
  diagnosis: {
    primary_weakness_type: string;
    evidence: Array<{ reason: string }>;
  } | null;
  strategy: {
    structured_plan: {
      priority_subjects: Array<{ subject_code: string }>;
      priority_units: Array<{ unit_name: string }>;
      time_allocation: Array<{ subject_code: string; ratio_percent: number }>;
      anti_patterns: string[];
    };
  } | null;
};

export function StudentDashboardClient() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
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
        setError("로그인 후 실제 학생 대시보드 조회 가능");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const path = session.user.role === "student" ? "/dashboard/student/me" : "/dashboard/demo/student";
        const response = await apiRequest<StudentDashboardResponse>(path, {
          session: session.user.role === "student" ? session : null
        });
        setData(response);
        setError(session.user.role === "student" ? null : "강사 또는 관리자 계정은 학생 예시 화면 연결");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "학생 대시보드 조회 실패");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [session]);

  const diagnosisReasons = data?.diagnosis?.evidence?.map((item) => item.reason) ?? studentSnapshot.diagnosis.reasons;
  const units = data?.strategy?.structured_plan.priority_units.map((item) => item.unit_name) ?? studentSnapshot.strategy.units;
  const allocations =
    data?.strategy?.structured_plan.time_allocation.map((item) => `${item.subject_code} ${item.ratio_percent}%`) ??
    studentSnapshot.strategy.allocations;
  const antiPatterns = data?.strategy?.structured_plan.anti_patterns ?? studentSnapshot.strategy.antiPatterns;
  const subjects = data?.strategy?.structured_plan.priority_subjects.map((item) => item.subject_code) ?? studentSnapshot.strategy.subjects;
  const titleName = data?.student_name ?? studentSnapshot.name;
  const currentPosition = data?.current_position_summary ?? studentSnapshot.currentPosition;
  const diagnosisType = data?.diagnosis?.primary_weakness_type ?? studentSnapshot.diagnosis.type;

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">Student Dashboard</div>
        <h1>{titleName} 학생의 현재 위치와 다음 4주 전략</h1>
        <p className="muted">{currentPosition}</p>
        <div className="badge">{data ? "실제 API 연결 상태" : "예시 화면 상태"}</div>
        {error ? <div className="error-box">{error}</div> : null}
        {isLoading ? <div className="info-box">학생 데이터 불러오는 중...</div> : null}
      </section>

      <section className="grid three">
        <StatCard label="진단 유형" value={diagnosisType} detail="현재 가장 큰 병목으로 판단된 취약 유형" />
        <StatCard label="우선 과목" value={subjects.slice(0, 2).join(" / ")} detail="반영 비중과 상승 효율을 함께 반영한 우선 과목" />
        <StatCard label="시간 배분" value={allocations[0]} detail="가장 먼저 집중할 추천 학습 비중" />
      </section>

      <section className="grid two">
        <NarrativeCard title="전략 근거" items={diagnosisReasons} />
        <NarrativeCard title="우선 보완 단원" items={units} />
      </section>

      <section className="grid two">
        <NarrativeCard title="추천 시간 배분" items={allocations} />
        <NarrativeCard title="피해야 할 패턴" items={antiPatterns} />
      </section>
    </main>
  );
}

