"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { readAuthSession, subscribeAuthSession, type AuthSession } from "../lib/auth";
import type { FrontendInstructorDashboardResponse } from "../lib/contracts";
import { formatPercent, formatScore, toWeaknessLabel } from "../lib/presenters";
import { NarrativeCard, StatCard, StatusBox } from "./cards";

export function InstructorDashboardClient() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<FrontendInstructorDashboardResponse | null>(null);
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
        setError("로그인한 뒤에 강사용 화면을 볼 수 있어.");
        setIsLoading(false);
        return;
      }
      if (session.user.role === "student") {
        setData(null);
        setError("학생 계정으로는 강사용 화면을 볼 수 없어.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await apiRequest<FrontendInstructorDashboardResponse>("/frontend/dashboard/instructor", { session });
        setData(response);
        setError(null);
      } catch (loadError) {
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "강사용 화면을 불러오지 못했어.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [session]);

  const priorityStudent = data?.consultPriorityStudents[0];
  const recentStrategy = data?.recentStrategies[0];
  const latestAverage = data ? data.examTrend[data.examTrend.length - 1]?.averageScore : undefined;

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">강사용 대시보드</div>
        <h1>오늘 먼저 봐야 할 학생과 상담 포인트</h1>
        <p className="muted">숫자만 나열하지 않고, 누구를 먼저 보고 왜 그런지부터 보여줘.</p>
        {error ? <StatusBox tone="error" title="불러오기에 실패했어" description={error} /> : null}
        {isLoading ? <StatusBox tone="info" title="불러오는 중" description="학생 진단과 전략 요약을 정리하고 있어." /> : null}
      </section>

      <section className="grid three">
        <StatCard label="우선 상담 학생" value={priorityStudent?.name ?? "-"} detail={priorityStudent ? `목표 대학 격차 ${formatScore(priorityStudent.gapScore)}` : "표시할 학생이 아직 없어"} />
        <StatCard label="가장 많이 보이는 취약 유형" value={data?.weaknessDistribution[0]?.label ?? "-"} detail="최근 진단 결과를 묶어서 봤어" />
        <StatCard label="최근 시험 평균" value={formatScore(latestAverage)} detail="마지막으로 집계된 시험 평균이야" />
      </section>

      <section className="grid two">
        <NarrativeCard
          title="지금 먼저 확인할 이유"
          items={
            priorityStudent
              ? [
                  `${priorityStudent.name} 학생을 먼저 확인`,
                  `취약 유형 ${priorityStudent.weaknessTypes.map(toWeaknessLabel).join(", ") || "데이터 없음"}`,
                  `상담 우선도 ${priorityStudent.consultPriority}`
                ]
              : ["표시할 학생 데이터가 아직 없어"]
          }
        />
        <NarrativeCard
          title="최근 전략 요약"
          items={recentStrategy ? [recentStrategy.summary] : ["저장된 전략이 아직 없어"]}
        />
      </section>

      <section className="grid two">
        <NarrativeCard
          title="취약 단원 상위"
          items={(data?.weakUnits ?? []).slice(0, 5).map((unit) => `${unit.unitName} · 이해도 ${formatPercent(unit.mastery)}`)}
        />
        <NarrativeCard
          title="취약 유형 분포"
          items={(data?.weaknessDistribution ?? []).map((item) => `${item.label} · ${item.count}명`)}
        />
      </section>
    </main>
  );
}
