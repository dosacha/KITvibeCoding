"use client";

const subjectLabels: Record<string, string> = {
  KOR: "국어",
  MATH: "수학",
  ENG: "영어",
  SCI: "과학탐구",
  SOC: "사회탐구"
};

const weaknessLabels: Record<string, string> = {
  wt1: "개념 이해 보완",
  wt2: "계산 실수 주의",
  wt3: "시간 관리 보완",
  wt4: "선행 개념 보완",
  wt5: "문제 유형 편중",
  wt6: "성적 흐름 불안정"
};

const priorityLabels: Record<string, string> = {
  high: "먼저 보기",
  medium: "곧 보기",
  low: "안정권"
};

export function toSubjectLabel(value: string): string {
  return subjectLabels[value] ?? value;
}

export function toWeaknessLabel(value: string): string {
  return weaknessLabels[value] ?? value;
}

export function toPriorityLabel(value: string): string {
  return priorityLabels[value] ?? value;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value * 10) / 10}점`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value * 10) / 10}%`;
}
