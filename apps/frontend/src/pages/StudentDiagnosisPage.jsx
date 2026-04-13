// FE-201 + FE-202: 진단 상세 페이지 + 취약 유형별 공부 레시피
// 학생이 "총점"이 아닌 "약점 구조"로 자기 상태를 이해하고,
// 즉시 실행 가능한 학습 레시피로 연결하는 화면.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber, weaknessCoaching, weaknessLabel } from '../lib/studentLabels.js';

// 취약 유형별 정적 레시피 (백엔드 recipe가 없으면 fallback으로 사용)
const STATIC_RECIPES = {
  concept_gap: {
    do_methods: [
      '개념서 해당 단원을 먼저 정독하고 핵심 공식/원리를 직접 정리',
      '교과서 예제 → 유제 → 기출 순서로 단계적 접근',
      '오답 노트에 "개념 이해 못한 이유"를 구체적으로 기록',
    ],
    avoid_methods: [
      '개념 이해 없이 문제 풀이 양으로 버티기',
      '해설 바로 보기 (스스로 풀다 막혔을 때만)',
    ],
    session_length: '40분 집중 + 10분 정리',
    checkpoint: '이해 못 한 개념은 당일 재정리 후 다음날 재확인',
  },
  transfer_weakness: {
    do_methods: [
      '기본 개념 문제 5개 → 유형 변형 문제 5개 순서로 연결 훈련',
      '풀이 후 "이 개념을 어떤 다른 문제에 쓸 수 있나?" 스스로 질문',
      '다양한 출제 유형의 기출 문제로 적용 범위 확장',
    ],
    avoid_methods: [
      '동일 유형 문제만 반복 (익숙한 유형에서 실력 착각)',
      '풀이 방식을 암기식으로 외우기',
    ],
    session_length: '50분 연습 + 10분 유형 비교 정리',
    checkpoint: '틀린 문제는 "어떤 개념이 연결됐는지" 분석',
  },
  precision_accuracy: {
    do_methods: [
      '풀이 후 반드시 검산 루틴 고정 (2분 이내)',
      '오답 유형 분류: 계산 실수 vs 개념 혼동 vs 조건 누락',
      '계산 중간 과정을 모두 적는 습관',
    ],
    avoid_methods: [
      '빠르게 많이 푸는 것을 목표로 삼기',
      '검산 없이 바로 다음 문제로 넘어가기',
    ],
    session_length: '45분 풀이 + 15분 검산 및 오답 분석',
    checkpoint: '일주일치 오답 패턴 요약: 어느 단계에서 틀리는지',
  },
  time_pressure: {
    do_methods: [
      '실전처럼 타이머 켜고 풀기 (문제당 목표 시간 설정)',
      '풀이 순서 전략 고정: 쉬운 것 → 중간 → 어려운 것',
      '막힌 문제는 2분 내 판단해서 넘기고 나중에 돌아오기',
    ],
    avoid_methods: [
      '시간 없이 편하게 풀기만 하기',
      '어려운 문제에 지나치게 매달리기',
    ],
    session_length: '실전 시험 시간과 동일하게 연습',
    checkpoint: '시험 후 시간 배분 기록: 어느 파트에서 시간 낭비했나',
  },
  instability: {
    do_methods: [
      '시험 전 루틴 고정 (워밍업 문제 3개 → 실전 진입)',
      '고난도 문제 비율을 조금씩 늘려가며 안정감 훈련',
      '이전 시험 대비 취약점을 매번 1가지씩 집중 보완',
    ],
    avoid_methods: [
      '시험 전날 새 내용 공부하기',
      '점수 변동에 과도하게 반응해서 계획 바꾸기',
    ],
    session_length: '균형 잡힌 복습 위주: 새 내용보다 기존 내용 점검',
    checkpoint: '시험마다 "이번에 달라진 점" 1가지 정리',
  },
  persistence_risk: {
    do_methods: [
      '하루 최소 30분 "반드시 끝낸다"는 작은 목표 설정',
      '주간 계획을 큰 덩어리가 아닌 일별 소과제로 쪼개기',
      '완료한 항목에 체크 표시 — 성취감이 지속성을 만듦',
    ],
    avoid_methods: [
      '한 번에 몰아서 하려는 계획',
      '목표를 너무 크게 잡아서 시작조차 못 하는 패턴',
    ],
    session_length: '30~40분 짧게 + 완료 체크 후 다음 세션',
    checkpoint: '일주일에 3일 이상 실행했으면 성공으로 간주',
  },
};

function RecipeCard({ recipe, weaknessType }) {
  const staticRecipe = STATIC_RECIPES[weaknessType] || {};
  const doMethods = recipe?.do_methods || staticRecipe.do_methods || [];
  const avoidMethods = recipe?.avoid_methods || staticRecipe.avoid_methods || [];
  const sessionLength = recipe?.session_length || staticRecipe.session_length;
  const checkpoint = recipe?.checkpoint || staticRecipe.checkpoint;

  return (
    <div className="recipe-card">
      <div className="recipe-card-header">
        <span className="recipe-type-badge">{weaknessLabel(weaknessType)}</span>
        <span className="muted small">추천 학습 방식</span>
      </div>

      <div className="split-grid">
        <div>
          <p className="recipe-section-label">이렇게 공부해</p>
          <ul className="recipe-do-list">
            {doMethods.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
        <div>
          <p className="recipe-section-label">이런 패턴은 피해</p>
          <ul className="recipe-avoid-list">
            {avoidMethods.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      </div>

      {(sessionLength || checkpoint) ? (
        <div className="recipe-meta">
          {sessionLength ? (
            <span className="recipe-meta-item">
              <strong>세션 길이</strong> · {sessionLength}
            </span>
          ) : null}
          {checkpoint ? (
            <span className="recipe-meta-item">
              <strong>점검 포인트</strong> · {checkpoint}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LowConfidenceCTA({ confidence, studentData }) {
  if (!confidence) return null;
  const score = confidence.confidence_score ?? 1;
  if (score >= 0.6) return null;

  const missing = [];
  if (!studentData?.primary_goal) missing.push({ key: 'goal', label: '목표대학 미설정' });
  if (!studentData?.weekly_available_hours) missing.push({ key: 'hours', label: '주간 가용시간 미입력' });

  return (
    <div className="info-box warn">
      <strong>진단 정확도를 높이려면</strong>
      <p style={{ margin: '0.4rem 0 0.5rem' }}>
        신뢰도 {Math.round(score * 100)}% — 아래 항목을 채우면 더 정확한 진단을 받을 수 있어.
      </p>
      {missing.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.2rem' }}>
          {missing.map((item) => (
            <li key={item.key} style={{ fontSize: '0.88rem' }}>{item.label}</li>
          ))}
        </ul>
      ) : null}
      <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to="/student" className="secondary-button compact">
          홈에서 보완 항목 확인 →
        </Link>
      </div>
    </div>
  );
}

const TABS = ['취약유형', '과목·단원', '진단 근거', '학습 레시피'];

export default function StudentDiagnosisPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('취약유형');

  const { data, loading, error } = useAsyncData(
    () => apiRequest('/frontend/student/diagnosis', { token }),
    [token]
  );

  const weaknessType = data?.primary_weakness?.type;

  return (
    <Layout title="진단">
      {loading ? <div className="empty-state">진단 데이터를 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 저신뢰 CTA */}
          <LowConfidenceCTA confidence={data.confidence} studentData={data.student} />

          {/* 탭 네비게이션 */}
          <div className="workspace-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`workspace-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 탭 1: 취약유형 */}
          {activeTab === '취약유형' ? (
            <>
              <SectionCard
                title="내 취약 유형"
                subtitle="점수 하나가 아니라 최근 시험 흐름, 단원 이해도, 학습 안정성을 함께 본 결과야."
              >
                <div className="highlight-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <p className="section-micro-label">현재 우선 진단</p>
                      <h3>{data.primary_weakness?.label || weaknessLabel(weaknessType)}</h3>
                    </div>
                    {data.confidence?.confidence_level ? (
                      <StatusBadge
                        status={data.confidence.confidence_score >= 0.7 ? 'approved' : 'pending_review'}
                        label={`신뢰도 ${data.confidence.confidence_level}${data.confidence.confidence_score != null ? ` (${formatNumber(data.confidence.confidence_score * 100, 0)}%)` : ''}`}
                      />
                    ) : null}
                  </div>
                  <p className="muted">{data.coaching_summary || weaknessCoaching(weaknessType)}</p>
                </div>
              </SectionCard>

              {/* 최근 시험 흐름 */}
              <SectionCard title="최근 시험 흐름" subtitle="최근 결과가 어떤 방향으로 움직였는지 확인해.">
                {(data.recent_trend || []).length > 0 ? (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>시험</th>
                          <th>과목</th>
                          <th>점수</th>
                          <th>일자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.recent_trend || []).map((row, index) => (
                          <tr key={`${row.exam_name}-${index}`}>
                            <td>{row.exam_name}</td>
                            <td>{row.subject_name}</td>
                            <td><strong>{formatNumber(row.score)}점</strong></td>
                            <td className="muted small">{row.exam_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">아직 시험 결과가 없어. 강사에게 시험 결과 입력을 요청해봐.</p>
                )}
              </SectionCard>
            </>
          ) : null}

          {/* 탭 2: 과목·단원 */}
          {activeTab === '과목·단원' ? (
            <div className="split-grid">
              <SectionCard title="먼저 볼 과목" subtitle="목표대학 gap과 안정성을 함께 반영한 우선순위야.">
                {(data.weak_subjects || []).length > 0 ? (
                  <div className="simple-list">
                    {(data.weak_subjects || []).map((subject) => (
                      <div key={subject.subject_code || subject.subject_name} className="list-row">
                        <div>
                          <strong>{subject.subject_name}</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {subject.gap_score != null ? (
                            <span className="muted small">목표까지 {formatNumber(subject.gap_score)}점</span>
                          ) : null}
                          {subject.stability != null ? (
                            <span className="muted small" style={{ marginLeft: '0.5rem' }}>
                              안정도 {formatNumber(subject.stability)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">데이터가 아직 없어.</p>
                )}
              </SectionCard>

              <SectionCard title="먼저 보완할 단원" subtitle="이해도와 근거 신뢰도를 같이 확인해.">
                {(data.weak_units || []).length > 0 ? (
                  <div className="simple-list">
                    {(data.weak_units || []).slice(0, 8).map((unit) => (
                      <div key={`${unit.subject_name}-${unit.unit_name}`} className="list-row">
                        <div>
                          <strong>{unit.subject_name} · {unit.unit_name}</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {unit.effective_mastery != null ? (
                            <span className="muted small">이해도 {formatNumber(unit.effective_mastery)}점</span>
                          ) : null}
                          {unit.unit_confidence != null ? (
                            <span className="muted small" style={{ marginLeft: '0.5rem' }}>
                              신뢰도 {formatNumber(unit.unit_confidence)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">단원 데이터가 아직 없어.</p>
                )}
              </SectionCard>
            </div>
          ) : null}

          {/* 탭 3: 진단 근거 */}
          {activeTab === '진단 근거' ? (
            <SectionCard
              title="진단 근거"
              subtitle="AI가 임의로 만든 말이 아니라 계산된 신호를 바탕으로 보여줘."
            >
              {(data.evidence || []).length > 0 ? (
                <div className="evidence-grid">
                  {(data.evidence || []).map((item, index) => (
                    <div key={`${item.signal}-${index}`} className="evidence-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <strong>{weaknessLabel(item.type)}</strong>
                        {item.signal ? (
                          <span className="status-badge">{item.signal}</span>
                        ) : null}
                      </div>
                      <p className="muted small" style={{ margin: 0 }}>{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  근거 데이터가 아직 없어. 시험 결과가 더 쌓이면 정밀한 진단 근거를 보여줄게.
                </p>
              )}
            </SectionCard>
          ) : null}

          {/* 탭 4: 학습 레시피 */}
          {activeTab === '학습 레시피' ? (
            <SectionCard
              title="취약 유형별 학습 레시피"
              subtitle="진단 결과를 바로 공부 행동으로 바꿔줘."
            >
              <div className="recipe-grid">
                {/* 현재 주 취약 유형 레시피 */}
                {weaknessType ? (
                  <RecipeCard
                    recipe={(data.study_recipes || []).find((r) => r.weakness_type === weaknessType)}
                    weaknessType={weaknessType}
                  />
                ) : null}

                {/* 백엔드가 내려준 추가 레시피들 */}
                {(data.study_recipes || [])
                  .filter((r) => r.weakness_type !== weaknessType)
                  .map((recipe) => (
                    <RecipeCard
                      key={recipe.weakness_type}
                      recipe={recipe}
                      weaknessType={recipe.weakness_type}
                    />
                  ))}

                {/* 백엔드 레시피가 없으면 취약 과목 기반으로 다음 우선순위 레시피 표시 */}
                {(data.study_recipes || []).length === 0 && !weaknessType ? (
                  <p className="muted">진단이 완료되면 맞춤 학습 레시피를 보여줄게.</p>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
