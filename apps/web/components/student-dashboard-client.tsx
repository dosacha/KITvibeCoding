"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { readAuthSession, subscribeAuthSession, type AuthSession } from "../lib/auth";
import type { FrontendStudentDetailResponse } from "../lib/contracts";
import { formatPercent, formatScore, toSubjectLabel, toWeaknessLabel } from "../lib/presenters";
import { NarrativeCard, StatCard, StatusBox } from "./cards";

export function StudentDashboardClient() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<FrontendStudentDetailResponse | null>(null);
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
        setError("로그인한 뒤에 학생용 화면을 볼 수 있어.");
        setIsLoading(false);
        return;
      }
      if (session.user.role !== "student") {
        setData(null);
        setError("학생 계정으로 로그인해야 학생용 화면을 볼 수 있어.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await apiRequest<FrontendStudentDetailResponse>("/frontend/dashboard/student", {
          session
        });
        setData(response);
        setError(null);
      } catch (loadError) {
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "학생용 화면을 불러오지 못했어.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [session]);

  const reasons = (data?.diagnosis.evidence ?? []).map((item) => String(item.reason ?? "근거 데이터 확인 필요"));
  const timeAllocation = (data?.strategy.timeAllocation ?? []).map(
    (item) => `${toSubjectLabel(String(item.subject_code ?? item.subjectCode ?? "-"))} ${formatPercent(Number(item.ratio_percent ?? item.ratioPercent ?? 0))}`
  );
  const priorityUnits = (data?.strategy.priorityUnits ?? []).map((item) => String(item.unit_name ?? item.unitName ?? "-"));
  const antiPatterns = data?.strategy.antiPatterns ?? [];
  const currentPosition = data
    ? `${data.targetGap.university_name ?? "목표 대학"} 기준 현재 점수는 ${formatScore(data.targetGap.weighted_score)}이고 목표까지 ${formatScore(data.targetGap.gap)} 차이가 있어.`
    : "";

  return (
    <main className="grid" style={{ gap: 24, marginTop: 20 }}>
      <section className="hero">
        <div className="eyebrow">학생 대시보드</div>
        <h1>{data?.student.name ?? "학생"} 학생이 지금 해야 할 공부</h1>
        <p className="muted">{currentPosition || "현재 위치를 계산하고 있어."}</p>
        {error ? <StatusBox tone="error" title="불러오기에 실패했어" description={error} /> : null}
        {isLoading ? <StatusBox tone="info" title="불러오는 중" description="진단과 학습 전략을 정리하고 있어." /> : null}
      </section>

      <section className="grid three">
        <StatCard
          label="현재 진단"
          value={data?.diagnosis.primaryWeaknessType ? toWeaknessLabel(data.diagnosis.primaryWeaknessType) : "진단 대기"}
          detail="최근 시험과 단원 이해도를 바탕으로 정리했어"
        />
        <StatCard
          label="먼저 올릴 과목"
          value={(data?.strategy.prioritySubjects ?? []).slice(0, 2).map((item) => toSubjectLabel(String(item.subject_code ?? item.subjectCode ?? "-"))).join(" / ") || "-"}
          detail="목표 대학 반영과 최근 흐름을 함께 봤어"
        />
        <StatCard
          label="가장 먼저 쓸 시간"
          value={timeAllocation[0] ?? "-"}
          detail="이번 주 공부 시간 배분의 시작점이야"
        />
      </section>

      <section className="grid two">
        <NarrativeCard title="왜 이런 전략이 나왔는지" items={reasons.length > 0 ? reasons : ["근거 데이터가 아직 충분하지 않아."]} />
        <NarrativeCard title="먼저 보완할 단원" items={priorityUnits.length > 0 ? priorityUnits : ["우선 단원이 아직 정리되지 않았어."]} />
      </section>

      <section className="grid two">
        <NarrativeCard title="추천 시간 배분" items={timeAllocation.length > 0 ? timeAllocation : ["시간 배분 데이터가 아직 없어."]} />
        <NarrativeCard title="피하면 좋은 공부 방식" items={antiPatterns.length > 0 ? antiPatterns : ["피해야 할 패턴 데이터가 아직 없어."]} />
      </section>

      <section className="grid two">
        <NarrativeCard
          title="과목별 현재 위치"
          items={(data?.subjects ?? []).map((subject) => `${subject.subjectName} · 현재 ${formatScore(subject.currentScore)} · 목표 ${formatScore(subject.targetScore)}`)}
        />
        <NarrativeCard
          title="취약 단원"
          items={(data?.weakUnits ?? []).map((unit) => `${toSubjectLabel(unit.subjectCode)} · ${unit.unitName} · 이해도 ${formatPercent(unit.mastery)}`)}
        />
      </section>
    </main>
  );
}
