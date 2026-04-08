// apps/frontend/src/pages/StudentListPage.jsx
import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useRouter } from "../router/hashRouter.js";
import { apiClient } from "../lib/apiClient.js";
import { formatScore } from "../lib/formatters.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { LoadingPanel } from "../components/common/LoadingPanel.jsx";
import { StatusBox } from "../components/common/StatusBox.jsx";
import { WeaknessBadge, PriorityBadge } from "../components/common/VisualParts.jsx";

export function StudentListPage() {
  const { session } = useAuth();
  const { pathname, navigate } = useRouter();
  const [keyword, setKeyword] = useState("");
  const { data, error, loading } = useAsyncData(() => apiClient.getStudents(session.accessToken), [session.accessToken]);

  // 역할에 따라 학생 상세 경로 결정
  const basePath = pathname.startsWith("/admin") ? "/admin/students" : "/teacher/students";

  const filteredStudents = useMemo(() => {
    const students = data?.students ?? [];
    if (!keyword.trim()) return students;
    const lowered = keyword.trim().toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowered) ||
        (student.targetUniv ?? "").toLowerCase().includes(lowered),
    );
  }, [data, keyword]);

  return (
    <div className="page-grid">
      <section className="hero-card">
        <h1>학생 관리</h1>
        <p className="muted">상담이 필요한 학생을 찾고, 바로 상세 화면으로 이동할 수 있어요.</p>
        {loading ? <LoadingPanel title="학생 목록을 불러오는 중" description="학생 정보를 정리하고 있어요." /> : null}
        {error ? <StatusBox tone="error" title="학생 목록을 불러오지 못했어요" description={error} /> : null}
      </section>

      <section className="panel">
        <div className="toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="학생 이름 또는 목표 대학으로 검색"
            style={{ flex: 1 }}
          />
        </div>
      </section>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>학생</th>
              <th>반</th>
              <th>목표 대학</th>
              <th>상담 우선도</th>
              <th>취약 유형</th>
              <th>목표 대학 격차</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} onClick={() => navigate(`${basePath}/${student.id}`)} style={{ cursor: "pointer" }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "#3B82F615", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#3B82F6", fontSize: 13, flexShrink: 0 }}>{student.name[0]}</div>
                    <strong>{student.name}</strong>
                  </div>
                </td>
                <td>{student.classGroup ?? "-"}</td>
                <td>{student.targetUniv ?? "-"}</td>
                <td><PriorityBadge priority={student.consultPriority} /></td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(student.weaknessTypes ?? []).slice(0, 2).map((wt) => <WeaknessBadge key={wt} typeId={wt} small />)}
                    {(student.weaknessTypes ?? []).length === 0 && <span className="muted" style={{ fontSize: 12 }}>-</span>}
                  </div>
                </td>
                <td><strong style={{ color: student.gapScore > 20 ? "#EF4444" : student.gapScore > 10 ? "#F59E0B" : "#10B981" }}>{formatScore(student.gapScore)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredStudents.length === 0 && (
          <StatusBox tone="empty" title="표시할 학생이 없어요" description="검색 조건을 바꿔 보거나 학생을 먼저 등록해 주세요." />
        )}
      </section>
    </div>
  );
}
