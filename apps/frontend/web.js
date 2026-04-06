import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";
import {
  BookOpen, Users, GraduationCap, BarChart3, Target, Brain, TrendingUp,
  AlertTriangle, CheckCircle, Clock, ChevronRight, LogOut, Home, FileText,
  School, Settings, Bell, Search, ArrowUp, ArrowDown, Minus, Eye, Zap,
  Lightbulb, Shield, Star, Calendar, Activity, Award, RefreshCw, X,
  ChevronDown, User, Menu, ArrowLeft, Plus, Filter, MoreHorizontal,
  Sparkles, HelpCircle, Info, Check, PieChart as PieChartIcon
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   DESIGN SYSTEM
   ═══════════════════════════════════════════════════════ */

const theme = {
  colors: {
    // Primary - Deep ocean blue with warmth
    primary50: "#EFF6FF", primary100: "#DBEAFE", primary200: "#BFDBFE",
    primary500: "#3B82F6", primary600: "#2563EB", primary700: "#1D4ED8",
    // Accent - Warm amber for highlights
    accent50: "#FFFBEB", accent100: "#FEF3C7", accent400: "#FBBF24", accent500: "#F59E0B",
    // Success - Teal green
    success50: "#ECFDF5", success100: "#D1FAE5", success500: "#10B981", success600: "#059669",
    // Warning
    warning50: "#FFF7ED", warning100: "#FFEDD5", warning500: "#F97316",
    // Danger
    danger50: "#FEF2F2", danger100: "#FEE2E2", danger500: "#EF4444", danger600: "#DC2626",
    // Indigo for AI features
    ai50: "#EEF2FF", ai100: "#E0E7FF", ai400: "#818CF8", ai500: "#6366F1", ai600: "#4F46E5",
    // Neutrals
    slate50: "#F8FAFC", slate100: "#F1F5F9", slate200: "#E2E8F0", slate300: "#CBD5E1",
    slate400: "#94A3B8", slate500: "#64748B", slate600: "#475569", slate700: "#334155",
    slate800: "#1E293B", slate900: "#0F172A",
    white: "#FFFFFF",
  },
  radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, "2xl": 20, full: 9999 },
  shadow: {
    xs: "0 1px 2px rgba(0,0,0,0.04)",
    sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
  },
};

const CHART_PALETTE = ["#3B82F6", "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6"];

const fontStack = "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ═══════════════════════════════════════════════════════
   MOCK DATA - Complete Seed Data
   ═══════════════════════════════════════════════════════ */

const DEMO_ACCOUNTS = [
  { email: "instructor@unitflow.ai", password: "demo1234", role: "instructor", name: "김민수 선생님" },
  { email: "student@unitflow.ai", password: "demo1234", role: "student", name: "이서연" },
  { email: "admin@unitflow.ai", password: "demo1234", role: "admin", name: "관리자" },
];

const SUBJECTS = [
  { id: "s1", name: "국어", color: "#3B82F6", icon: "📘" },
  { id: "s2", name: "수학", color: "#6366F1", icon: "📐" },
  { id: "s3", name: "영어", color: "#10B981", icon: "📗" },
  { id: "s4", name: "과학탐구", color: "#F59E0B", icon: "🔬" },
  { id: "s5", name: "사회탐구", color: "#EC4899", icon: "🌏" },
];

const UNITS = {
  s1: [
    { id: "u1", name: "문학 - 현대시", mastery: 82 },
    { id: "u2", name: "문학 - 고전소설", mastery: 65 },
    { id: "u3", name: "독서 - 인문", mastery: 78 },
    { id: "u4", name: "독서 - 과학기술", mastery: 58 },
    { id: "u5", name: "화법과 작문", mastery: 88 },
    { id: "u6", name: "언어와 매체", mastery: 72 },
  ],
  s2: [
    { id: "u7", name: "수와 연산", mastery: 75 },
    { id: "u8", name: "함수", mastery: 62 },
    { id: "u9", name: "미적분", mastery: 48 },
    { id: "u10", name: "확률과 통계", mastery: 55 },
    { id: "u11", name: "기하", mastery: 70 },
  ],
  s3: [
    { id: "u12", name: "독해 - 빈칸추론", mastery: 72 },
    { id: "u13", name: "독해 - 순서배열", mastery: 68 },
    { id: "u14", name: "어법", mastery: 85 },
    { id: "u15", name: "어휘", mastery: 80 },
  ],
  s4: [
    { id: "u16", name: "물리학 - 역학", mastery: 60 },
    { id: "u17", name: "물리학 - 전자기", mastery: 45 },
    { id: "u18", name: "화학 - 화학결합", mastery: 70 },
    { id: "u19", name: "화학 - 반응속도", mastery: 52 },
  ],
  s5: [
    { id: "u20", name: "한국지리", mastery: 78 },
    { id: "u21", name: "세계지리", mastery: 72 },
  ],
};

const WEAKNESS_TYPES = [
  { id: "wt1", label: "개념 이해 부족형", color: "#EF4444", bgColor: "#FEE2E2", icon: "🧩", desc: "기초 개념 정리가 필요한 유형" },
  { id: "wt2", label: "계산 실수 반복형", color: "#F97316", bgColor: "#FFEDD5", icon: "🔢", desc: "풀이 과정에서 실수가 잦은 유형" },
  { id: "wt3", label: "시간 압박형", color: "#FBBF24", bgColor: "#FEF3C7", icon: "⏱️", desc: "시간 내 풀이 완료가 어려운 유형" },
  { id: "wt4", label: "선행 개념 결손형", color: "#8B5CF6", bgColor: "#EDE9FE", icon: "🔗", desc: "이전 단원 이해가 부족한 유형" },
  { id: "wt5", label: "특정 유형 편중형", color: "#EC4899", bgColor: "#FCE7F3", icon: "📊", desc: "특정 문제 유형에 취약한 유형" },
  { id: "wt6", label: "성과 변동형", color: "#6366F1", bgColor: "#E0E7FF", icon: "📈", desc: "시험마다 점수 변동이 큰 유형" },
];

DEMO_ACCOUNTS.splice(0, DEMO_ACCOUNTS.length,
  { email: "instructor@unitflow.ai", password: "demo1234", role: "instructor", name: "김민수 선생님" },
  { email: "student@unitflow.ai", password: "demo1234", role: "student", name: "이서연 학생" },
  { email: "admin@unitflow.ai", password: "demo1234", role: "admin", name: "관리자" },
);

SUBJECTS.splice(0, SUBJECTS.length,
  { id: "s1", name: "국어", color: "#3B82F6", icon: "국" },
  { id: "s2", name: "수학", color: "#6366F1", icon: "수" },
  { id: "s3", name: "영어", color: "#10B981", icon: "영" },
  { id: "s4", name: "과학탐구", color: "#F59E0B", icon: "과" },
  { id: "s5", name: "사회탐구", color: "#EC4899", icon: "사" },
);

WEAKNESS_TYPES.splice(0, WEAKNESS_TYPES.length,
  { id: "wt1", label: "개념 이해 부족형", color: "#EF4444", bgColor: "#FEE2E2", icon: "개", desc: "기초 개념 재정리 우선 유형" },
  { id: "wt2", label: "계산 실수 반복형", color: "#F97316", bgColor: "#FFEDD5", icon: "계", desc: "풀이 과정에서 실수가 반복되는 유형" },
  { id: "wt3", label: "시간 압박형", color: "#FBBF24", bgColor: "#FEF3C7", icon: "시", desc: "시간 부족으로 완료가 어려운 유형" },
  { id: "wt4", label: "선행 개념 결손형", color: "#8B5CF6", bgColor: "#EDE9FE", icon: "선", desc: "이전 단원 이해가 부족한 유형" },
  { id: "wt5", label: "특정 유형 편중형", color: "#EC4899", bgColor: "#FCE7F3", icon: "유", desc: "특정 문제 유형에 취약한 유형" },
  { id: "wt6", label: "성과 변동형", color: "#6366F1", bgColor: "#E0E7FF", icon: "변", desc: "시험마다 점수 변동이 큰 유형" },
);

const STUDENTS = [
  {
    id: "st1", name: "이서연", grade: "고3", classGroup: "A반", targetUniv: "서울대학교 경영학과",
    profileImg: null,
    subjects: {
      s1: { current: 78, target: 88, trend: [68, 72, 75, 78], stability: 0.82 },
      s2: { current: 65, target: 92, trend: [55, 58, 62, 65], stability: 0.68 },
      s3: { current: 82, target: 85, trend: [78, 80, 81, 82], stability: 0.91 },
      s4: { current: 58, target: 80, trend: [50, 55, 52, 58], stability: 0.55 },
      s5: { current: 75, target: 78, trend: [70, 72, 74, 75], stability: 0.88 },
    },
    weaknessTypes: ["wt1", "wt4", "wt6"],
    weakUnits: ["u9", "u17", "u4", "u10", "u19"],
    recentExams: [
      { id: "e1", name: "3월 모의고사", date: "2025-03-15", totalScore: 285, maxScore: 400 },
      { id: "e2", name: "4월 학력평가", date: "2025-04-20", totalScore: 298, maxScore: 400 },
      { id: "e3", name: "5월 중간고사", date: "2025-05-10", totalScore: 310, maxScore: 400 },
      { id: "e4", name: "6월 모의고사", date: "2025-06-05", totalScore: 322, maxScore: 400 },
    ],
    consultPriority: "high",
    gapScore: 27,
  },
  {
    id: "st2", name: "박준호", grade: "고3", classGroup: "A반", targetUniv: "연세대학교 컴퓨터공학과",
    subjects: {
      s1: { current: 72, target: 80, trend: [65, 68, 70, 72], stability: 0.78 },
      s2: { current: 88, target: 90, trend: [82, 85, 87, 88], stability: 0.92 },
      s3: { current: 76, target: 82, trend: [70, 73, 75, 76], stability: 0.80 },
      s4: { current: 85, target: 88, trend: [78, 80, 83, 85], stability: 0.88 },
      s5: { current: 68, target: 72, trend: [62, 64, 66, 68], stability: 0.75 },
    },
    weaknessTypes: ["wt3"],
    weakUnits: ["u2", "u6"],
    recentExams: [
      { id: "e1", name: "3월 모의고사", date: "2025-03-15", totalScore: 320, maxScore: 400 },
      { id: "e2", name: "4월 학력평가", date: "2025-04-20", totalScore: 330, maxScore: 400 },
      { id: "e3", name: "5월 중간고사", date: "2025-05-10", totalScore: 338, maxScore: 400 },
      { id: "e4", name: "6월 모의고사", date: "2025-06-05", totalScore: 345, maxScore: 400 },
    ],
    consultPriority: "medium",
    gapScore: 8,
  },
  {
    id: "st3", name: "최유진", grade: "고3", classGroup: "B반", targetUniv: "고려대학교 영어영문학과",
    subjects: {
      s1: { current: 85, target: 88, trend: [80, 82, 84, 85], stability: 0.90 },
      s2: { current: 60, target: 75, trend: [52, 55, 58, 60], stability: 0.62 },
      s3: { current: 90, target: 92, trend: [85, 87, 89, 90], stability: 0.95 },
      s4: { current: 62, target: 70, trend: [55, 58, 60, 62], stability: 0.65 },
      s5: { current: 80, target: 82, trend: [75, 77, 79, 80], stability: 0.87 },
    },
    weaknessTypes: ["wt2", "wt5"],
    weakUnits: ["u9", "u10", "u17"],
    recentExams: [
      { id: "e1", name: "3월 모의고사", date: "2025-03-15", totalScore: 305, maxScore: 400 },
      { id: "e2", name: "4월 학력평가", date: "2025-04-20", totalScore: 312, maxScore: 400 },
      { id: "e3", name: "5월 중간고사", date: "2025-05-10", totalScore: 318, maxScore: 400 },
      { id: "e4", name: "6월 모의고사", date: "2025-06-05", totalScore: 325, maxScore: 400 },
    ],
    consultPriority: "medium",
    gapScore: 14,
  },
  {
    id: "st4", name: "정하은", grade: "고3", classGroup: "A반", targetUniv: "서울대학교 물리학과",
    subjects: {
      s1: { current: 70, target: 82, trend: [62, 65, 68, 70], stability: 0.72 },
      s2: { current: 78, target: 95, trend: [68, 72, 75, 78], stability: 0.75 },
      s3: { current: 68, target: 78, trend: [60, 63, 65, 68], stability: 0.70 },
      s4: { current: 72, target: 92, trend: [60, 65, 68, 72], stability: 0.60 },
      s5: { current: 65, target: 70, trend: [58, 60, 62, 65], stability: 0.78 },
    },
    weaknessTypes: ["wt1", "wt3", "wt6"],
    weakUnits: ["u9", "u17", "u16", "u19"],
    recentExams: [
      { id: "e1", name: "3월 모의고사", date: "2025-03-15", totalScore: 275, maxScore: 400 },
      { id: "e2", name: "4월 학력평가", date: "2025-04-20", totalScore: 290, maxScore: 400 },
      { id: "e3", name: "5월 중간고사", date: "2025-05-10", totalScore: 298, maxScore: 400 },
      { id: "e4", name: "6월 모의고사", date: "2025-06-05", totalScore: 310, maxScore: 400 },
    ],
    consultPriority: "high",
    gapScore: 32,
  },
  {
    id: "st5", name: "김도윤", grade: "고3", classGroup: "B반", targetUniv: "성균관대학교 경제학과",
    subjects: {
      s1: { current: 80, target: 82, trend: [75, 77, 79, 80], stability: 0.88 },
      s2: { current: 75, target: 80, trend: [68, 71, 73, 75], stability: 0.82 },
      s3: { current: 78, target: 80, trend: [72, 74, 76, 78], stability: 0.85 },
      s4: { current: 70, target: 75, trend: [64, 66, 68, 70], stability: 0.80 },
      s5: { current: 82, target: 84, trend: [76, 78, 80, 82], stability: 0.90 },
    },
    weaknessTypes: ["wt5"],
    weakUnits: ["u4", "u13"],
    recentExams: [
      { id: "e1", name: "3월 모의고사", date: "2025-03-15", totalScore: 315, maxScore: 400 },
      { id: "e2", name: "4월 학력평가", date: "2025-04-20", totalScore: 322, maxScore: 400 },
      { id: "e3", name: "5월 중간고사", date: "2025-05-10", totalScore: 328, maxScore: 400 },
      { id: "e4", name: "6월 모의고사", date: "2025-06-05", totalScore: 335, maxScore: 400 },
    ],
    consultPriority: "low",
    gapScore: 5,
  },
];

const UNIVERSITIES = [
  {
    id: "univ1", name: "서울대학교", admissionType: "정시",
    weights: { s1: 25, s2: 30, s3: 20, s4: 15, s5: 10 },
    requiredSubjects: ["국어", "수학", "영어", "탐구2"],
    bonusRules: "수학 만점 시 총점 3% 가산",
    notes: "과학탐구 2과목 평균 반영, 탐구 변환 표준점수 적용",
  },
  {
    id: "univ2", name: "연세대학교", admissionType: "정시",
    weights: { s1: 22, s2: 28, s3: 25, s4: 15, s5: 10 },
    requiredSubjects: ["국어", "수학", "영어", "탐구2"],
    bonusRules: "영어 1등급 감점 없음, 2등급부터 -1점",
    notes: "영어 절대평가 등급별 환산, 탐구 백분위 반영",
  },
  {
    id: "univ3", name: "고려대학교", admissionType: "정시",
    weights: { s1: 25, s2: 25, s3: 25, s4: 15, s5: 10 },
    requiredSubjects: ["국어", "수학", "영어", "탐구2"],
    bonusRules: "탐구 상위 1과목 5% 가중",
    notes: "국어·수학·영어 균등 반영, 탐구 가중 적용",
  },
];

const EXAMS = [
  { id: "e1", name: "3월 모의고사", date: "2025-03-15", status: "완료", subject: "전과목", questionCount: 80, avgScore: 72, participantCount: 5 },
  { id: "e2", name: "4월 학력평가", date: "2025-04-20", status: "완료", subject: "전과목", questionCount: 80, avgScore: 76, participantCount: 5 },
  { id: "e3", name: "5월 중간고사", date: "2025-05-10", status: "완료", subject: "전과목", questionCount: 90, avgScore: 78, participantCount: 5 },
  { id: "e4", name: "6월 모의고사", date: "2025-06-05", status: "완료", subject: "전과목", questionCount: 85, avgScore: 80, participantCount: 5 },
  { id: "e5", name: "7월 학력평가", date: "2025-07-15", status: "예정", subject: "전과목", questionCount: 80, avgScore: null, participantCount: 0 },
];

const API_BASE_URL = (typeof window !== "undefined" && window.__UNITFLOW_API_BASE_URL__) || "http://localhost:8000";
const AUTH_STORAGE_KEY = "unitflow-frontend-auth";

function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function storeSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function apiRequest(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

const SUBJECT_CODE_META = {
  KOR: { id: "s1", label: "Korean", color: theme.colors.primary500 },
  MATH: { id: "s2", label: "Mathematics", color: theme.colors.ai500 },
  ENG: { id: "s3", label: "English", color: theme.colors.success500 },
  SCI: { id: "s4", label: "Science Inquiry", color: theme.colors.accent500 },
  SOC: { id: "s5", label: "Social Inquiry", color: theme.colors.danger500 },
};

function buildMockInstructorDashboard() {
  const highPriorityStudents = [...STUDENTS].sort((a, b) => b.gapScore - a.gapScore).slice(0, 4);
  const weaknessDistribution = WEAKNESS_TYPES.map((type) => ({
    weaknessTypeId: type.id,
    label: type.label || type.id,
    count: STUDENTS.filter((student) => student.weaknessTypes.includes(type.id)).length,
  })).filter((item) => item.count > 0);
  const weakUnits = Object.entries(UNITS)
    .flatMap(([subjectId, units]) => units.map((unit) => ({ unitId: unit.id, unitName: unit.name, subjectCode: subjectId, mastery: unit.mastery })))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5);

  return {
    stats: [
      { label: "Managed students", value: `${STUDENTS.length}`, sub: "mock fallback" },
      { label: "Priority consults", value: `${highPriorityStudents.length}`, sub: "gap based" },
      { label: "Latest average", value: `${EXAMS.filter((exam) => exam.avgScore).slice(-1)[0]?.avgScore || "-"}`, sub: "mock exam" },
      { label: "Strategies", value: "3", sub: "fallback data" },
    ],
    consultPriorityStudents: highPriorityStudents,
    weaknessDistribution,
    examTrend: EXAMS.filter((exam) => exam.avgScore).map((exam) => ({ name: exam.name, averageScore: exam.avgScore })),
    weakUnits,
    recentStrategies: highPriorityStudents.slice(0, 3).map((student) => ({
      studentId: student.id,
      studentName: student.name,
      consultPriority: student.consultPriority,
      weaknessTypes: student.weaknessTypes,
      summary: "Fallback strategy summary for local preview mode.",
    })),
  };
}

function buildMockStudentDetail(studentId) {
  const student = STUDENTS.find((item) => item.id === studentId) || STUDENTS[0];
  const subjects = Object.entries(student.subjects || {}).map(([subjectId, subject]) => {
    const code = Object.entries(SUBJECT_CODE_META).find(([, meta]) => meta.id === subjectId)?.[0] || subjectId.toUpperCase();
    return {
      subjectId,
      subjectCode: code,
      subjectName: SUBJECT_CODE_META[code]?.label || code,
      currentScore: subject.current,
      targetScore: subject.target,
      trend: subject.trend || [],
      stability: subject.stability || 0,
      universityWeight: 0,
      isPreferred: false,
    };
  });

  const weakUnits = (student.weakUnits || []).map((unitId) => {
    const subjectEntry = Object.entries(UNITS).find(([, units]) => units.some((unit) => unit.id === unitId));
    const unit = subjectEntry?.[1].find((item) => item.id === unitId);
    return {
      unitId,
      unitName: unit?.name || `Unit ${unitId}`,
      subjectCode: subjectEntry?.[0] || "",
      mastery: unit?.mastery || 0,
    };
  });

  return {
    student,
    subjects,
    diagnosis: {
      primaryWeaknessType: student.weaknessTypes?.[0] || null,
      weaknessTypes: student.weaknessTypes || [],
      evidence: [],
    },
    strategy: {
      summary: "Fallback student strategy preview.",
      prioritySubjects: subjects.slice(0, 3).map((subject) => ({ subject_code: subject.subjectCode, latest_score: subject.currentScore })),
      priorityUnits: weakUnits.slice(0, 3),
      timeAllocation: subjects.slice(0, 3).map((subject, index) => ({ subject_code: subject.subjectCode, ratio_percent: [40, 35, 25][index] || 20 })),
      coachingPoints: [],
      antiPatterns: [],
    },
    weakUnits,
    targetGap: {
      university_name: student.targetUniv,
      gap: student.gapScore,
      weighted_score: student.recentExams?.[student.recentExams.length - 1]?.totalScore || 0,
      target_score: (student.recentExams?.[student.recentExams.length - 1]?.totalScore || 0) + student.gapScore,
    },
  };
}

function buildMockUniversityPolicies() {
  const idToCode = { s1: "KOR", s2: "MATH", s3: "ENG", s4: "SCI", s5: "SOC" };
  return {
    universities: UNIVERSITIES.map((university) => ({
      id: university.id,
      universityName: university.name,
      admissionType: university.admissionType,
      subjectWeights: Object.fromEntries(
        Object.entries(university.weights || {}).map(([subjectId, weight]) => [idToCode[subjectId] || subjectId, weight / 100])
      ),
      requiredSubjects: university.requiredSubjects || [],
      bonusRules: [{ text: university.bonusRules }],
      targetScore: 84,
      notes: university.notes,
    })),
  };
}

// AI Strategy for student st1
const AI_STRATEGY_ST1 = {
  summary: "수학과 과학탐구의 기초 개념 보강이 최우선입니다. 서울대 경영학과 반영비중을 고려할 때, 수학 점수 상승이 합격 가능성에 가장 큰 영향을 미칩니다.",
  priority: "긴급",
  generatedAt: "2025-06-06T10:30:00",
  topStrategy: {
    title: "수학 미적분 개념 재정립 + 과탐 전자기 집중 보강",
    reason: "서울대 경영학과는 수학 반영비중 30%로 가장 높으며, 현재 목표 대비 27점 부족합니다. 미적분과 확률통계에서 개념 이해 부족 패턴이 반복되고 있어, 기초 개념 재정립이 점수 상승의 가장 빠른 경로입니다.",
  },
  strategies: [
    {
      subject: "수학",
      priority: 1,
      action: "미적분 기초 개념 재정립 → 확률과 통계 유형별 풀이 훈련",
      timeAllocation: 35,
      expectedGain: 15,
      evidence: "최근 4회 시험에서 미적분 정답률 48%, 확률통계 55%. 개념형 문항 오답률 68%로 계산 실수가 아닌 이해도 문제 확인",
    },
    {
      subject: "과학탐구",
      priority: 2,
      action: "전자기 단원 선행개념 보충 → 반응속도 공식 적용 훈련",
      timeAllocation: 25,
      expectedGain: 12,
      evidence: "전자기 단원 이해도 45%로 전체 최저. 선행 개념(역학) 결손이 원인으로 추정. 역학 복습 후 전자기 재학습 권장",
    },
    {
      subject: "국어",
      priority: 3,
      action: "독서 과학기술 지문 집중 연습 + 고전소설 배경지식 보충",
      timeAllocation: 20,
      expectedGain: 8,
      evidence: "화법과 작문(88)은 안정권이나 독서 과학기술(58)에서 큰 손실 발생. 목표 대비 10점 부족",
    },
    {
      subject: "영어",
      priority: 4,
      action: "현재 수준 유지 (주 2회 모의고사 풀이)",
      timeAllocation: 12,
      expectedGain: 3,
      evidence: "안정도 0.91로 가장 높음. 목표(85) 대비 3점 부족으로 유지 전략이 효율적",
    },
    {
      subject: "사회탐구",
      priority: 5,
      action: "주 1회 단원 복습으로 현재 수준 유지",
      timeAllocation: 8,
      expectedGain: 2,
      evidence: "목표 대비 3점 부족, 안정도 0.88. 추가 투자 대비 효율이 낮아 유지 전략 권장",
    },
  ],
  consultPoints: [
    "미적분 개념 이해 상태를 직접 확인해주세요. 공식 암기는 하고 있으나 적용 단계에서 혼란이 보입니다.",
    "과학탐구 성과 변동이 큽니다(안정도 0.55). 시험 불안이나 컨디션 요인도 점검해주세요.",
    "학습 시간을 수학과 과탐에 집중 재배분하되, 영어는 과도하게 줄이지 않도록 안내해주세요.",
  ],
  cautions: [
    "국어 점수가 안정적이라고 방치하면 하락 위험이 있습니다. 최소 주 1회 독서 지문 연습을 유지하세요.",
    "과학탐구의 변동성이 높아 단기간 급상승을 기대하기보다 안정적 상승을 목표로 하세요.",
  ],
  univGap: {
    totalCurrent: 322,
    totalTarget: 370,
    gap: 48,
    bySubject: [
      { subject: "수학", current: 65, target: 92, gap: 27, weight: 30 },
      { subject: "과학탐구", current: 58, target: 80, gap: 22, weight: 15 },
      { subject: "국어", current: 78, target: 88, gap: 10, weight: 25 },
      { subject: "영어", current: 82, target: 85, gap: 3, weight: 20 },
      { subject: "사회탐구", current: 75, target: 78, gap: 3, weight: 10 },
    ],
  },
};


/* ═══════════════════════════════════════════════════════
   CONTEXT & AUTH
   ═══════════════════════════════════════════════════════ */

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

/* ═══════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════ */

const baseStyles = {
  page: {
    fontFamily: fontStack,
    background: theme.colors.slate50,
    minHeight: "100vh",
    color: theme.colors.slate800,
    lineHeight: 1.6,
    WebkitFontSmoothing: "antialiased",
  },
  card: {
    background: theme.colors.white,
    borderRadius: theme.radius.xl,
    border: `1px solid ${theme.colors.slate200}`,
    padding: "24px",
    boxShadow: theme.shadow.sm,
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
  },
  cardHover: {
    boxShadow: theme.shadow.md,
    transform: "translateY(-1px)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: theme.radius.full,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  btnPrimary: {
    background: theme.colors.primary600,
    color: theme.colors.white,
    border: "none",
    borderRadius: theme.radius.lg,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
    fontFamily: fontStack,
  },
  btnSecondary: {
    background: theme.colors.white,
    color: theme.colors.slate700,
    border: `1px solid ${theme.colors.slate200}`,
    borderRadius: theme.radius.lg,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
    fontFamily: fontStack,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.colors.slate800,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.slate500,
    margin: "4px 0 0 0",
  },
};

/* ═══════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════ */

function LoadingSkeleton({ lines = 3, style }) {
  return (
    <div style={{ ...style, display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 6,
          background: `linear-gradient(90deg, ${theme.colors.slate100} 25%, ${theme.colors.slate200} 50%, ${theme.colors.slate100} 75%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          width: i === lines - 1 ? "60%" : "100%",
        }} />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, description, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{
        width: 56, height: 56, borderRadius: theme.radius.xl, background: theme.colors.slate100,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        <Icon size={24} color={theme.colors.slate400} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.slate700, margin: "0 0 6px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: theme.colors.slate500, margin: 0 }}>{description}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

function WeaknessBadge({ typeId, size = "md" }) {
  const wt = WEAKNESS_TYPES.find(w => w.id === typeId);
  if (!wt) return null;
  const isSmall = size === "sm";
  return (
    <span style={{
      ...baseStyles.badge,
      background: wt.bgColor,
      color: wt.color,
      fontSize: isSmall ? 11 : 12,
      padding: isSmall ? "2px 8px" : "4px 12px",
      border: `1px solid ${wt.color}22`,
    }}>
      <span style={{ fontSize: isSmall ? 12 : 14 }}>{wt.icon}</span>
      {wt.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    high: { bg: theme.colors.danger50, color: theme.colors.danger500, border: `${theme.colors.danger500}22`, text: "상담 우선" },
    medium: { bg: theme.colors.accent50, color: theme.colors.accent500, border: `${theme.colors.accent500}22`, text: "관심 필요" },
    low: { bg: theme.colors.success50, color: theme.colors.success500, border: `${theme.colors.success500}22`, text: "양호" },
  };
  const p = map[priority] || map.low;
  return (
    <span style={{ ...baseStyles.badge, background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
      {priority === "high" && <AlertTriangle size={12} />}
      {priority === "medium" && <Eye size={12} />}
      {priority === "low" && <CheckCircle size={12} />}
      {p.text}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend, color = theme.colors.primary600, bgColor = theme.colors.primary50 }) {
  return (
    <div style={{ ...baseStyles.card, display: "flex", alignItems: "flex-start", gap: 16, padding: "20px" }}>
      <div style={{
        width: 44, height: 44, borderRadius: theme.radius.lg, background: bgColor,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: theme.colors.slate500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.slate800, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: theme.colors.slate400, marginTop: 2 }}>{sub}</div>}
      </div>
      {trend !== undefined && (
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          color: trend > 0 ? theme.colors.success500 : trend < 0 ? theme.colors.danger500 : theme.colors.slate400,
          fontSize: 13, fontWeight: 600,
        }}>
          {trend > 0 ? <ArrowUp size={14} /> : trend < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <h2 style={{ ...baseStyles.sectionTitle }}>
          {Icon && <Icon size={20} color={theme.colors.primary600} />}
          {title}
        </h2>
        {subtitle && <p style={baseStyles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = theme.colors.primary500, height = 8, showLabel = false }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{
        flex: 1, height, borderRadius: height, background: theme.colors.slate100, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: height,
          background: color,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate600, minWidth: 36, textAlign: "right" }}>{Math.round(pct)}%</span>}
    </div>
  );
}

function GapBar({ current, target, label, color = theme.colors.primary500 }) {
  const gap = target - current;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{label}</span>
        <span style={{ fontSize: 12, color: theme.colors.slate500 }}>
          {current} → {target}
          <span style={{ color: gap > 10 ? theme.colors.danger500 : gap > 5 ? theme.colors.accent500 : theme.colors.success500, fontWeight: 600, marginLeft: 6 }}>
            {gap > 0 ? `−${gap}` : "달성"}
          </span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: theme.colors.slate100 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 5,
          width: `${(target / 100) * 100}%`,
          background: `${color}18`,
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 5,
          width: `${(current / 100) * 100}%`,
          background: color,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function AIBadge({ small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
      color: "#fff", borderRadius: theme.radius.full,
      padding: small ? "2px 8px" : "3px 10px",
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.5,
    }}>
      <Sparkles size={small ? 10 : 12} />
      AI
    </span>
  );
}

function DemoHelper({ text }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      background: theme.colors.ai50, border: `1px solid ${theme.colors.ai400}33`,
      borderRadius: theme.radius.lg, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
      fontSize: 13, color: theme.colors.ai600,
    }}>
      <HelpCircle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={() => setDismissed(true)} style={{
        background: "none", border: "none", cursor: "pointer", padding: 4,
        color: theme.colors.ai400, display: "flex",
      }}>
        <X size={14} />
      </button>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.colors.slate800, color: "#fff", padding: "8px 12px",
      borderRadius: theme.radius.md, fontSize: 12, boxShadow: theme.shadow.lg,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
          <span>{p.name}: {p.value}점</span>
        </div>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════ */

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hoveredDemo, setHoveredDemo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      const response = await apiRequest("/frontend/login", {
        method: "POST",
        body: { email, password },
      });
      const session = {
        accessToken: response.accessToken,
        user: response.user,
      };
      storeSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/frontend/login", {
        method: "POST",
        body: { email: account.email, password: account.password },
      });
      const session = {
        accessToken: response.accessToken,
        user: response.user,
      };
      storeSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "데모 계정 로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      ...baseStyles.page,
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${theme.colors.slate50} 0%, ${theme.colors.primary50} 50%, ${theme.colors.ai50} 100%)`,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `radial-gradient(${theme.colors.primary200}40 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        opacity: 0.5,
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: theme.radius.xl,
              background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 16px ${theme.colors.primary600}40`,
            }}>
              <Brain size={26} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: theme.colors.slate900, letterSpacing: -0.5 }}>UnitFlow</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.colors.primary600, letterSpacing: 2, textTransform: "uppercase" }}>AI Learning Strategy</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: theme.colors.slate500, marginTop: 12 }}>
            학생 맞춤 AI 진단 · 목표 대학 전략 생성
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          ...baseStyles.card, padding: "32px",
          boxShadow: theme.shadow.xl,
          borderRadius: theme.radius["2xl"],
        }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>이메일</label>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder="이메일을 입력하세요"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: theme.radius.lg,
                border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                fontSize: 14, outline: "none", fontFamily: fontStack,
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = theme.colors.primary500}
              onBlur={e => e.target.style.borderColor = error ? theme.colors.danger500 : theme.colors.slate200}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>비밀번호</label>
            <input
              type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="비밀번호를 입력하세요"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: theme.radius.lg,
                border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                fontSize: 14, outline: "none", fontFamily: fontStack,
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = theme.colors.primary500}
              onBlur={e => e.target.style.borderColor = error ? theme.colors.danger500 : theme.colors.slate200}
            />
          </div>

          {error && (
            <div style={{
              background: theme.colors.danger50, color: theme.colors.danger600,
              padding: "10px 14px", borderRadius: theme.radius.md,
              fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button onClick={handleLogin} style={{
            ...baseStyles.btnPrimary, width: "100%", justifyContent: "center",
            padding: "12px", fontSize: 15, borderRadius: theme.radius.lg,
            background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.primary700})`,
            boxShadow: `0 2px 8px ${theme.colors.primary600}30`,
          }}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        {/* Demo Accounts */}
        <div style={{
          marginTop: 24, background: `${theme.colors.white}90`, backdropFilter: "blur(8px)",
          borderRadius: theme.radius.xl, border: `1px solid ${theme.colors.slate200}`,
          padding: "20px", boxShadow: theme.shadow.sm,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            🎯 데모 계정으로 빠른 체험
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc, i) => {
              const roleInfo = {
                instructor: { icon: Users, label: "강사", color: theme.colors.primary600, bg: theme.colors.primary50 },
                student: { icon: GraduationCap, label: "학생", color: theme.colors.success600, bg: theme.colors.success50 },
                admin: { icon: Shield, label: "관리자", color: theme.colors.ai500, bg: theme.colors.ai50 },
              }[acc.role];
              const Icon = roleInfo.icon;
              return (
                <button key={i}
                  onClick={() => quickLogin(acc)}
                  onMouseEnter={() => setHoveredDemo(i)}
                  onMouseLeave={() => setHoveredDemo(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: theme.radius.lg,
                    border: `1px solid ${hoveredDemo === i ? roleInfo.color + "40" : theme.colors.slate200}`,
                    background: hoveredDemo === i ? roleInfo.bg : theme.colors.white,
                    cursor: "pointer", transition: "all 0.15s", fontFamily: fontStack,
                    width: "100%", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: theme.radius.md,
                    background: roleInfo.bg, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} color={roleInfo.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.slate800 }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: theme.colors.slate400 }}>{acc.email}</div>
                  </div>
                  <span style={{ ...baseStyles.badge, background: roleInfo.bg, color: roleInfo.color, fontSize: 11 }}>
                    {roleInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   APP LAYOUT (Sidebar + Topbar)
   ═══════════════════════════════════════════════════════ */

function AppLayout({ user, currentPage, setCurrentPage, onLogout, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = useMemo(() => {
    const base = [
      { id: "dashboard", label: "대시보드", icon: Home },
    ];
    if (user.role === "instructor" || user.role === "admin") {
      base.push(
        { id: "students", label: "학생 관리", icon: Users },
        { id: "exams", label: "시험 관리", icon: FileText },
        { id: "universities", label: "대학 정책", icon: School },
      );
    }
    if (user.role === "student") {
      base.push(
        { id: "my-strategy", label: "나의 전략", icon: Target },
        { id: "my-exams", label: "시험 이력", icon: FileText },
      );
    }
    return base;
  }, [user.role]);

  const roleInfo = {
    instructor: { label: "강사", color: theme.colors.primary600, bg: theme.colors.primary50 },
    student: { label: "학생", color: theme.colors.success600, bg: theme.colors.success50 },
    admin: { label: "관리자", color: theme.colors.ai500, bg: theme.colors.ai50 },
  }[user.role];

  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  return (
    <div style={{ ...baseStyles.page, display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth, background: theme.colors.white,
        borderRight: `1px solid ${theme.colors.slate200}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s ease",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
        boxShadow: theme.shadow.sm,
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "20px 12px" : "20px 20px",
          borderBottom: `1px solid ${theme.colors.slate100}`,
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: theme.radius.lg,
            background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Brain size={20} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: theme.colors.slate900, lineHeight: 1.2 }}>UnitFlow</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: theme.colors.primary600, letterSpacing: 1.5, textTransform: "uppercase" }}>AI Strategy</div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id || (item.id === "students" && currentPage.startsWith("student-"));
            return (
              <button key={item.id}
                onClick={() => { setCurrentPage(item.id); setMobileMenuOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: sidebarCollapsed ? "10px" : "10px 14px",
                  borderRadius: theme.radius.lg, border: "none",
                  background: active ? theme.colors.primary50 : "transparent",
                  color: active ? theme.colors.primary700 : theme.colors.slate600,
                  fontWeight: active ? 600 : 500,
                  fontSize: 14, cursor: "pointer", width: "100%",
                  fontFamily: fontStack, transition: "all 0.15s",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                }}
                title={sidebarCollapsed ? item.label : ""}
              >
                <Icon size={19} />
                {!sidebarCollapsed && item.label}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: 8, borderTop: `1px solid ${theme.colors.slate100}` }}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", padding: 8, border: "none", borderRadius: theme.radius.md,
            background: "transparent", cursor: "pointer", color: theme.colors.slate400,
            fontFamily: fontStack, fontSize: 12,
          }}>
            <Menu size={16} />
          </button>
        </div>

        {/* User info */}
        <div style={{
          padding: sidebarCollapsed ? "12px 8px" : "16px 16px",
          borderTop: `1px solid ${theme.colors.slate100}`,
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: theme.radius.full,
            background: roleInfo.bg, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: roleInfo.color, fontSize: 13, flexShrink: 0,
          }}>
            {user.name[0]}
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.slate800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>{roleInfo.label}</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={onLogout} title="로그아웃" style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: theme.colors.slate400, display: "flex",
            }}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1, marginLeft: sidebarWidth,
        transition: "margin-left 0.2s ease",
        minHeight: "100vh",
      }}>
        {/* Topbar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          background: `${theme.colors.white}ee`, backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${theme.colors.slate200}`,
          padding: "0 32px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: theme.colors.slate800, margin: 0 }}>
              {
                {
                  dashboard: user.role === "student" ? "나의 학습 현황" : "대시보드",
                  students: "학생 관리",
                  exams: "시험 관리",
                  universities: "대학 정책",
                  "my-strategy": "나의 학습 전략",
                  "my-exams": "시험 이력",
                }[currentPage] || (currentPage.startsWith("student-") ? "학생 상세" : "대시보드")
              }
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              ...baseStyles.btnSecondary, padding: "8px 12px", borderRadius: theme.radius.lg,
            }}>
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   INSTRUCTOR DASHBOARD
   ═══════════════════════════════════════════════════════ */

function LegacyInstructorDashboard_v2({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  if (loading) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ ...baseStyles.card }}><LoadingSkeleton lines={3} /></div>
      ))}
    </div>
  );

  const highPriorityStudents = STUDENTS.filter(s => s.consultPriority === "high");
  const weaknessDistribution = WEAKNESS_TYPES.map(wt => ({
    name: wt.label.replace("형", ""),
    count: STUDENTS.filter(s => s.weaknessTypes.includes(wt.id)).length,
    icon: wt.icon,
    color: wt.color,
  })).filter(w => w.count > 0);

  const avgTrend = EXAMS.filter(e => e.avgScore).map(e => ({ name: e.name.replace("고사", "").replace("평가", ""), 평균: e.avgScore }));

  return (
    <div>
      <DemoHelper text="이 화면은 강사용 대시보드입니다. 학생 상담 우선순위, 취약 유형 분포, 최근 시험 추이를 한눈에 확인할 수 있습니다." />

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={Users} label="관리 학생" value={`${STUDENTS.length}명`} sub="A반 3명 · B반 2명" color={theme.colors.primary600} bgColor={theme.colors.primary50} />
        <StatCard icon={AlertTriangle} label="상담 우선" value={`${highPriorityStudents.length}명`} sub="목표 대비 갭이 큰 학생" color={theme.colors.danger500} bgColor={theme.colors.danger50} />
        <StatCard icon={TrendingUp} label="최근 평균" value="80점" sub="6월 모의고사 기준" trend={5} color={theme.colors.success500} bgColor={theme.colors.success50} />
        <StatCard icon={Brain} label="AI 전략 생성" value="5건" sub="오늘 새로 갱신됨" color={theme.colors.ai500} bgColor={theme.colors.ai50} />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Consult Priority */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={AlertTriangle} title="상담 우선 학생" subtitle="목표 대학 대비 갭이 크거나 성과 변동이 큰 학생" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STUDENTS.sort((a, b) => b.gapScore - a.gapScore).slice(0, 4).map(st => (
              <div key={st.id}
                onClick={() => onNavigate(`student-${st.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.slate100}`,
                  cursor: "pointer", transition: "all 0.15s",
                  background: st.consultPriority === "high" ? theme.colors.danger50 + "60" : theme.colors.white,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.primary200; e.currentTarget.style.boxShadow = theme.shadow.sm; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.slate100; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: theme.radius.full,
                  background: theme.colors.primary50, display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, color: theme.colors.primary600, fontSize: 15,
                }}>
                  {st.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{st.name}</span>
                    <PriorityBadge priority={st.consultPriority} />
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>
                    {st.targetUniv} · 갭 {st.gapScore}점
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 200 }}>
                  {st.weaknessTypes.slice(0, 2).map(wt => <WeaknessBadge key={wt} typeId={wt} size="sm" />)}
                </div>
                <ChevronRight size={16} color={theme.colors.slate300} />
              </div>
            ))}
          </div>
        </div>

        {/* Weakness Distribution */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Brain} title="취약 유형 분포" subtitle="전체 학생의 취약 유형 진단 결과" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weaknessDistribution.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{w.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{w.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: w.color }}>{w.count}명</span>
                  </div>
                  <ProgressBar value={w.count} max={STUDENTS.length} color={w.color} height={6} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Score Trend */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={TrendingUp} title="전체 평균 점수 추이" subtitle="최근 시험별 반 평균 점수 변화" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={avgTrend}>
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.colors.primary500} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={theme.colors.primary500} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.slate100} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="평균" stroke={theme.colors.primary500} strokeWidth={2.5} fill="url(#colorAvg)" dot={{ r: 4, fill: theme.colors.primary500, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weak Units Top */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Target} title="보완 필요 단원 TOP 5" subtitle="전체 학생 기준 이해도가 낮은 단원" />
          {(() => {
            const allUnits = Object.values(UNITS).flat();
            const weakest = [...allUnits].sort((a, b) => a.mastery - b.mastery).slice(0, 5);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {weakest.map((u, i) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: theme.radius.full,
                      background: i < 2 ? theme.colors.danger50 : theme.colors.accent50,
                      color: i < 2 ? theme.colors.danger500 : theme.colors.accent500,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{u.name}</div>
                      <ProgressBar value={u.mastery} max={100} color={u.mastery < 50 ? theme.colors.danger500 : u.mastery < 65 ? theme.colors.accent500 : theme.colors.primary500} height={5} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: u.mastery < 50 ? theme.colors.danger500 : theme.colors.slate600, minWidth: 40, textAlign: "right" }}>{u.mastery}%</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent AI Strategies */}
      <div style={{ ...baseStyles.card }}>
        <SectionHeader icon={Sparkles} title="최근 AI 진단/전략" subtitle="새롭게 갱신된 학생별 AI 분석 결과"
          action={<AIBadge />}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {STUDENTS.slice(0, 3).map(st => (
            <div key={st.id}
              onClick={() => onNavigate(`student-${st.id}`)}
              style={{
                padding: "16px", borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.ai400}20`,
                background: `linear-gradient(135deg, ${theme.colors.ai50}60, ${theme.colors.white})`,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = theme.colors.ai400 + "60"}
              onMouseLeave={e => e.currentTarget.style.borderColor = theme.colors.ai400 + "20"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{st.name}</span>
                <PriorityBadge priority={st.consultPriority} />
                <span style={{ fontSize: 11, color: theme.colors.slate400, marginLeft: "auto" }}>방금 전</span>
              </div>
              <p style={{ fontSize: 13, color: theme.colors.slate600, margin: "0 0 10px", lineHeight: 1.6 }}>
                {st.id === "st1"
                  ? "수학 미적분 개념 재정립이 최우선. 서울대 반영비중 고려 시 수학 투자 효율이 가장 높음."
                  : st.id === "st2"
                    ? "국어 고전소설 배경지식 보충 권장. 전반적 상승 추세가 안정적이며 목표 근접."
                    : "수학 기초 연산 정확도 향상 필요. 영어는 안정권으로 유지 전략 권장."
                }
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {st.weaknessTypes.map(wt => <WeaknessBadge key={wt} typeId={wt} size="sm" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   STUDENT LIST
   ═══════════════════════════════════════════════════════ */

function StudentListPage({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const auth = useAuth();
  const [students, setStudents] = useState(STUDENTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/students", { token: auth.accessToken });
        if (cancelled) return;
        setStudents(response.students || STUDENTS);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setStudents(STUDENTS);
        setLoadError(error instanceof Error ? error.message : "학생 목록 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const filtered = students.filter(s => {
    const targetUniv = s.targetUniv || "";
    const matchSearch = s.name.includes(searchTerm) || targetUniv.includes(searchTerm);
    const matchClass = filterClass === "all" || s.classGroup === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div>
      <DemoHelper text="학생 목록에서 이름을 클릭하면 상세 진단/전략 화면으로 이동합니다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 목록 API 호출 실패. 예시 데이터 표시 중.
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={theme.colors.slate400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="학생 이름, 목표 대학으로 검색"
            style={{
              width: "100%", padding: "10px 14px 10px 38px", borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.slate200}`, fontSize: 14, outline: "none",
              fontFamily: fontStack, boxSizing: "border-box",
            }}
          />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{
          padding: "10px 14px", borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.slate200}`, fontSize: 14,
          fontFamily: fontStack, background: theme.colors.white, color: theme.colors.slate700,
          cursor: "pointer",
        }}>
          <option value="all">전체 반</option>
          <option value="A반">A반</option>
          <option value="B반">B반</option>
        </select>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["학생", "반", "목표 대학", "최근 점수", "갭", "취약 유형", "상담"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left", fontSize: 12,
                  fontWeight: 600, color: theme.colors.slate500, whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(st => (
              <tr key={st.id}
                onClick={() => onNavigate(`student-${st.id}`)}
                style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = theme.colors.slate50}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: theme.radius.full,
                      background: theme.colors.primary50, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, color: theme.colors.primary600, fontSize: 14,
                    }}>{st.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{st.name}</div>
                      <div style={{ fontSize: 12, color: theme.colors.slate400 }}>{st.grade}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{st.classGroup}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{st.targetUniv || "미설정"}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                  {st.recentExams[st.recentExams.length - 1]?.totalScore || "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: st.gapScore > 20 ? theme.colors.danger500 : st.gapScore > 10 ? theme.colors.accent500 : theme.colors.success500,
                  }}>−{st.gapScore}점</span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {st.weaknessTypes.slice(0, 2).map(wt => <WeaknessBadge key={wt} typeId={wt} size="sm" />)}
                    {st.weaknessTypes.length > 2 && <span style={{ fontSize: 11, color: theme.colors.slate400 }}>+{st.weaknessTypes.length - 2}</span>}
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}><PriorityBadge priority={st.consultPriority} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={Search} title="검색 결과 없음" description="검색 조건을 변경해보세요." />}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   STUDENT DETAIL PAGE (CORE DEMO SCREEN)
   ═══════════════════════════════════════════════════════ */

function LegacyStudentDetailPage_v2({ studentId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { setLoading(true); setTimeout(() => setLoading(false), 500); }, [studentId]);

  const student = STUDENTS.find(s => s.id === studentId);
  if (!student) return <EmptyState icon={Users} title="학생을 찾을 수 없습니다" description="유효하지 않은 학생 ID입니다." />;

  const strategy = AI_STRATEGY_ST1; // Using st1's strategy as demo for all
  const subjectData = SUBJECTS.map(sub => ({
    ...sub,
    ...student.subjects[sub.id],
  })).filter(s => s.current);

  if (loading) return (
    <div>
      <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
        <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: "진단 요약" },
    { id: "strategy", label: "AI 전략" },
    { id: "subjects", label: "과목 분석" },
    { id: "exams", label: "시험 이력" },
  ];

  const trendData = student.recentExams.map((exam, i) => {
    const d = { name: exam.name.replace("고사", "").replace("평가", "") };
    subjectData.forEach(sub => {
      d[sub.name] = sub.trend?.[i] || 0;
    });
    return d;
  });

  const radarData = subjectData.map(s => ({
    subject: s.name, 현재: s.current, 목표: s.target,
  }));

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{
        ...baseStyles.btnSecondary, marginBottom: 16, padding: "8px 14px",
      }}>
        <ArrowLeft size={16} /> 학생 목록으로
      </button>

      {/* Profile Header */}
      <div style={{
        ...baseStyles.card, marginBottom: 20, padding: "24px 28px",
        background: `linear-gradient(135deg, ${theme.colors.white}, ${theme.colors.primary50}40)`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{
            width: 64, height: 64, borderRadius: theme.radius.xl,
            background: `linear-gradient(135deg, ${theme.colors.primary100}, ${theme.colors.ai100})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, color: theme.colors.primary700, fontSize: 24, flexShrink: 0,
          }}>
            {student.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.slate900, margin: 0 }}>{student.name}</h2>
              <PriorityBadge priority={student.consultPriority} />
              {student.weaknessTypes.map(wt => <WeaknessBadge key={wt} typeId={wt} />)}
            </div>
            <div style={{ fontSize: 14, color: theme.colors.slate500, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>{student.grade} · {student.classGroup}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <School size={14} /> {student.targetUniv}
              </span>
            </div>
          </div>
          <div style={{
            display: "flex", gap: 20, alignItems: "center",
            padding: "16px 24px", background: theme.colors.white,
            borderRadius: theme.radius.xl, border: `1px solid ${theme.colors.slate200}`,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.primary600 }}>{student.recentExams[student.recentExams.length - 1]?.totalScore}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>현재 총점</div>
            </div>
            <div style={{ width: 1, height: 40, background: theme.colors.slate200 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: student.gapScore > 20 ? theme.colors.danger500 : theme.colors.accent500 }}>−{student.gapScore}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>목표 대비 갭</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Strategy Card (Hero) */}
      <div style={{
        ...baseStyles.card, marginBottom: 20, padding: 0, overflow: "hidden",
        border: `1px solid ${theme.colors.ai400}30`,
      }}>
        <div style={{
          padding: "20px 24px",
          background: `linear-gradient(135deg, ${theme.colors.ai50}, ${theme.colors.primary50}60)`,
          borderBottom: `1px solid ${theme.colors.ai400}15`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <AIBadge />
            <span style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800 }}>핵심 전략 요약</span>
            <span style={{ fontSize: 11, color: theme.colors.slate400, marginLeft: "auto" }}>
              {new Date(strategy.generatedAt).toLocaleDateString("ko-KR")} 생성
            </span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.ai600, margin: "0 0 8px", lineHeight: 1.4 }}>
            {strategy.topStrategy.title}
          </h3>
          <p style={{ fontSize: 14, color: theme.colors.slate600, margin: 0, lineHeight: 1.7 }}>
            {strategy.topStrategy.reason}
          </p>
        </div>
        <div style={{ padding: "16px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={{
            ...baseStyles.btnPrimary, padding: "8px 16px", fontSize: 13,
            background: `linear-gradient(135deg, ${theme.colors.ai500}, ${theme.colors.ai600})`,
          }}>
            <Sparkles size={14} /> 상세 전략 보기
          </button>
          <button style={{ ...baseStyles.btnSecondary, padding: "8px 16px", fontSize: 13 }}>
            <RefreshCw size={14} /> 재분석
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 20,
        borderBottom: `2px solid ${theme.colors.slate200}`,
      }}>
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 20px", fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? theme.colors.primary600 : theme.colors.slate500,
              background: "none", border: "none", cursor: "pointer",
              borderBottom: `2px solid ${activeTab === tab.id ? theme.colors.primary600 : "transparent"}`,
              marginBottom: -2, fontFamily: fontStack, transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Radar Chart */}
            <div style={{ ...baseStyles.card }}>
              <SectionHeader icon={Target} title="과목별 현재 vs 목표" subtitle="목표 대학 반영 기준 대비 현재 수준" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={theme.colors.slate200} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: theme.colors.slate600 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: theme.colors.slate400 }} />
                  <Radar name="현재" dataKey="현재" stroke={theme.colors.primary500} fill={theme.colors.primary500} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="목표" dataKey="목표" stroke={theme.colors.danger500} fill={theme.colors.danger500} fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Gap */}
            <div style={{ ...baseStyles.card }}>
              <SectionHeader icon={BarChart3} title="과목별 갭 분석" subtitle="목표 점수까지 남은 격차 (대학 반영비중 고려)" />
              {strategy.univGap.bySubject.map((sub, i) => {
                const subj = SUBJECTS.find(s => s.name === sub.subject);
                return (
                  <GapBar key={i} current={sub.current} target={sub.target} label={`${sub.subject} (반영 ${sub.weight}%)`} color={subj?.color || theme.colors.primary500} />
                );
              })}
              <div style={{
                marginTop: 16, padding: "12px 16px", background: theme.colors.accent50,
                borderRadius: theme.radius.md, fontSize: 13, color: theme.colors.slate600,
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <Lightbulb size={16} color={theme.colors.accent500} style={{ flexShrink: 0, marginTop: 1 }} />
                수학(반영 30%)의 갭이 가장 크고 반영비중도 높아, 투자 효율이 가장 높은 과목입니다.
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div style={{ ...baseStyles.card, marginBottom: 20 }}>
            <SectionHeader icon={TrendingUp} title="과목별 점수 추이" subtitle="최근 4회 시험 기준 과목별 변화 흐름" />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.slate100} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
                <Tooltip content={<CustomTooltip />} />
                {subjectData.map((sub, i) => (
                  <Line key={sub.id} type="monotone" dataKey={sub.name} stroke={sub.color}
                    strokeWidth={2} dot={{ r: 3.5, fill: sub.color, strokeWidth: 2, stroke: "#fff" }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              {subjectData.map(s => (
                <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: theme.colors.slate600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Unit Mastery */}
          <div style={{ ...baseStyles.card, marginBottom: 20 }}>
            <SectionHeader icon={BookOpen} title="단원별 이해도" subtitle="보강이 필요한 단원 순으로 정렬" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {Object.entries(UNITS).map(([subId, units]) => {
                const sub = SUBJECTS.find(s => s.id === subId);
                return units.map(unit => {
                  const isWeak = student.weakUnits.includes(unit.id);
                  return (
                    <div key={unit.id} style={{
                      padding: "12px 16px", borderRadius: theme.radius.lg,
                      border: `1px solid ${isWeak ? theme.colors.danger500 + "30" : theme.colors.slate200}`,
                      background: isWeak ? theme.colors.danger50 + "40" : theme.colors.white,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{sub?.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{unit.name}</span>
                        </div>
                        {isWeak && <span style={{ ...baseStyles.badge, background: theme.colors.danger50, color: theme.colors.danger500, fontSize: 10, padding: "2px 6px" }}>보강 필요</span>}
                      </div>
                      <ProgressBar value={unit.mastery} max={100} color={
                        unit.mastery < 50 ? theme.colors.danger500 : unit.mastery < 70 ? theme.colors.accent500 : theme.colors.success500
                      } height={6} showLabel />
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* Consult Points */}
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Users} title="강사 상담 포인트" subtitle="AI가 분석한 이 학생과의 상담 시 주요 체크포인트" action={<AIBadge />} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {strategy.consultPoints.map((point, i) => (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: theme.radius.lg,
                  background: theme.colors.primary50 + "60",
                  border: `1px solid ${theme.colors.primary200}40`,
                  fontSize: 14, color: theme.colors.slate700, lineHeight: 1.6,
                  display: "flex", gap: 10,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: theme.radius.full,
                    background: theme.colors.primary100, color: theme.colors.primary600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "strategy" && (
        <div>
          {/* Time Allocation */}
          <div style={{ ...baseStyles.card, marginBottom: 20 }}>
            <SectionHeader icon={Clock} title="추천 학습 시간 배분" subtitle="AI가 분석한 최적 시간 투자 비율" action={<AIBadge />} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={strategy.strategies.map(s => ({ name: s.subject, value: s.timeAllocation }))}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                    paddingAngle={3} dataKey="value"
                  >
                    {strategy.strategies.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {strategy.strategies.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: CHART_PALETTE[i] }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{s.subject}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.slate800 }}>{s.timeAllocation}%</span>
                    <span style={{
                      fontSize: 11, color: theme.colors.success600, fontWeight: 600,
                      background: theme.colors.success50, padding: "2px 6px", borderRadius: 4,
                    }}>+{s.expectedGain}점</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy Detail Cards */}
          <SectionHeader icon={Target} title="과목별 상세 전략" subtitle="우선순위 순으로 정렬된 과목별 전략과 근거" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {strategy.strategies.map((s, i) => {
              const sub = SUBJECTS.find(sub => sub.name === s.subject);
              return (
                <div key={i} style={{
                  ...baseStyles.card, padding: 0, overflow: "hidden",
                  borderLeft: `4px solid ${sub?.color || CHART_PALETTE[i]}`,
                }}>
                  <div style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: theme.radius.full,
                        background: (sub?.color || CHART_PALETTE[i]) + "15",
                        color: sub?.color || CHART_PALETTE[i],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800,
                      }}>{s.priority}</span>
                      <span style={{ fontSize: 14 }}>{sub?.icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800 }}>{s.subject}</span>
                      <span style={{
                        ...baseStyles.badge,
                        background: s.priority <= 2 ? theme.colors.danger50 : theme.colors.slate100,
                        color: s.priority <= 2 ? theme.colors.danger600 : theme.colors.slate500,
                        fontSize: 11,
                      }}>
                        {s.priority <= 2 ? "집중 투자" : s.priority <= 3 ? "보강 필요" : "유지"}
                      </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: theme.colors.slate800, margin: "0 0 8px", lineHeight: 1.5 }}>
                      {s.action}
                    </p>
                    <div style={{
                      padding: "12px 14px", background: theme.colors.slate50,
                      borderRadius: theme.radius.md, fontSize: 13, color: theme.colors.slate600, lineHeight: 1.7,
                      display: "flex", gap: 8,
                    }}>
                      <Info size={14} color={theme.colors.slate400} style={{ flexShrink: 0, marginTop: 3 }} />
                      <span><strong style={{ color: theme.colors.slate700 }}>근거:</strong> {s.evidence}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13 }}>
                      <span style={{ color: theme.colors.slate500 }}>배분 비율: <strong style={{ color: theme.colors.slate800 }}>{s.timeAllocation}%</strong></span>
                      <span style={{ color: theme.colors.slate500 }}>기대 상승: <strong style={{ color: theme.colors.success600 }}>+{s.expectedGain}점</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cautions */}
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={AlertTriangle} title="주의 사항" subtitle="전략 실행 시 유의해야 할 포인트" />
            {strategy.cautions.map((c, i) => (
              <div key={i} style={{
                padding: "12px 14px", marginBottom: 8,
                background: theme.colors.warning50, borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.accent400}20`,
                fontSize: 13, color: theme.colors.slate700, lineHeight: 1.6,
                display: "flex", gap: 8,
              }}>
                <AlertTriangle size={14} color={theme.colors.accent500} style={{ flexShrink: 0, marginTop: 3 }} />
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "subjects" && (
        <div>
          {subjectData.map(sub => {
            const units = UNITS[sub.id] || [];
            return (
              <div key={sub.id} style={{ ...baseStyles.card, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{sub.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800, margin: 0 }}>{sub.name}</h3>
                    <div style={{ fontSize: 13, color: theme.colors.slate500 }}>
                      현재 {sub.current}점 → 목표 {sub.target}점 · 안정도 {Math.round(sub.stability * 100)}%
                    </div>
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: (sub.target - sub.current) > 15 ? theme.colors.danger500 : (sub.target - sub.current) > 5 ? theme.colors.accent500 : theme.colors.success500,
                  }}>
                    {sub.target - sub.current > 0 ? `−${sub.target - sub.current}` : "✓"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {units.map(unit => {
                    const isWeak = student.weakUnits.includes(unit.id);
                    return (
                      <div key={unit.id} style={{
                        padding: "10px 14px", borderRadius: theme.radius.md,
                        border: `1px solid ${isWeak ? theme.colors.danger200 : theme.colors.slate200}`,
                        background: isWeak ? theme.colors.danger50 + "50" : theme.colors.white,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{unit.name}</span>
                          {isWeak && <AlertTriangle size={12} color={theme.colors.danger500} />}
                        </div>
                        <ProgressBar value={unit.mastery} max={100} color={
                          unit.mastery < 50 ? theme.colors.danger500 : unit.mastery < 70 ? theme.colors.accent500 : theme.colors.success500
                        } height={5} showLabel />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "exams" && (
        <div>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={FileText} title="시험 이력" subtitle="최근 시험 결과 요약" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {student.recentExams.map((exam, i) => {
                const prev = student.recentExams[i - 1];
                const diff = prev ? exam.totalScore - prev.totalScore : 0;
                return (
                  <div key={exam.id} style={{
                    padding: "16px 18px", borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.slate200}`,
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: theme.radius.lg,
                      background: theme.colors.primary50, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Calendar size={18} color={theme.colors.primary500} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>{exam.name}</div>
                      <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{exam.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.slate800 }}>{exam.totalScore}<span style={{ fontSize: 13, color: theme.colors.slate400 }}>/{exam.maxScore}</span></div>
                      {diff !== 0 && (
                        <div style={{
                          fontSize: 12, fontWeight: 600,
                          color: diff > 0 ? theme.colors.success500 : theme.colors.danger500,
                          display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end",
                        }}>
                          {diff > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          {Math.abs(diff)}점
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   STUDENT DASHBOARD (Student's own view)
   ═══════════════════════════════════════════════════════ */

function LegacyStudentDashboard_v2() {
  const student = STUDENTS[0]; // st1 - 이서연
  const strategy = AI_STRATEGY_ST1;
  const subjectData = SUBJECTS.map(sub => ({ ...sub, ...student.subjects[sub.id] })).filter(s => s.current);

  return (
    <div>
      <DemoHelper text="학생 전용 대시보드입니다. '오늘 무엇을 공부해야 할까?'에 바로 답할 수 있도록 설계되었습니다." />

      {/* Welcome + Goal */}
      <div style={{
        ...baseStyles.card, marginBottom: 20,
        background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
        color: "#fff", border: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>안녕하세요, {student.name}님!</h2>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>
              🎯 목표: <strong>{student.targetUniv}</strong>
            </p>
          </div>
          <div style={{
            padding: "16px 28px", background: "rgba(255,255,255,0.15)",
            borderRadius: theme.radius.xl, backdropFilter: "blur(8px)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{student.recentExams[student.recentExams.length - 1]?.totalScore}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>현재 총점 / 목표까지 −{student.gapScore}점</div>
          </div>
        </div>
      </div>

      {/* Today's Priority */}
      <div style={{
        ...baseStyles.card, marginBottom: 20, padding: 0, overflow: "hidden",
        border: `1px solid ${theme.colors.ai400}25`,
      }}>
        <div style={{
          padding: "18px 22px",
          background: `linear-gradient(135deg, ${theme.colors.ai50}, ${theme.colors.white})`,
          borderBottom: `1px solid ${theme.colors.ai100}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AIBadge />
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.colors.slate800 }}>오늘의 학습 전략</span>
          </div>
          <p style={{ fontSize: 14, color: theme.colors.slate600, margin: 0, lineHeight: 1.7 }}>
            {strategy.summary}
          </p>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.slate500, marginBottom: 10 }}>이번 주 우선순위</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {strategy.strategies.slice(0, 3).map((s, i) => {
              const sub = SUBJECTS.find(sub => sub.name === s.subject);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: theme.radius.lg,
                  background: i === 0 ? theme.colors.primary50 + "80" : theme.colors.slate50,
                  border: `1px solid ${i === 0 ? theme.colors.primary200 + "60" : theme.colors.slate100}`,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: theme.radius.full,
                    background: i === 0 ? theme.colors.primary600 : theme.colors.slate200,
                    color: i === 0 ? "#fff" : theme.colors.slate600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 16 }}>{sub?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>{s.subject}</div>
                    <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{s.action.split("→")[0].trim()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.primary600 }}>{s.timeAllocation}%</div>
                    <div style={{ fontSize: 11, color: theme.colors.success500 }}>+{s.expectedGain}점 기대</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Time Allocation */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Clock} title="추천 시간 배분" subtitle="이번 주 과목별 공부 시간 비율" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {strategy.strategies.map((s, i) => {
              const sub = SUBJECTS.find(sub => sub.name === s.subject);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: theme.colors.slate700, display: "flex", alignItems: "center", gap: 6 }}>
                      {sub?.icon} {s.subject}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.slate800 }}>{s.timeAllocation}%</span>
                  </div>
                  <ProgressBar value={s.timeAllocation} max={40} color={sub?.color || CHART_PALETTE[i]} height={8} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth Trend */}
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={TrendingUp} title="나의 성장 추이" subtitle="최근 4회 시험 점수 변화" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={student.recentExams.map(e => ({ name: e.name.replace("고사", "").replace("평가", ""), 점수: e.totalScore }))}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.colors.primary500} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={theme.colors.primary500} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.slate100} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.colors.slate500 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: theme.colors.slate500 }} />
              <Tooltip />
              <Area type="monotone" dataKey="점수" stroke={theme.colors.primary500} fill="url(#colorScore)" strokeWidth={2.5}
                dot={{ r: 4, fill: theme.colors.primary500, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{
            textAlign: "center", marginTop: 8, fontSize: 13, color: theme.colors.success600, fontWeight: 600,
          }}>
            📈 지난 3개월간 37점 상승! 꾸준히 성장하고 있어요.
          </div>
        </div>
      </div>

      {/* Weak Units to Work On */}
      <div style={{ ...baseStyles.card, marginBottom: 20 }}>
        <SectionHeader icon={BookOpen} title="보완이 필요한 단원" subtitle="현재 이해도가 낮아 우선 복습이 필요한 단원들이에요" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {student.weakUnits.map(unitId => {
            const unit = Object.values(UNITS).flat().find(u => u.id === unitId);
            if (!unit) return null;
            const subId = Object.entries(UNITS).find(([, units]) => units.some(u => u.id === unitId))?.[0];
            const sub = SUBJECTS.find(s => s.id === subId);
            return (
              <div key={unitId} style={{
                padding: "14px 16px", borderRadius: theme.radius.lg,
                background: `linear-gradient(135deg, ${theme.colors.warning50}80, ${theme.colors.white})`,
                border: `1px solid ${theme.colors.accent400}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{sub?.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>{unit.name}</span>
                </div>
                <ProgressBar value={unit.mastery} max={100} color={
                  unit.mastery < 50 ? theme.colors.danger500 : theme.colors.accent500
                } height={6} showLabel />
                <div style={{ fontSize: 12, color: theme.colors.slate500, marginTop: 6 }}>
                  {unit.mastery < 50 ? "기초부터 다시 정리해볼까요?" : "조금만 더 연습하면 안정권이에요!"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cautions (in friendly tone) */}
      <div style={{ ...baseStyles.card }}>
        <SectionHeader icon={Lightbulb} title="학습 팁" subtitle="AI가 분석한 나만의 학습 패턴 조언" action={<AIBadge />} />
        {strategy.cautions.map((c, i) => (
          <div key={i} style={{
            padding: "12px 14px", marginBottom: 8,
            background: theme.colors.ai50, borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.ai400}15`,
            fontSize: 13, color: theme.colors.slate700, lineHeight: 1.6,
            display: "flex", gap: 8,
          }}>
            <Lightbulb size={14} color={theme.colors.ai500} style={{ flexShrink: 0, marginTop: 3 }} />
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   EXAM MANAGEMENT
   ═══════════════════════════════════════════════════════ */

function ExamManagementPage() {
  const auth = useAuth();
  const [exams, setExams] = useState(EXAMS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/exams", { token: auth.accessToken });
        if (cancelled) return;
        setExams(response.exams || EXAMS);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setExams(EXAMS);
        setLoadError(error instanceof Error ? error.message : "시험 목록 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExams();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const handleCreateExam = async () => {
    if (!auth?.accessToken || auth.user.role === "student") return;
    setCreating(true);
    try {
      const created = await apiRequest("/frontend/exams", {
        method: "POST",
        token: auth.accessToken,
        body: {
          academy_id: 1,
          subject_id: 1,
          name: `신규 시험 ${new Date().toLocaleDateString("ko-KR")}`,
          exam_date: new Date().toISOString().slice(0, 10),
          total_score: 100,
        },
      });
      setExams(prev => [created, ...prev]);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "시험 등록 실패");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <DemoHelper text="시험 관리 화면입니다. 시험 등록, 문제 태깅, 결과 입력을 관리할 수 있습니다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          시험 API 호출 실패. 예시 데이터 표시 중.
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div />
        <button style={baseStyles.btnPrimary} onClick={handleCreateExam} disabled={creating || auth?.user?.role === "student"}>
          <Plus size={16} /> {creating ? "등록 중..." : "새 시험 등록"}
        </button>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["시험명", "날짜", "과목", "문항 수", "참여자", "평균", "상태"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left", fontSize: 12,
                  fontWeight: 600, color: theme.colors.slate500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exams.map(exam => (
              <tr key={exam.id} style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = theme.colors.slate50}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{exam.name}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.date}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.subject}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.questionCount}문항</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.participantCount}명</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                  {exam.avgScore ? `${exam.avgScore}점` : "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    ...baseStyles.badge,
                    background: exam.status === "완료" ? theme.colors.success50 : theme.colors.accent50,
                    color: exam.status === "완료" ? theme.colors.success600 : theme.colors.accent500,
                    border: `1px solid ${exam.status === "완료" ? theme.colors.success500 + "22" : theme.colors.accent400 + "22"}`,
                  }}>
                    {exam.status === "완료" ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {exam.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   UNIVERSITY POLICY PAGE
   ═══════════════════════════════════════════════════════ */

function LegacyInstructorDashboard_v3({ onNavigate }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(() => buildMockInstructorDashboard());
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/instructor", { token: auth.accessToken });
        if (cancelled) return;
        setDashboard(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDashboard(buildMockInstructorDashboard());
        setLoadError(error instanceof Error ? error.message : "대시보드 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...baseStyles.card }}><LoadingSkeleton lines={3} /></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <DemoHelper text="강사용 대시보드와 실제 분석 데이터를 연결한 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          강사용 대시보드 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {dashboard.stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.label.includes("Priority") ? AlertTriangle : stat.label.includes("average") ? TrendingUp : stat.label.includes("Strategies") ? Brain : Users}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            color={theme.colors.primary600}
            bgColor={theme.colors.primary50}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={AlertTriangle} title="상담 우선 학생" subtitle="목표 대학 대비 격차가 큰 학생 우선" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dashboard.consultPriorityStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => onNavigate(`student-${student.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.slate100}`,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radius.full,
                  background: theme.colors.primary50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: theme.colors.primary600,
                }}>
                  {student.name?.[0] || "학"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</span>
                    <PriorityBadge priority={student.consultPriority} />
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>
                    {student.targetUniv || "목표 대학 미설정"} · 격차 {student.gapScore}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {student.weaknessTypes.slice(0, 2).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} size="sm" />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Brain} title="취약 유형 분포" subtitle="현재 진단 기준 학생 분포" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dashboard.weaknessDistribution.map((item) => (
              <div key={item.weaknessTypeId}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.count}</span>
                </div>
                <ProgressBar value={item.count} max={Math.max(dashboard.consultPriorityStudents.length, 1)} color={theme.colors.ai500} height={6} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegacyStudentDetailPage_v3({ studentId, onBack }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [detail, setDetail] = useState(() => buildMockStudentDetail(studentId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentDetail() {
      setLoading(true);
      try {
        const path = auth?.user?.role === "student" ? "/frontend/dashboard/student" : `/frontend/students/${studentId}`;
        const response = await apiRequest(path, { token: auth?.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail(studentId));
        setLoadError(error instanceof Error ? error.message : "학생 상세 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudentDetail();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, auth?.user?.role, studentId]);

  if (loading) {
    return (
      <div>
        <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
        </div>
      </div>
    );
  }

  const student = detail.student;
  const subjects = detail.subjects || [];
  const recentExams = student.recentExams || [];
  const tabs = [
    { id: "overview", label: "개요" },
    { id: "strategy", label: "전략" },
    { id: "subjects", label: "과목" },
    { id: "exams", label: "시험" },
  ];
  const radarData = subjects.map((subject) => ({
    subject: subject.subjectName,
    current: subject.currentScore,
    target: subject.targetScore,
  }));

  return (
    <div>
      <button onClick={onBack} style={{ ...baseStyles.btnSecondary, marginBottom: 16, padding: "8px 14px" }}>
        <ArrowLeft size={16} /> 학생 목록으로
      </button>
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 상세 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ ...baseStyles.card, marginBottom: 20, padding: "24px 28px", background: `linear-gradient(135deg, ${theme.colors.white}, ${theme.colors.primary50}40)` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: theme.radius.xl, background: `linear-gradient(135deg, ${theme.colors.primary100}, ${theme.colors.ai100})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: theme.colors.primary700, fontSize: 24 }}>
            {student.name?.[0] || "학"}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.slate900, margin: 0 }}>{student.name}</h2>
              <PriorityBadge priority={student.consultPriority} />
              {(detail.diagnosis?.weaknessTypes || []).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} />)}
            </div>
            <div style={{ fontSize: 14, color: theme.colors.slate500, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>{student.grade} · {student.classGroup || "반 미배정"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><School size={14} /> {student.targetUniv || "목표 대학 미설정"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "16px 24px", background: theme.colors.white, borderRadius: theme.radius.xl, border: `1px solid ${theme.colors.slate200}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.primary600 }}>{recentExams[recentExams.length - 1]?.totalScore || "-"}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>최근 점수</div>
            </div>
            <div style={{ width: 1, height: 40, background: theme.colors.slate200 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: student.gapScore > 20 ? theme.colors.danger500 : theme.colors.accent500 }}>{student.gapScore}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>목표 격차</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...baseStyles.btnGhost,
              background: activeTab === tab.id ? theme.colors.primary50 : theme.colors.white,
              color: activeTab === tab.id ? theme.colors.primary600 : theme.colors.slate600,
              border: `1px solid ${activeTab === tab.id ? theme.colors.primary200 : theme.colors.slate200}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Brain} title="진단 근거" subtitle="현재 진단의 설명 가능한 근거" />
            {(detail.diagnosis?.evidence || []).length ? (
              detail.diagnosis.evidence.map((item, index) => (
                <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.slate50, borderRadius: theme.radius.md }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.slate500 }}>{item.type || "근거"}</div>
                  <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{item.reason || JSON.stringify(item)}</div>
                </div>
              ))
            ) : (
              <EmptyState icon={Info} title="근거 데이터 없음" description="예시 모드 또는 분석 데이터 부족 상태." />
            )}
          </div>

          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Target} title="목표 대비 위치" subtitle="현재 환산 점수와 목표 점수 비교" />
            <GapBar current={detail.targetGap?.weighted_score || 0} target={detail.targetGap?.target_score || 0} label={detail.targetGap?.university_name || "목표 대학"} />
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="현재" dataKey="current" stroke={theme.colors.primary500} fill={theme.colors.primary500} fillOpacity={0.2} />
                  <Radar name="목표" dataKey="target" stroke={theme.colors.ai500} fill={theme.colors.ai500} fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegacyStudentDashboard_v3() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(() => buildMockStudentDetail("st1"));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/student", { token: auth.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail("st1"));
        setLoadError(error instanceof Error ? error.message : "학생 대시보드 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>;
  }

  const student = detail.student;
  const topSubjects = (detail.strategy?.timeAllocation || []).slice(0, 3);

  return (
    <div>
      <DemoHelper text="학생용 대시보드와 현재 분석 결과를 실제로 연동한 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 대시보드 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ ...baseStyles.card, marginBottom: 20, background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`, color: "#fff", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{student.name}</h2>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>목표 대학: <strong>{student.targetUniv || "미설정"}</strong></p>
          </div>
          <div style={{ padding: "16px 28px", background: "rgba(255,255,255,0.15)", borderRadius: theme.radius.xl, backdropFilter: "blur(8px)", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{student.recentExams?.[student.recentExams.length - 1]?.totalScore || "-"}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>현재 점수 · 격차 {student.gapScore}</div>
          </div>
        </div>
      </div>

      <div style={{ ...baseStyles.card, marginBottom: 20 }}>
        <SectionHeader icon={Sparkles} title="오늘의 집중 포인트" subtitle="현재 분석 결과 기반 우선 전략" action={<AIBadge />} />
        <p style={{ fontSize: 14, color: theme.colors.slate700, lineHeight: 1.7 }}>{detail.strategy?.summary || "요약 전략 없음."}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {topSubjects.map((item, index) => (
            <div key={`${item.subject_code}-${index}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.subject_code}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.ratio_percent}%</span>
              </div>
              <ProgressBar value={item.ratio_percent} max={100} color={theme.colors.primary500} height={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegacyUniversityPolicyPage_v2() {
  const [selectedUniv, setSelectedUniv] = useState(null);

  return (
    <div>
      <DemoHelper text="대학별 입시 반영 정책을 확인하고 비교할 수 있습니다. 이 정책 데이터가 AI 전략 생성의 핵심 기반입니다." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {UNIVERSITIES.map(univ => {
          const isSelected = selectedUniv === univ.id;
          return (
            <div key={univ.id}
              onClick={() => setSelectedUniv(isSelected ? null : univ.id)}
              style={{
                ...baseStyles.card, cursor: "pointer",
                border: `1px solid ${isSelected ? theme.colors.primary500 + "50" : theme.colors.slate200}`,
                background: isSelected ? theme.colors.primary50 + "40" : theme.colors.white,
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: theme.radius.lg,
                  background: theme.colors.primary50, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <School size={20} color={theme.colors.primary600} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800, margin: 0 }}>{univ.name}</h3>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{univ.admissionType}</div>
                </div>
              </div>

              {/* Weights */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 8 }}>과목 반영 비중</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(univ.weights).map(([subId, weight]) => {
                    const sub = SUBJECTS.find(s => s.id === subId);
                    return (
                      <div key={subId} style={{
                        padding: "6px 10px", borderRadius: theme.radius.md,
                        background: sub?.color + "10",
                        border: `1px solid ${sub?.color}20`,
                        fontSize: 12, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span>{sub?.icon}</span>
                        <span style={{ fontWeight: 600, color: sub?.color }}>{weight}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weight Bar Visualization */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                {Object.entries(univ.weights).map(([subId, weight]) => {
                  const sub = SUBJECTS.find(s => s.id === subId);
                  return <div key={subId} style={{ width: `${weight}%`, background: sub?.color, transition: "width 0.3s" }} />;
                })}
              </div>

              {/* Details */}
              {isSelected && (
                <div style={{ borderTop: `1px solid ${theme.colors.slate200}`, paddingTop: 14, marginTop: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>필수 과목</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{univ.requiredSubjects.join(", ")}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>가산점 규칙</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{univ.bonusRules}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>비고</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{univ.notes}</div>
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 10 }}>
                <span style={{ fontSize: 12, color: theme.colors.primary500, fontWeight: 500 }}>
                  {isSelected ? "접기" : "상세 보기"} <ChevronDown size={12} style={{ transform: isSelected ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════ */

function InstructorDashboard({ onNavigate }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(() => buildMockInstructorDashboard());
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/instructor", { token: auth.accessToken });
        if (cancelled) return;
        setDashboard(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDashboard(buildMockInstructorDashboard());
        setLoadError(error instanceof Error ? error.message : "Dashboard API request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...baseStyles.card }}><LoadingSkeleton lines={3} /></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <DemoHelper text="Instructor dashboard connected to live frontend adapter APIs." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Live dashboard load failed. Local fallback data is being shown.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {dashboard.stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.label.includes("Priority") ? AlertTriangle : stat.label.includes("average") ? TrendingUp : stat.label.includes("Strategies") ? Brain : Users}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            color={theme.colors.primary600}
            bgColor={theme.colors.primary50}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={AlertTriangle} title="Priority Students" subtitle="Students with the largest current target gap" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dashboard.consultPriorityStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => onNavigate(`student-${student.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.slate100}`,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radius.full,
                  background: theme.colors.primary50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: theme.colors.primary600,
                }}>
                  {student.name?.[0] || "S"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</span>
                    <PriorityBadge priority={student.consultPriority} />
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>
                    {student.targetUniv || "No target set"} · gap {student.gapScore}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {student.weaknessTypes.slice(0, 2).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} size="sm" />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Brain} title="Weakness Distribution" subtitle="Current frontend diagnosis distribution" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dashboard.weaknessDistribution.map((item) => (
              <div key={item.weaknessTypeId}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.count}</span>
                </div>
                <ProgressBar value={item.count} max={Math.max(dashboard.consultPriorityStudents.length, 1)} color={theme.colors.ai500} height={6} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={TrendingUp} title="Exam Trend" subtitle="Average score trend from live exam records" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dashboard.examTrend}>
              <defs>
                <linearGradient id="frontendExamTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.colors.primary500} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={theme.colors.primary500} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.slate100} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
              <YAxis tick={{ fontSize: 12, fill: theme.colors.slate500 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="averageScore" stroke={theme.colors.primary500} strokeWidth={2.5} fill="url(#frontendExamTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Target} title="Weak Units" subtitle="Lowest mastery units from recent analysis" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dashboard.weakUnits.map((unit, index) => (
              <div key={`${unit.unitId}-${index}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: theme.radius.full,
                  background: theme.colors.warning50,
                  color: theme.colors.accent500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}>{index + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{unit.unitName}</div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{unit.subjectCode}</div>
                </div>
                <div style={{ minWidth: 64, textAlign: "right", fontWeight: 700 }}>{Math.round(unit.mastery)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...baseStyles.card }}>
        <SectionHeader icon={Sparkles} title="Recent Strategy Summaries" subtitle="Stored strategy results for quick review" action={<AIBadge />} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {dashboard.recentStrategies.map((item) => (
            <div
              key={item.studentId}
              onClick={() => onNavigate(`student-${item.studentId}`)}
              style={{
                padding: "16px",
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.ai400}20`,
                background: `linear-gradient(135deg, ${theme.colors.ai50}60, ${theme.colors.white})`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.studentName}</span>
                <PriorityBadge priority={item.consultPriority} />
              </div>
              <p style={{ fontSize: 13, color: theme.colors.slate600, margin: "0 0 10px", lineHeight: 1.6 }}>{item.summary}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.weaknessTypes.map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} size="sm" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentDetailPage({ studentId, onBack }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [detail, setDetail] = useState(() => buildMockStudentDetail(studentId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentDetail() {
      setLoading(true);
      try {
        const path = auth?.user?.role === "student" ? "/frontend/dashboard/student" : `/frontend/students/${studentId}`;
        const response = await apiRequest(path, { token: auth?.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail(studentId));
        setLoadError(error instanceof Error ? error.message : "Student detail API request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudentDetail();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, auth?.user?.role, studentId]);

  if (loading) {
    return (
      <div>
        <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
        </div>
      </div>
    );
  }

  const student = detail.student;
  const subjects = detail.subjects || [];
  const recentExams = student.recentExams || [];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "strategy", label: "Strategy" },
    { id: "subjects", label: "Subjects" },
    { id: "exams", label: "Exams" },
  ];
  const radarData = subjects.map((subject) => ({
    subject: subject.subjectName,
    current: subject.currentScore,
    target: subject.targetScore,
  }));

  return (
    <div>
      <button onClick={onBack} style={{ ...baseStyles.btnSecondary, marginBottom: 16, padding: "8px 14px" }}>
        <ArrowLeft size={16} /> 학생 목록으로
      </button>
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Live student detail load failed. Local fallback data is being shown.
        </div>
      )}

      <div style={{
        ...baseStyles.card,
        marginBottom: 20,
        padding: "24px 28px",
        background: `linear-gradient(135deg, ${theme.colors.white}, ${theme.colors.primary50}40)`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: theme.radius.xl,
            background: `linear-gradient(135deg, ${theme.colors.primary100}, ${theme.colors.ai100})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: theme.colors.primary700,
            fontSize: 24,
          }}>
            {student.name?.[0] || "S"}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.slate900, margin: 0 }}>{student.name}</h2>
              <PriorityBadge priority={student.consultPriority} />
              {(detail.diagnosis?.weaknessTypes || []).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} />)}
            </div>
            <div style={{ fontSize: 14, color: theme.colors.slate500, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>{student.grade} · {student.classGroup || "No class"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><School size={14} /> {student.targetUniv || "No target set"}</span>
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            padding: "16px 24px",
            background: theme.colors.white,
            borderRadius: theme.radius.xl,
            border: `1px solid ${theme.colors.slate200}`,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.primary600 }}>{recentExams[recentExams.length - 1]?.totalScore || "-"}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>Latest score</div>
            </div>
            <div style={{ width: 1, height: 40, background: theme.colors.slate200 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: student.gapScore > 20 ? theme.colors.danger500 : theme.colors.accent500 }}>{student.gapScore}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>Target gap</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...baseStyles.btnGhost,
              background: activeTab === tab.id ? theme.colors.primary50 : theme.colors.white,
              color: activeTab === tab.id ? theme.colors.primary600 : theme.colors.slate600,
              border: `1px solid ${activeTab === tab.id ? theme.colors.primary200 : theme.colors.slate200}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Brain} title="Diagnosis Evidence" subtitle="Explainable reasons behind the current diagnosis" />
            {(detail.diagnosis?.evidence || []).length ? (
              detail.diagnosis.evidence.map((item, index) => (
                <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.slate50, borderRadius: theme.radius.md }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.slate500 }}>{item.type || "evidence"}</div>
                  <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{item.reason || JSON.stringify(item)}</div>
                </div>
              ))
            ) : (
              <EmptyState icon={Info} title="No evidence items" description="Fallback mode or sparse analysis data." />
            )}
          </div>

          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Target} title="Target Position" subtitle="Current weighted score versus target policy" />
            <GapBar current={detail.targetGap?.weighted_score || 0} target={detail.targetGap?.target_score || 0} label={detail.targetGap?.university_name || "Target university"} />
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Current" dataKey="current" stroke={theme.colors.primary500} fill={theme.colors.primary500} fillOpacity={0.2} />
                  <Radar name="Target" dataKey="target" stroke={theme.colors.ai500} fill={theme.colors.ai500} fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "strategy" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Sparkles} title="Strategy Summary" subtitle="Structured strategy from live analysis" action={<AIBadge />} />
            <p style={{ fontSize: 14, color: theme.colors.slate700, lineHeight: 1.7 }}>{detail.strategy?.summary || "No strategy summary available."}</p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {(detail.strategy?.timeAllocation || []).map((item, index) => (
                <div key={`${item.subject_code}-${index}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.subject_code}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.ratio_percent}%</span>
                  </div>
                  <ProgressBar value={item.ratio_percent} max={100} color={theme.colors.primary500} height={8} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Lightbulb} title="Coaching Notes" subtitle="Points to focus during coaching or self-study" />
            {(detail.strategy?.coachingPoints || []).map((point, index) => (
              <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.ai50, borderRadius: theme.radius.md }}>
                {point}
              </div>
            ))}
            {(detail.strategy?.antiPatterns || []).length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.slate500, margin: "12px 0 8px" }}>Avoid</div>
                {detail.strategy.antiPatterns.map((item, index) => (
                  <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.warning50, borderRadius: theme.radius.md }}>
                    {item}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "subjects" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {subjects.map((subject) => (
            <div key={subject.subjectCode} style={{ ...baseStyles.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{subject.subjectName}</div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{subject.subjectCode}</div>
                </div>
                <div style={{ fontSize: 12, color: theme.colors.slate500 }}>weight {Math.round((subject.universityWeight || 0) * 100)}%</div>
              </div>
              <GapBar current={subject.currentScore} target={subject.targetScore} label="Current vs target" color={SUBJECT_CODE_META[subject.subjectCode]?.color || theme.colors.primary500} />
              <div style={{ fontSize: 12, color: theme.colors.slate500, marginTop: 12 }}>
                Stability {Math.round((subject.stability || 0) * 100)}% · trend {subject.trend.join(" / ")}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "exams" && (
        <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
                {["Exam", "Date", "Score", "Max"].map((header) => (
                  <th key={header} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.colors.slate500 }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentExams.map((exam) => (
                <tr key={exam.id} style={{ borderBottom: `1px solid ${theme.colors.slate100}` }}>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.name}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.date}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>{exam.totalScore}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentDashboard() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(() => buildMockStudentDetail("st1"));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/student", { token: auth.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail("st1"));
        setLoadError(error instanceof Error ? error.message : "Student dashboard API request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>;
  }

  const student = detail.student;
  const topSubjects = (detail.strategy?.timeAllocation || []).slice(0, 3);

  return (
    <div>
      <DemoHelper text="Student dashboard connected to the live frontend adapter API." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Live student dashboard load failed. Local fallback data is being shown.
        </div>
      )}

      <div style={{
        ...baseStyles.card,
        marginBottom: 20,
        background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
        color: "#fff",
        border: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{student.name}</h2>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>Target: <strong>{student.targetUniv || "No target set"}</strong></p>
          </div>
          <div style={{
            padding: "16px 28px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: theme.radius.xl,
            backdropFilter: "blur(8px)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{student.recentExams?.[student.recentExams.length - 1]?.totalScore || "-"}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Current score · gap {student.gapScore}</div>
          </div>
        </div>
      </div>

      <div style={{ ...baseStyles.card, marginBottom: 20 }}>
        <SectionHeader icon={Sparkles} title="Today Focus" subtitle="Live strategy summary from the current analysis" action={<AIBadge />} />
        <p style={{ fontSize: 14, color: theme.colors.slate700, lineHeight: 1.7 }}>{detail.strategy?.summary || "No summary available."}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {topSubjects.map((item, index) => (
            <div key={`${item.subject_code}-${index}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.subject_code}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.ratio_percent}%</span>
              </div>
              <ProgressBar value={item.ratio_percent} max={100} color={theme.colors.primary500} height={8} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={BookOpen} title="Weak Units" subtitle="Units that need reinforcement first" />
          {(detail.weakUnits || []).map((unit) => (
            <div key={unit.unitId} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.warning50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{unit.unitName}</div>
              <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{unit.subjectCode} · mastery {Math.round(unit.mastery)}%</div>
            </div>
          ))}
        </div>

        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Target} title="Target Gap" subtitle="Weighted score gap against the current goal" />
          <GapBar current={detail.targetGap?.weighted_score || 0} target={detail.targetGap?.target_score || 0} label={detail.targetGap?.university_name || "Target"} />
        </div>
      </div>
    </div>
  );
}

function UniversityPolicyPage() {
  const auth = useAuth();
  const [selectedUniv, setSelectedUniv] = useState(null);
  const [universities, setUniversities] = useState(() => buildMockUniversityPolicies().universities);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUniversities() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/universities", { token: auth.accessToken });
        if (cancelled) return;
        setUniversities(response.universities || buildMockUniversityPolicies().universities);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setUniversities(buildMockUniversityPolicies().universities);
        setLoadError(error instanceof Error ? error.message : "University policy API request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUniversities();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  return (
    <div>
      <DemoHelper text="University policy cards connected to frontend adapter APIs." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Live university policy load failed. Local fallback data is being shown.
        </div>
      )}
      {loading && <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {universities.map((university) => {
          const isSelected = selectedUniv === university.id;
          return (
            <div
              key={university.id}
              onClick={() => setSelectedUniv(isSelected ? null : university.id)}
              style={{
                ...baseStyles.card,
                cursor: "pointer",
                border: `1px solid ${isSelected ? theme.colors.primary500 + "50" : theme.colors.slate200}`,
                background: isSelected ? theme.colors.primary50 + "40" : theme.colors.white,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: theme.radius.lg,
                  background: theme.colors.primary50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <School size={20} color={theme.colors.primary600} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800, margin: 0 }}>{university.universityName}</h3>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{university.admissionType}</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 8 }}>Subject weights</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(university.subjectWeights || {}).map(([subjectCode, weight]) => (
                    <div key={subjectCode} style={{
                      padding: "6px 10px",
                      borderRadius: theme.radius.md,
                      background: `${SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500}10`,
                      border: `1px solid ${(SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500)}20`,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                      <span style={{ fontWeight: 600, color: SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500 }}>
                        {SUBJECT_CODE_META[subjectCode]?.label || subjectCode} {Math.round(Number(weight) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div style={{ borderTop: `1px solid ${theme.colors.slate200}`, paddingTop: 14, marginTop: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>Required subjects</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{(university.requiredSubjects || []).join(", ") || "-"}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>Bonus rules</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>
                      {(university.bonusRules || []).map((rule) => rule.text || JSON.stringify(rule)).join(", ") || "-"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>Target score</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{university.targetScore}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{university.notes || "-"}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegacyStudentListPage_v2({ onNavigate }) {
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [students, setStudents] = useState(STUDENTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/students", { token: auth.accessToken });
        if (cancelled) return;
        setStudents(response.students || STUDENTS);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setStudents(STUDENTS);
        setLoadError(error instanceof Error ? error.message : "Student list request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const classOptions = ["all", ...new Set(students.map((student) => student.classGroup).filter(Boolean))];
  const filtered = students.filter((student) => {
    const keyword = searchTerm.trim().toLowerCase();
    const targetUniv = (student.targetUniv || "").toLowerCase();
    const matchSearch = !keyword || student.name.toLowerCase().includes(keyword) || targetUniv.includes(keyword);
    const matchClass = filterClass === "all" || student.classGroup === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div>
      <DemoHelper text="Student list connected to the live frontend adapter API." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Student list API request failed. Fallback data is being shown.
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={theme.colors.slate400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student or target university"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.slate200}`,
              fontSize: 14,
              outline: "none",
              fontFamily: fontStack,
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.slate200}`,
            fontSize: 14,
            fontFamily: fontStack,
            background: theme.colors.white,
            color: theme.colors.slate700,
            cursor: "pointer",
          }}
        >
          {classOptions.map((className) => (
            <option key={className} value={className}>
              {className === "all" ? "All classes" : className}
            </option>
          ))}
        </select>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["Student", "Class", "Target", "Latest score", "Gap", "Weakness", "Priority"].map((header) => (
                <th
                  key={header}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.slate500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr
                key={student.id}
                onClick={() => onNavigate(`student-${student.id}`)}
                style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.slate50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: theme.radius.full,
                      background: theme.colors.primary50,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: theme.colors.primary600,
                      fontSize: 14,
                    }}>
                      {student.name?.[0] || "S"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{student.name}</div>
                      <div style={{ fontSize: 12, color: theme.colors.slate400 }}>{student.grade}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{student.classGroup || "-"}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{student.targetUniv || "Not set"}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                  {student.recentExams[student.recentExams.length - 1]?.totalScore ?? "-"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: student.gapScore > 20 ? theme.colors.danger500 : student.gapScore > 10 ? theme.colors.accent500 : theme.colors.success500,
                  }}>
                    {student.gapScore}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {student.weaknessTypes.slice(0, 2).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} size="sm" />)}
                    {student.weaknessTypes.length > 2 && <span style={{ fontSize: 11, color: theme.colors.slate400 }}>+{student.weaknessTypes.length - 2}</span>}
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <PriorityBadge priority={student.consultPriority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={Search} title="No matches" description="Try another search or class filter." />}
      </div>
    </div>
  );
}

function LegacyExamManagementPage_v2() {
  const auth = useAuth();
  const [exams, setExams] = useState(EXAMS);
  const [metadata, setMetadata] = useState({ academies: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [form, setForm] = useState({
    academy_id: 1,
    subject_id: 1,
    name: "",
    exam_date: new Date().toISOString().slice(0, 10),
    total_score: 100,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadExamsAndMetadata() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const [examResponse, metadataResponse] = await Promise.all([
          apiRequest("/frontend/exams", { token: auth.accessToken }),
          apiRequest("/frontend/metadata", { token: auth.accessToken }),
        ]);
        if (cancelled) return;
        setExams(examResponse.exams || EXAMS);
        setMetadata(metadataResponse || { academies: [], subjects: [] });
        setForm((prev) => ({
          ...prev,
          academy_id: metadataResponse?.academies?.[0]?.id || prev.academy_id,
          subject_id: metadataResponse?.subjects?.[0]?.id || prev.subject_id,
          name: prev.name || `Quick exam ${new Date().toISOString().slice(0, 10)}`,
        }));
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setExams(EXAMS);
        setMetadata({ academies: [], subjects: [] });
        setLoadError(error instanceof Error ? error.message : "Exam list request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExamsAndMetadata();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const canCreateExam = Boolean(
    form.name.trim() &&
    form.exam_date &&
    Number(form.academy_id) > 0 &&
    Number(form.subject_id) > 0 &&
    Number(form.total_score) > 0
  );

  const handleCreateExam = async () => {
    if (!auth?.accessToken || auth.user.role === "student") return;
    if (!form.name.trim()) {
      setFormError("시험명을 입력해라.");
      setCreateMessage("");
      return;
    }
    if (!form.exam_date) {
      setFormError("시험일 입력 필요.");
      setCreateMessage("");
      return;
    }
    if (Number(form.total_score) <= 0) {
      setFormError("총점은 0보다 커야 함.");
      setCreateMessage("");
      return;
    }
    setCreating(true);
    setFormError("");
    setCreateMessage("");
    try {
      const created = await apiRequest("/frontend/exams", {
        method: "POST",
        token: auth.accessToken,
        body: {
          academy_id: Number(form.academy_id),
          subject_id: Number(form.subject_id),
          name: form.name || `Quick exam ${new Date().toISOString().slice(0, 10)}`,
          exam_date: form.exam_date,
          total_score: Number(form.total_score),
        },
      });
      setExams((prev) => [created, ...prev]);
      setForm((prev) => ({
        ...prev,
        name: `Quick exam ${new Date().toISOString().slice(0, 10)}`,
      }));
      setLoadError("");
      setCreateMessage("시험 등록 완료.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Exam creation failed");
      setFormError("시험 등록 실패. 입력값과 권한 확인 필요.");
    } finally {
      setCreating(false);
    }
  };

  const statusMeta = (status) => {
    const normalized = String(status || "").toLowerCase();
    const done = normalized === "completed" || normalized === "complete";
    return {
      label: done ? "Completed" : "Scheduled",
      background: done ? theme.colors.success50 : theme.colors.accent50,
      color: done ? theme.colors.success600 : theme.colors.accent500,
      border: done ? theme.colors.success500 : theme.colors.accent400,
      icon: done ? <CheckCircle size={12} /> : <Clock size={12} />,
    };
  };

  return (
    <div>
      <DemoHelper text="Exam management connected to the live frontend adapter API." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          Exam API request failed. Fallback data is being shown.
        </div>
      )}
      {formError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          {formError}
        </div>
      )}
      {createMessage && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.success50, color: theme.colors.success600 }}>
          {createMessage}
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 10, flex: 1, marginRight: 16 }}>
          <input
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            placeholder="Exam name"
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
          <select
            value={form.academy_id}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, academy_id: Number(e.target.value) }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          >
            {(metadata.academies.length ? metadata.academies : [{ id: 1, name: "Default academy" }]).map((academy) => (
              <option key={academy.id} value={academy.id}>{academy.name}</option>
            ))}
          </select>
          <select
            value={form.subject_id}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, subject_id: Number(e.target.value) }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          >
            {(metadata.subjects.length ? metadata.subjects : [{ id: 1, code: "GEN", name: "General" }]).map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.exam_date}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, exam_date: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
          <input
            type="number"
            min="1"
            max="1000"
            value={form.total_score}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, total_score: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            placeholder="Total score"
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
        </div>
        <button style={baseStyles.btnPrimary} onClick={handleCreateExam} disabled={creating || loading || auth?.user?.role === "student" || !canCreateExam}>
          <Plus size={16} /> {creating ? "Creating..." : "Create quick exam"}
        </button>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["Exam", "Date", "Subject", "Questions", "Participants", "Average", "Status"].map((header) => (
                <th key={header} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.colors.slate500 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const status = statusMeta(exam.status);
              return (
                <tr
                  key={exam.id}
                  style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.slate50; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{exam.name}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.date}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.subject}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.questionCount}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.participantCount}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                    {exam.avgScore ?? "-"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      ...baseStyles.badge,
                      background: status.background,
                      color: status.color,
                      border: `1px solid ${status.border}22`,
                    }}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegacyWeaknessBadge_v2({ typeId, size = "md" }) {
  const meta = {
    wt1: { label: "Concept Gap", color: "#EF4444", bgColor: "#FEE2E2", icon: "C" },
    wt2: { label: "Calculation Mistakes", color: "#F97316", bgColor: "#FFEDD5", icon: "M" },
    wt3: { label: "Time Pressure", color: "#FBBF24", bgColor: "#FEF3C7", icon: "T" },
    wt4: { label: "Prerequisite Gap", color: "#8B5CF6", bgColor: "#EDE9FE", icon: "P" },
    wt5: { label: "Type Bias", color: "#EC4899", bgColor: "#FCE7F3", icon: "Y" },
    wt6: { label: "High Variability", color: "#6366F1", bgColor: "#E0E7FF", icon: "V" },
  }[typeId];
  if (!meta) return null;
  const isSmall = size === "sm";
  return (
    <span style={{
      ...baseStyles.badge,
      background: meta.bgColor,
      color: meta.color,
      fontSize: isSmall ? 11 : 12,
      padding: isSmall ? "2px 8px" : "4px 12px",
      border: `1px solid ${meta.color}22`,
    }}>
      <span style={{ fontSize: isSmall ? 12 : 14 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function LegacyPriorityBadge_v2({ priority }) {
  const map = {
    high: { bg: theme.colors.danger50, color: theme.colors.danger500, border: `${theme.colors.danger500}22`, text: "High Priority" },
    medium: { bg: theme.colors.accent50, color: theme.colors.accent500, border: `${theme.colors.accent500}22`, text: "Watch" },
    low: { bg: theme.colors.success50, color: theme.colors.success500, border: `${theme.colors.success500}22`, text: "Stable" },
  };
  const current = map[priority] || map.low;
  return (
    <span style={{ ...baseStyles.badge, background: current.bg, color: current.color, border: `1px solid ${current.border}` }}>
      {priority === "high" && <AlertTriangle size={12} />}
      {priority === "medium" && <Eye size={12} />}
      {priority === "low" && <CheckCircle size={12} />}
      {current.text}
    </span>
  );
}

function LegacyLoginPage_v2({ onLogin }) {
  const accounts = [
    { email: "admin@unitflow.ai", password: "demo1234", role: "admin", name: "Admin Kim" },
    { email: "instructor@unitflow.ai", password: "demo1234", role: "instructor", name: "Instructor Lee" },
    { email: "student@unitflow.ai", password: "demo1234", role: "student", name: "Student Park" },
  ];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredDemo, setHoveredDemo] = useState(null);

  const submitLogin = async (nextEmail, nextPassword) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/frontend/login", {
        method: "POST",
        body: { email: nextEmail, password: nextPassword },
      });
      const session = { accessToken: response.accessToken, user: response.user };
      storeSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      ...baseStyles.page,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${theme.colors.slate50} 0%, ${theme.colors.primary50} 50%, ${theme.colors.ai50} 100%)`,
    }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.xl,
              background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${theme.colors.primary600}40`,
            }}>
              <Brain size={26} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: theme.colors.slate900, letterSpacing: -0.5 }}>UnitFlow</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.colors.primary600, letterSpacing: 2, textTransform: "uppercase" }}>AI Learning Strategy</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: theme.colors.slate500, marginTop: 12 }}>
            Explainable diagnosis and goal-aligned strategy generation
          </p>
        </div>

        <div style={{ ...baseStyles.card, padding: "32px", boxShadow: theme.shadow.xl, borderRadius: theme.radius["2xl"] }}>
          <form onSubmit={(e) => { e.preventDefault(); submitLogin(email, password); }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: fontStack,
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: fontStack,
                }}
              />
            </div>

            {error && <div style={{ marginBottom: 16, fontSize: 13, color: theme.colors.danger500 }}>{error}</div>}

            <button type="submit" style={{ ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", marginBottom: 18 }} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ borderTop: `1px solid ${theme.colors.slate100}`, paddingTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.slate500, marginBottom: 10 }}>Quick demo accounts</div>
            <div style={{ display: "grid", gap: 10 }}>
              {accounts.map((account, index) => (
                <button
                  key={account.email}
                  onClick={() => submitLogin(account.email, account.password)}
                  onMouseEnter={() => setHoveredDemo(index)}
                  onMouseLeave={() => setHoveredDemo(null)}
                  style={{
                    ...baseStyles.btnSecondary,
                    width: "100%",
                    justifyContent: "space-between",
                    background: hoveredDemo === index ? theme.colors.slate50 : theme.colors.white,
                  }}
                >
                  <span>{account.name}</span>
                  <span style={{ fontSize: 12, color: theme.colors.slate500 }}>{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegacyAppLayout_v2({ user, currentPage, setCurrentPage, onLogout, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuItems = useMemo(() => {
    const base = [{ id: "dashboard", label: "Dashboard", icon: Home }];
    if (user.role === "instructor" || user.role === "admin") {
      base.push(
        { id: "students", label: "Students", icon: Users },
        { id: "exams", label: "Exams", icon: FileText },
        { id: "universities", label: "Universities", icon: School },
      );
    }
    if (user.role === "student") {
      base.push(
        { id: "my-strategy", label: "My Strategy", icon: Target },
        { id: "my-exams", label: "My Exams", icon: FileText },
      );
    }
    return base;
  }, [user.role]);

  const roleInfo = {
    instructor: { label: "Instructor", color: theme.colors.primary600, bg: theme.colors.primary50 },
    student: { label: "Student", color: theme.colors.success600, bg: theme.colors.success50 },
    admin: { label: "Admin", color: theme.colors.ai500, bg: theme.colors.ai50 },
  }[user.role];

  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  return (
    <div style={{ ...baseStyles.page, display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: sidebarWidth,
        background: theme.colors.white,
        borderRight: `1px solid ${theme.colors.slate200}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
        boxShadow: theme.shadow.sm,
      }}>
        <div style={{
          padding: sidebarCollapsed ? "20px 12px" : "20px 20px",
          borderBottom: `1px solid ${theme.colors.slate100}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: theme.radius.lg,
            background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <Brain size={20} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: theme.colors.slate900, lineHeight: 1.2 }}>UnitFlow</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: theme.colors.primary600, letterSpacing: 1.5, textTransform: "uppercase" }}>AI Strategy</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id || (item.id === "students" && currentPage.startsWith("student-"));
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: sidebarCollapsed ? "10px" : "10px 14px",
                  borderRadius: theme.radius.lg,
                  border: "none",
                  background: active ? theme.colors.primary50 : "transparent",
                  color: active ? theme.colors.primary700 : theme.colors.slate600,
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  width: "100%",
                  fontFamily: fontStack,
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                }}
                title={sidebarCollapsed ? item.label : ""}
              >
                <Icon size={19} />
                {!sidebarCollapsed && item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 8, borderTop: `1px solid ${theme.colors.slate100}` }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: 8,
              border: "none",
              borderRadius: theme.radius.md,
              background: "transparent",
              cursor: "pointer",
              color: theme.colors.slate400,
            }}
          >
            <Menu size={16} />
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: sidebarWidth, flex: 1, minWidth: 0, transition: "margin-left 0.2s ease" }}>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(248,250,252,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${theme.colors.slate200}`,
          padding: "16px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.slate900 }}>UnitFlow Workspace</div>
              <div style={{ fontSize: 13, color: theme.colors.slate500 }}>Explainable diagnosis and strategy workflow</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...baseStyles.badge, background: roleInfo.bg, color: roleInfo.color }}>{roleInfo.label}</span>
              <span style={{ fontSize: 14, color: theme.colors.slate700 }}>{user.name || user.email}</span>
              <button onClick={onLogout} style={baseStyles.btnSecondary}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </header>
        <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}

function LegacyGapBar_v2({ current, target, label, color = theme.colors.primary500 }) {
  const safeCurrent = Number(current || 0);
  const safeTarget = Number(target || 0);
  const gap = safeTarget - safeCurrent;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.slate700 }}>{label}</span>
        <span style={{ fontSize: 12, color: theme.colors.slate500 }}>
          {safeCurrent} to {safeTarget}
          <span
            style={{
              color: gap > 10 ? theme.colors.danger500 : gap > 5 ? theme.colors.accent500 : theme.colors.success500,
              fontWeight: 600,
              marginLeft: 6,
            }}
          >
            {gap > 0 ? `gap ${gap}` : "on track"}
          </span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: theme.colors.slate100 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            borderRadius: 5,
            width: `${Math.min(100, Math.max(0, safeTarget))}%`,
            background: `${color}18`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            borderRadius: 5,
            width: `${Math.min(100, Math.max(0, safeCurrent))}%`,
            background: color,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function LegacyDemoHelper_v2({ text }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      style={{
        background: theme.colors.ai50,
        border: `1px solid ${theme.colors.ai400}33`,
        borderRadius: theme.radius.lg,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        fontSize: 13,
        color: theme.colors.ai600,
      }}
    >
      <HelpCircle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          color: theme.colors.ai400,
          display: "flex",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function LegacyCustomTooltip_v2({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme.colors.slate800,
        color: "#fff",
        padding: "8px 12px",
        borderRadius: theme.radius.md,
        fontSize: 12,
        boxShadow: theme.shadow.lg,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((item, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: item.color }} />
          <span>{item.name}: {item.value}</span>
        </div>
      ))}
    </div>
  );
}

function LegacyUniversityPolicyPage_v3() {
  const auth = useAuth();
  const [selectedUniv, setSelectedUniv] = useState(null);
  const [universities, setUniversities] = useState(() => buildMockUniversityPolicies().universities);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUniversities() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/universities", { token: auth.accessToken });
        if (cancelled) return;
        setUniversities(response.universities || buildMockUniversityPolicies().universities);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setUniversities(buildMockUniversityPolicies().universities);
        setLoadError(error instanceof Error ? error.message : "대학 정책 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUniversities();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  return (
    <div>
      <DemoHelper text="대학 정책 카드와 백엔드 정책 데이터를 실제로 연동한 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          대학 정책 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}
      {loading && <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {universities.map((university) => {
          const isSelected = selectedUniv === university.id;
          return (
            <div
              key={university.id}
              onClick={() => setSelectedUniv(isSelected ? null : university.id)}
              style={{
                ...baseStyles.card,
                cursor: "pointer",
                border: `1px solid ${isSelected ? theme.colors.primary500 + "50" : theme.colors.slate200}`,
                background: isSelected ? theme.colors.primary50 + "40" : theme.colors.white,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: theme.radius.lg,
                  background: theme.colors.primary50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <School size={20} color={theme.colors.primary600} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.colors.slate800, margin: 0 }}>{university.universityName}</h3>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{university.admissionType}</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 8 }}>과목 반영 비율</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(university.subjectWeights || {}).map(([subjectCode, weight]) => (
                    <div key={subjectCode} style={{
                      padding: "6px 10px",
                      borderRadius: theme.radius.md,
                      background: `${SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500}10`,
                      border: `1px solid ${(SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500)}20`,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                      <span style={{ fontWeight: 600, color: SUBJECT_CODE_META[subjectCode]?.color || theme.colors.primary500 }}>
                        {SUBJECT_CODE_META[subjectCode]?.label || subjectCode} {Math.round(Number(weight) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div style={{ borderTop: `1px solid ${theme.colors.slate200}`, paddingTop: 14, marginTop: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>필수 반영 과목</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{(university.requiredSubjects || []).join(", ") || "-"}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>가산 규칙</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>
                      {(university.bonusRules || []).map((rule) => rule.text || JSON.stringify(rule)).join(", ") || "-"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>목표 점수</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{university.targetScore}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.slate500, marginBottom: 4 }}>비고</div>
                    <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{university.notes || "-"}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegacyStudentListPage_v3({ onNavigate }) {
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [students, setStudents] = useState(STUDENTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/students", { token: auth.accessToken });
        if (cancelled) return;
        setStudents(response.students || STUDENTS);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setStudents(STUDENTS);
        setLoadError(error instanceof Error ? error.message : "학생 목록 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const classOptions = ["all", ...new Set(students.map((student) => student.classGroup).filter(Boolean))];
  const filtered = students.filter((student) => {
    const keyword = searchTerm.trim().toLowerCase();
    const targetUniv = (student.targetUniv || "").toLowerCase();
    const matchSearch = !keyword || student.name.toLowerCase().includes(keyword) || targetUniv.includes(keyword);
    const matchClass = filterClass === "all" || student.classGroup === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div>
      <DemoHelper text="학생 목록과 상담 우선순위를 실제 백엔드 데이터로 불러오는 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 목록 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={theme.colors.slate400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="학생명 또는 목표 대학 검색"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.slate200}`,
              fontSize: 14,
              outline: "none",
              fontFamily: fontStack,
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.slate200}`,
            fontSize: 14,
            fontFamily: fontStack,
            background: theme.colors.white,
            color: theme.colors.slate700,
            cursor: "pointer",
          }}
        >
          {classOptions.map((className) => (
            <option key={className} value={className}>
              {className === "all" ? "전체 반" : className}
            </option>
          ))}
        </select>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["학생", "반", "목표 대학", "최근 점수", "격차", "취약 유형", "상담 우선도"].map((header) => (
                <th
                  key={header}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.slate500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr
                key={student.id}
                onClick={() => onNavigate(`student-${student.id}`)}
                style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.slate50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: theme.radius.full,
                      background: theme.colors.primary50,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: theme.colors.primary600,
                      fontSize: 14,
                    }}>
                      {student.name?.[0] || "학"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{student.name}</div>
                      <div style={{ fontSize: 12, color: theme.colors.slate400 }}>{student.grade}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{student.classGroup || "-"}</td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{student.targetUniv || "미설정"}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                  {student.recentExams[student.recentExams.length - 1]?.totalScore ?? "-"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: student.gapScore > 20 ? theme.colors.danger500 : student.gapScore > 10 ? theme.colors.accent500 : theme.colors.success500,
                  }}>
                    {student.gapScore}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {student.weaknessTypes.slice(0, 2).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} size="sm" />)}
                    {student.weaknessTypes.length > 2 && <span style={{ fontSize: 11, color: theme.colors.slate400 }}>+{student.weaknessTypes.length - 2}</span>}
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <PriorityBadge priority={student.consultPriority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={Search} title="검색 결과 없음" description="검색어 또는 반 필터 확인 필요." />}
      </div>
    </div>
  );
}

function LegacyWeaknessBadge_v3({ typeId, size = "md" }) {
  const meta = {
    wt1: { label: "개념 결손", color: "#EF4444", bgColor: "#FEE2E2", icon: "개" },
    wt2: { label: "계산 실수", color: "#F97316", bgColor: "#FFEDD5", icon: "계" },
    wt3: { label: "시간 압박", color: "#FBBF24", bgColor: "#FEF3C7", icon: "시" },
    wt4: { label: "선행 결손", color: "#8B5CF6", bgColor: "#EDE9FE", icon: "선" },
    wt5: { label: "유형 편중", color: "#EC4899", bgColor: "#FCE7F3", icon: "유" },
    wt6: { label: "변동성 높음", color: "#6366F1", bgColor: "#E0E7FF", icon: "변" },
  }[typeId];
  if (!meta) return null;
  const isSmall = size === "sm";
  return (
    <span style={{
      ...baseStyles.badge,
      background: meta.bgColor,
      color: meta.color,
      fontSize: isSmall ? 11 : 12,
      padding: isSmall ? "2px 8px" : "4px 12px",
      border: `1px solid ${meta.color}22`,
    }}>
      <span style={{ fontSize: isSmall ? 12 : 14 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function LegacyPriorityBadge_v3({ priority }) {
  const map = {
    high: { bg: theme.colors.danger50, color: theme.colors.danger500, border: `${theme.colors.danger500}22`, text: "상담 우선" },
    medium: { bg: theme.colors.accent50, color: theme.colors.accent500, border: `${theme.colors.accent500}22`, text: "관찰 필요" },
    low: { bg: theme.colors.success50, color: theme.colors.success500, border: `${theme.colors.success500}22`, text: "안정" },
  };
  const current = map[priority] || map.low;
  return (
    <span style={{ ...baseStyles.badge, background: current.bg, color: current.color, border: `1px solid ${current.border}` }}>
      {priority === "high" && <AlertTriangle size={12} />}
      {priority === "medium" && <Eye size={12} />}
      {priority === "low" && <CheckCircle size={12} />}
      {current.text}
    </span>
  );
}

function LegacyLoginPage_v3({ onLogin }) {
  const accounts = [
    { email: "admin@unitflow.ai", password: "demo1234", role: "admin", name: "관리자" },
    { email: "instructor@unitflow.ai", password: "demo1234", role: "instructor", name: "김민수 선생님" },
    { email: "student@unitflow.ai", password: "demo1234", role: "student", name: "이서연 학생" },
  ];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredDemo, setHoveredDemo] = useState(null);

  const submitLogin = async (nextEmail, nextPassword) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/frontend/login", {
        method: "POST",
        body: { email: nextEmail, password: nextPassword },
      });
      const session = { accessToken: response.accessToken, user: response.user };
      storeSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      ...baseStyles.page,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${theme.colors.slate50} 0%, ${theme.colors.primary50} 50%, ${theme.colors.ai50} 100%)`,
    }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.xl,
              background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${theme.colors.primary600}40`,
            }}>
              <Brain size={26} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: theme.colors.slate900, letterSpacing: -0.5 }}>UnitFlow</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.colors.primary600, letterSpacing: 2, textTransform: "uppercase" }}>AI Learning Strategy</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: theme.colors.slate500, marginTop: 12 }}>
            설명 가능한 진단과 목표 기반 학습 전략 생성
          </p>
        </div>

        <div style={{ ...baseStyles.card, padding: "32px", boxShadow: theme.shadow.xl, borderRadius: theme.radius["2xl"] }}>
          <form onSubmit={(e) => { e.preventDefault(); submitLogin(email, password); }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="이메일 입력"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: fontStack,
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.colors.slate700, marginBottom: 6 }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="비밀번호 입력"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${error ? theme.colors.danger500 : theme.colors.slate200}`,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: fontStack,
                }}
              />
            </div>

            {error && <div style={{ marginBottom: 16, fontSize: 13, color: theme.colors.danger500 }}>{error}</div>}

            <button type="submit" style={{ ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", marginBottom: 18 }} disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div style={{ borderTop: `1px solid ${theme.colors.slate100}`, paddingTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.slate500, marginBottom: 10 }}>데모 계정</div>
            <div style={{ display: "grid", gap: 10 }}>
              {accounts.map((account, index) => (
                <button
                  key={account.email}
                  onClick={() => submitLogin(account.email, account.password)}
                  onMouseEnter={() => setHoveredDemo(index)}
                  onMouseLeave={() => setHoveredDemo(null)}
                  style={{
                    ...baseStyles.btnSecondary,
                    width: "100%",
                    justifyContent: "space-between",
                    background: hoveredDemo === index ? theme.colors.slate50 : theme.colors.white,
                  }}
                >
                  <span>{account.name}</span>
                  <span style={{ fontSize: 12, color: theme.colors.slate500 }}>{account.role === "admin" ? "관리자" : account.role === "instructor" ? "강사" : "학생"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegacyAppLayout_v3({ user, currentPage, setCurrentPage, onLogout, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuItems = useMemo(() => {
    const base = [{ id: "dashboard", label: "대시보드", icon: Home }];
    if (user.role === "instructor" || user.role === "admin") {
      base.push(
        { id: "students", label: "학생", icon: Users },
        { id: "exams", label: "시험", icon: FileText },
        { id: "universities", label: "대학 정책", icon: School },
      );
    }
    if (user.role === "student") {
      base.push(
        { id: "my-strategy", label: "나의 전략", icon: Target },
        { id: "my-exams", label: "나의 시험", icon: FileText },
      );
    }
    return base;
  }, [user.role]);

  const roleInfo = {
    instructor: { label: "강사", color: theme.colors.primary600, bg: theme.colors.primary50 },
    student: { label: "학생", color: theme.colors.success600, bg: theme.colors.success50 },
    admin: { label: "관리자", color: theme.colors.ai500, bg: theme.colors.ai50 },
  }[user.role];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: theme.colors.slate50 }}>
      <aside style={{
        width: sidebarCollapsed ? 88 : 260,
        transition: "width 0.2s ease",
        background: theme.colors.white,
        borderRight: `1px solid ${theme.colors.slate200}`,
        padding: 20,
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: theme.radius.xl,
              background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Brain size={22} color="#fff" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: theme.colors.slate900 }}>UnitFlow</div>
                <div style={{ fontSize: 11, color: theme.colors.slate500 }}>AI 학습 전략</div>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarCollapsed((prev) => !prev)} style={{ ...baseStyles.iconBtn, width: 34, height: 34 }}>
            <Menu size={16} />
          </button>
        </div>

        <div style={{ marginBottom: 24, padding: 14, borderRadius: theme.radius.xl, background: roleInfo.bg }}>
          <div style={{ fontSize: 12, color: theme.colors.slate500, marginBottom: 4 }}>현재 사용자</div>
          {!sidebarCollapsed && <div style={{ fontWeight: 700, color: theme.colors.slate900, marginBottom: 6 }}>{user.name}</div>}
          <span style={{ ...baseStyles.badge, background: theme.colors.white, color: roleInfo.color }}>{roleInfo.label}</span>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {menuItems.map((item) => {
            const active = currentPage === item.id || (item.id === "students" && currentPage.startsWith("student-"));
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: sidebarCollapsed ? "12px" : "12px 14px",
                  borderRadius: theme.radius.xl,
                  border: "none",
                  background: active ? theme.colors.primary50 : "transparent",
                  color: active ? theme.colors.primary600 : theme.colors.slate600,
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 24 }}>
          <button onClick={onLogout} style={{ ...baseStyles.btnSecondary, width: "100%", justifyContent: "center" }}>
            <LogOut size={16} />
            {!sidebarCollapsed && "로그아웃"}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: theme.colors.slate500, marginBottom: 6 }}>{roleInfo.label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.slate900 }}>
            {{
              dashboard: user.role === "student" ? "나의 학습 현황" : "대시보드",
              students: "학생 목록",
              exams: "시험 관리",
              universities: "대학 정책",
              "my-strategy": "나의 전략",
              "my-exams": "나의 시험",
            }[currentPage] || (currentPage.startsWith("student-") ? "학생 상세" : "대시보드")}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function LegacyExamManagementPage_v3() {
  const auth = useAuth();
  const [exams, setExams] = useState(EXAMS);
  const [metadata, setMetadata] = useState({ academies: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [form, setForm] = useState({
    academy_id: 1,
    subject_id: 1,
    name: "",
    exam_date: new Date().toISOString().slice(0, 10),
    total_score: 100,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadExamsAndMetadata() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const [examResponse, metadataResponse] = await Promise.all([
          apiRequest("/frontend/exams", { token: auth.accessToken }),
          apiRequest("/frontend/metadata", { token: auth.accessToken }),
        ]);
        if (cancelled) return;
        setExams(examResponse.exams || EXAMS);
        setMetadata(metadataResponse || { academies: [], subjects: [] });
        setForm((prev) => ({
          ...prev,
          academy_id: metadataResponse?.academies?.[0]?.id || prev.academy_id,
          subject_id: metadataResponse?.subjects?.[0]?.id || prev.subject_id,
          name: prev.name || `빠른 시험 ${new Date().toISOString().slice(0, 10)}`,
        }));
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setExams(EXAMS);
        setMetadata({ academies: [], subjects: [] });
        setLoadError(error instanceof Error ? error.message : "시험 데이터 조회 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExamsAndMetadata();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  const canCreateExam = Boolean(
    form.name.trim() &&
    form.exam_date &&
    Number(form.academy_id) > 0 &&
    Number(form.subject_id) > 0 &&
    Number(form.total_score) > 0
  );

  const handleCreateExam = async () => {
    if (!auth?.accessToken || auth.user.role === "student") return;
    if (!form.name.trim()) {
      setFormError("시험명 입력 필요.");
      setCreateMessage("");
      return;
    }
    if (!form.exam_date) {
      setFormError("시험일 입력 필요.");
      setCreateMessage("");
      return;
    }
    if (Number(form.total_score) <= 0) {
      setFormError("총점은 0보다 커야 함.");
      setCreateMessage("");
      return;
    }
    setCreating(true);
    setFormError("");
    setCreateMessage("");
    try {
      const created = await apiRequest("/frontend/exams", {
        method: "POST",
        token: auth.accessToken,
        body: {
          academy_id: Number(form.academy_id),
          subject_id: Number(form.subject_id),
          name: form.name || `빠른 시험 ${new Date().toISOString().slice(0, 10)}`,
          exam_date: form.exam_date,
          total_score: Number(form.total_score),
        },
      });
      setExams((prev) => [created, ...prev]);
      setForm((prev) => ({
        ...prev,
        name: `빠른 시험 ${new Date().toISOString().slice(0, 10)}`,
      }));
      setLoadError("");
      setCreateMessage("시험 등록 완료.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "시험 등록 실패");
      setFormError("시험 등록 실패. 입력값과 권한 확인 필요.");
    } finally {
      setCreating(false);
    }
  };

  const statusMeta = (status) => {
    const normalized = String(status || "").toLowerCase();
    const done = normalized === "completed" || normalized === "complete";
    return {
      label: done ? "완료" : "예정",
      background: done ? theme.colors.success50 : theme.colors.accent50,
      color: done ? theme.colors.success600 : theme.colors.accent500,
      border: done ? theme.colors.success500 : theme.colors.accent400,
      icon: done ? <CheckCircle size={12} /> : <Clock size={12} />,
    };
  };

  return (
    <div>
      <DemoHelper text="시험 등록과 시험 목록을 실제 백엔드와 연동한 관리 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          시험 데이터 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}
      {formError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          {formError}
        </div>
      )}
      {createMessage && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.success50, color: theme.colors.success600 }}>
          {createMessage}
        </div>
      )}
      {loading && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 10, flex: 1, marginRight: 16 }}>
          <input
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            placeholder="시험명"
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
          <select
            value={form.academy_id}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, academy_id: Number(e.target.value) }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          >
            {(metadata.academies.length ? metadata.academies : [{ id: 1, name: "기본 학원" }]).map((academy) => (
              <option key={academy.id} value={academy.id}>{academy.name}</option>
            ))}
          </select>
          <select
            value={form.subject_id}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, subject_id: Number(e.target.value) }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          >
            {(metadata.subjects.length ? metadata.subjects : [{ id: 1, code: "GEN", name: "공통" }]).map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.exam_date}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, exam_date: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
          <input
            type="number"
            min="1"
            max="1000"
            value={form.total_score}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, total_score: e.target.value }));
              setFormError("");
              setCreateMessage("");
            }}
            placeholder="총점"
            style={{ padding: "10px 12px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate200}`, fontFamily: fontStack }}
          />
        </div>
        <button style={baseStyles.btnPrimary} onClick={handleCreateExam} disabled={creating || loading || auth?.user?.role === "student" || !canCreateExam}>
          <Plus size={16} /> {creating ? "등록 중..." : "빠른 시험 등록"}
        </button>
      </div>

      <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
              {["시험", "일자", "과목", "문항 수", "응시 인원", "평균", "상태"].map((header) => (
                <th key={header} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.colors.slate500 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const status = statusMeta(exam.status);
              return (
                <tr
                  key={exam.id}
                  style={{ borderBottom: `1px solid ${theme.colors.slate100}`, cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.slate50; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14, color: theme.colors.slate800 }}>{exam.name}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.date}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.subject}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.questionCount}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: theme.colors.slate600 }}>{exam.participantCount}</td>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: theme.colors.slate800 }}>
                    {exam.avgScore ?? "-"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      ...baseStyles.badge,
                      background: status.background,
                      color: status.color,
                      border: `1px solid ${status.border}22`,
                    }}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegacyInstructorDashboard_v4({ onNavigate }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(() => buildMockInstructorDashboard());
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/instructor", { token: auth.accessToken });
        if (cancelled) return;
        setDashboard(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDashboard(buildMockInstructorDashboard());
        setLoadError(error instanceof Error ? error.message : "Instructor dashboard request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...baseStyles.card }}><LoadingSkeleton lines={3} /></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <DemoHelper text="강사용 대시보드와 실제 분석 데이터를 연결한 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          강사용 대시보드 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {dashboard.stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.label.includes("Priority") ? AlertTriangle : stat.label.includes("average") ? TrendingUp : stat.label.includes("Strategies") ? Brain : Users}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            color={theme.colors.primary600}
            bgColor={theme.colors.primary50}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={AlertTriangle} title="상담 우선 학생" subtitle="목표 대학 대비 격차가 큰 학생 우선" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dashboard.consultPriorityStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => onNavigate(`student-${student.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.slate100}`, cursor: "pointer" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: theme.radius.full, background: theme.colors.primary50, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: theme.colors.primary600 }}>
                  {student.name?.[0] || "학"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</span>
                    <PriorityBadge priority={student.consultPriority} />
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{student.targetUniv || "목표 대학 미설정"} · 격차 {student.gapScore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...baseStyles.card }}>
          <SectionHeader icon={Brain} title="취약 유형 분포" subtitle="현재 진단 기준 학생 분포" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dashboard.weaknessDistribution.map((item) => (
              <div key={item.weaknessTypeId}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.count}</span>
                </div>
                <ProgressBar value={item.count} max={Math.max(dashboard.consultPriorityStudents.length, 1)} color={theme.colors.ai500} height={6} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegacyStudentDetailPage_v4({ studentId, onBack }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [detail, setDetail] = useState(() => buildMockStudentDetail(studentId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentDetail() {
      setLoading(true);
      try {
        const path = auth?.user?.role === "student" ? "/frontend/dashboard/student" : `/frontend/students/${studentId}`;
        const response = await apiRequest(path, { token: auth?.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail(studentId));
        setLoadError(error instanceof Error ? error.message : "Student detail request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudentDetail();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, auth?.user?.role, studentId]);

  if (loading) {
    return (
      <div>
        <div style={{ ...baseStyles.card, marginBottom: 16 }}><LoadingSkeleton lines={4} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
          <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>
        </div>
      </div>
    );
  }

  const student = detail.student;
  const subjects = detail.subjects || [];
  const recentExams = student.recentExams || [];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "strategy", label: "Strategy" },
    { id: "subjects", label: "Subjects" },
    { id: "exams", label: "Exams" },
  ];
  const radarData = subjects.map((subject) => ({
    subject: subject.subjectName,
    current: subject.currentScore,
    target: subject.targetScore,
  }));

  return (
    <div>
      <button onClick={onBack} style={{ ...baseStyles.btnSecondary, marginBottom: 16, padding: "8px 14px" }}>
        <ArrowLeft size={16} /> Back to students
      </button>
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 상세 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ ...baseStyles.card, marginBottom: 20, padding: "24px 28px", background: `linear-gradient(135deg, ${theme.colors.white}, ${theme.colors.primary50}40)` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: theme.radius.xl, background: `linear-gradient(135deg, ${theme.colors.primary100}, ${theme.colors.ai100})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: theme.colors.primary700, fontSize: 24 }}>
            {student.name?.[0] || "학"}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.slate900, margin: 0 }}>{student.name}</h2>
              <PriorityBadge priority={student.consultPriority} />
              {(detail.diagnosis?.weaknessTypes || []).map((typeId) => <WeaknessBadge key={typeId} typeId={typeId} />)}
            </div>
            <div style={{ fontSize: 14, color: theme.colors.slate500, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>{student.grade} · {student.classGroup || "반 미배정"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><School size={14} /> {student.targetUniv || "목표 대학 미설정"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "16px 24px", background: theme.colors.white, borderRadius: theme.radius.xl, border: `1px solid ${theme.colors.slate200}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.primary600 }}>{recentExams[recentExams.length - 1]?.totalScore || "-"}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>최근 점수</div>
            </div>
            <div style={{ width: 1, height: 40, background: theme.colors.slate200 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: student.gapScore > 20 ? theme.colors.danger500 : theme.colors.accent500 }}>{student.gapScore}</div>
              <div style={{ fontSize: 11, color: theme.colors.slate400 }}>목표 격차</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...baseStyles.btnGhost,
              background: activeTab === tab.id ? theme.colors.primary50 : theme.colors.white,
              color: activeTab === tab.id ? theme.colors.primary600 : theme.colors.slate600,
              border: `1px solid ${activeTab === tab.id ? theme.colors.primary200 : theme.colors.slate200}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Brain} title="Diagnosis Evidence" subtitle="Explainable evidence for the current diagnosis" />
            {(detail.diagnosis?.evidence || []).length ? (
              detail.diagnosis.evidence.map((item, index) => (
                <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.slate50, borderRadius: theme.radius.md }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.colors.slate500 }}>{item.type || "evidence"}</div>
                  <div style={{ fontSize: 13, color: theme.colors.slate700 }}>{item.reason || JSON.stringify(item)}</div>
                </div>
              ))
            ) : (
              <EmptyState icon={Info} title="No evidence items" description="Fallback mode or sparse analysis data." />
            )}
          </div>

          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Target} title="Target Position" subtitle="Current weighted score versus target score" />
            <GapBar current={detail.targetGap?.weighted_score || 0} target={detail.targetGap?.target_score || 0} label={detail.targetGap?.university_name || "Target university"} />
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Current" dataKey="current" stroke={theme.colors.primary500} fill={theme.colors.primary500} fillOpacity={0.2} />
                  <Radar name="Target" dataKey="target" stroke={theme.colors.ai500} fill={theme.colors.ai500} fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "strategy" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Sparkles} title="Strategy Summary" subtitle="Structured strategy from live analysis" action={<AIBadge />} />
            <p style={{ fontSize: 14, color: theme.colors.slate700, lineHeight: 1.7 }}>{detail.strategy?.summary || "No strategy summary available."}</p>
          </div>
          <div style={{ ...baseStyles.card }}>
            <SectionHeader icon={Lightbulb} title="Coaching Notes" subtitle="Points to focus during coaching or self-study" />
            {(detail.strategy?.coachingPoints || []).map((point, index) => (
              <div key={index} style={{ padding: "12px 14px", marginBottom: 8, background: theme.colors.ai50, borderRadius: theme.radius.md }}>{point}</div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "subjects" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {subjects.map((subject) => (
            <div key={subject.subjectCode} style={{ ...baseStyles.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{subject.subjectName}</div>
                  <div style={{ fontSize: 12, color: theme.colors.slate500 }}>{subject.subjectCode}</div>
                </div>
                <div style={{ fontSize: 12, color: theme.colors.slate500 }}>weight {Math.round((subject.universityWeight || 0) * 100)}%</div>
              </div>
              <GapBar current={subject.currentScore} target={subject.targetScore} label="Current vs target" color={SUBJECT_CODE_META[subject.subjectCode]?.color || theme.colors.primary500} />
            </div>
          ))}
        </div>
      )}

      {activeTab === "exams" && (
        <div style={{ ...baseStyles.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.colors.slate50, borderBottom: `1px solid ${theme.colors.slate200}` }}>
                {["Exam", "Date", "Score", "Max"].map((header) => (
                  <th key={header} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.colors.slate500 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentExams.map((exam) => (
                <tr key={exam.id} style={{ borderBottom: `1px solid ${theme.colors.slate100}` }}>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.name}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.date}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>{exam.totalScore}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{exam.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LegacyStudentDashboard_v4() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(() => buildMockStudentDetail("st1"));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!auth?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest("/frontend/dashboard/student", { token: auth.accessToken });
        if (cancelled) return;
        setDetail(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setDetail(buildMockStudentDetail("st1"));
        setLoadError(error instanceof Error ? error.message : "Student dashboard request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken]);

  if (loading) {
    return <div style={{ ...baseStyles.card }}><LoadingSkeleton lines={6} /></div>;
  }

  const student = detail.student;
  const topSubjects = (detail.strategy?.timeAllocation || []).slice(0, 3);

  return (
    <div>
      <DemoHelper text="학생용 대시보드와 현재 분석 결과를 실제로 연동한 화면이다." />
      {loadError && (
        <div style={{ ...baseStyles.card, marginBottom: 16, background: theme.colors.warning50, color: theme.colors.warning500 }}>
          학생 대시보드 조회 실패. 예시 데이터 표시 상태.
        </div>
      )}

      <div style={{ ...baseStyles.card, marginBottom: 20, background: `linear-gradient(135deg, ${theme.colors.primary600}, ${theme.colors.ai500})`, color: "#fff", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{student.name}</h2>
            <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>목표 대학: <strong>{student.targetUniv || "미설정"}</strong></p>
          </div>
          <div style={{ padding: "16px 28px", background: "rgba(255,255,255,0.15)", borderRadius: theme.radius.xl, backdropFilter: "blur(8px)", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{student.recentExams?.[student.recentExams.length - 1]?.totalScore || "-"}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>현재 점수 · 격차 {student.gapScore}</div>
          </div>
        </div>
      </div>

      <div style={{ ...baseStyles.card, marginBottom: 20 }}>
        <SectionHeader icon={Sparkles} title="오늘의 집중 포인트" subtitle="현재 분석 결과 기반 우선 전략" action={<AIBadge />} />
        <p style={{ fontSize: 14, color: theme.colors.slate700, lineHeight: 1.7 }}>{detail.strategy?.summary || "요약 전략 없음."}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {topSubjects.map((item, index) => (
            <div key={`${item.subject_code}-${index}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.subject_code}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.ratio_percent}%</span>
              </div>
              <ProgressBar value={item.ratio_percent} max={100} color={theme.colors.primary500} height={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [restoring, setRestoring] = useState(true);

  const getDefaultPageForRole = useCallback((role) => {
    if (role === "student") return "dashboard";
    return "dashboard";
  }, []);

  useEffect(() => {
    const restored = getStoredSession();
    if (!restored?.accessToken) {
      setRestoring(false);
      return;
    }

    let cancelled = false;

    async function restore() {
      try {
        const response = await apiRequest("/frontend/me", { token: restored.accessToken });
        if (cancelled) return;
        const nextSession = { accessToken: restored.accessToken, user: response.user };
        storeSession(nextSession);
        setSession(nextSession);
        setCurrentPage(getDefaultPageForRole(response.user.role));
      } catch {
        clearStoredSession();
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setRestoring(false);
        }
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [getDefaultPageForRole]);

  const handleLogin = (nextSession) => {
    setSession(nextSession);
    setCurrentPage(getDefaultPageForRole(nextSession.user.role));
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setCurrentPage("dashboard");
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    if (!session?.user) return;
    const userRole = session.user.role;
    const allowedPages = userRole === "student"
      ? new Set(["dashboard", "my-strategy", "my-exams"])
      : new Set(["dashboard", "students", "exams", "universities"]);

    if (userRole !== "student" && currentPage.startsWith("student-")) return;
    if (!allowedPages.has(currentPage)) {
      setCurrentPage(getDefaultPageForRole(userRole));
    }
  }, [currentPage, getDefaultPageForRole, session]);

  // Google Fonts for Pretendard
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
    document.head.appendChild(link);
  }, []);

  if (restoring) {
    return (
      <div style={{
        ...baseStyles.page,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.colors.slate50} 0%, ${theme.colors.primary50} 50%, ${theme.colors.ai50} 100%)`,
      }}>
        <div style={{ ...baseStyles.card, width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ display: "inline-flex", marginBottom: 16 }}>
            <AIBadge />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.slate900, marginBottom: 8 }}>세션 복원 중</div>
          <div style={{ fontSize: 14, color: theme.colors.slate500, marginBottom: 20 }}>저장된 로그인 정보와 접근 권한 확인 중.</div>
          <LoadingSkeleton lines={3} />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const user = session.user;

  const renderPage = () => {
    if (user.role === "student") {
      switch (currentPage) {
        case "dashboard": return <StudentDashboard />;
        case "my-strategy":
          return <StudentDetailPage studentId="st1" onBack={() => setCurrentPage("dashboard")} />;
        case "my-exams":
          return <ExamManagementPage />;
        default: return <StudentDashboard />;
      }
    }

    // Instructor / Admin
    if (currentPage.startsWith("student-")) {
      const studentId = currentPage.replace("student-", "");
      return <StudentDetailPage studentId={studentId} onBack={() => setCurrentPage("students")} />;
    }

    switch (currentPage) {
      case "dashboard": return <InstructorDashboard onNavigate={handleNavigate} />;
      case "students": return <StudentListPage onNavigate={handleNavigate} />;
      case "exams": return <ExamManagementPage />;
      case "universities": return <UniversityPolicyPage />;
      default: return <InstructorDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <AuthContext.Provider value={session}>
      <AppLayout user={user} currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout}>
        {renderPage()}
      </AppLayout>
    </AuthContext.Provider>
  );
}
