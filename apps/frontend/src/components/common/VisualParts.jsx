// apps/frontend/src/components/common/VisualParts.jsx
// unitflow-ai.jsx에서 이식한 시각 컴포넌트 모음

import { Sparkles, AlertTriangle, Eye, CheckCircle } from "lucide-react";

const WEAKNESS_META = {
  wt1: { label: "개념 이해 보완", color: "#EF4444", icon: "🧩" },
  wt2: { label: "계산 실수 주의", color: "#F97316", icon: "🔢" },
  wt3: { label: "시간 관리 보완", color: "#FBBF24", icon: "⏱️" },
  wt4: { label: "선행 개념 보완", color: "#8B5CF6", icon: "🔗" },
  wt5: { label: "유형 편중", color: "#EC4899", icon: "📊" },
  wt6: { label: "성적 흐름 변동", color: "#6366F1", icon: "📈" },
};

/** AI 보라색 그라데이션 배지 */
export function AIBadge({ small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "linear-gradient(135deg, #7C3AED, #6366F1)",
      color: "#fff", borderRadius: 100,
      padding: small ? "2px 8px" : "4px 12px",
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.5,
      boxShadow: "0 2px 8px rgba(124,58,237,0.30)",
    }}>
      <Sparkles size={small ? 10 : 12} /> AI 분석
    </span>
  );
}

/** 취약 유형 배지 */
export function WeaknessBadge({ typeId, small }) {
  const meta = WEAKNESS_META[typeId];
  if (!meta) return <span className="pill">{typeId}</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 100, fontSize: small ? 10 : 11, fontWeight: 600,
      background: `${meta.color}12`, color: meta.color,
      border: `1px solid ${meta.color}22`,
    }}>
      <span style={{ fontSize: small ? 10 : 12 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

/** 상담 우선도 배지 */
export function PriorityBadge({ priority }) {
  const map = {
    high: { color: "#EF4444", text: "상담 우선", Icon: AlertTriangle },
    medium: { color: "#F59E0B", text: "관심 필요", Icon: Eye },
    low: { color: "#10B981", text: "양호", Icon: CheckCircle },
  };
  const config = map[priority] || map.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 9px", borderRadius: 100,
      fontSize: 10, fontWeight: 600,
      background: `${config.color}12`, color: config.color,
      border: `1px solid ${config.color}20`,
    }}>
      <config.Icon size={10} /> {config.text}
    </span>
  );
}

/** 프로그레스 바 */
export function ProgressBar({ value, max = 100, color = "#3B82F6", height = 8, showLabel }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height, borderRadius: height, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: height,
          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
          boxShadow: `0 0 6px ${color}30`,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", minWidth: 34, textAlign: "right" }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

/** 갭 분석 바 (현재 vs 목표) */
export function GapBar({ current, target, label, color = "#3B82F6" }) {
  const gap = target - current;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>
          {current} → {target}
          <span style={{
            color: gap > 10 ? "#EF4444" : gap > 5 ? "#F59E0B" : "#10B981",
            fontWeight: 700, marginLeft: 6,
          }}>
            {gap > 0 ? `−${gap}` : "✓ 달성"}
          </span>
        </span>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(0,0,0,0.05)" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4,
          width: `${target}%`, background: `${color}10`,
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4,
          width: `${current}%`,
          background: `linear-gradient(90deg, ${color}, ${color}BB)`,
          boxShadow: `0 0 6px ${color}25`,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

/** 섹션 헤더 */
export function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
          {Icon && <Icon size={17} color="#7C3AED" />}
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Recharts 글래스 툴팁 */
export function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,23,42,0.85)", color: "#fff", padding: "8px 12px",
      borderRadius: 10, fontSize: 11, backdropFilter: "blur(12px)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: 3, background: p.color }} />
          {p.name}: {p.value}점
        </div>
      ))}
    </div>
  );
}

/** 과목 색상 매핑 */
export const SUBJECT_COLORS = {
  "국어": "#3B82F6", "수학": "#7C3AED", "영어": "#10B981",
  "과학탐구": "#F59E0B", "사회탐구": "#EC4899",
  KOR: "#3B82F6", MATH: "#7C3AED", ENG: "#10B981", SCI: "#F59E0B", SOC: "#EC4899",
};

export const CHART_PALETTE = ["#3B82F6", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
