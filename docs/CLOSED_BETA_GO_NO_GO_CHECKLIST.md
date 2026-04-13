# UnitFlow AI Closed Beta Go / No-Go Checklist

이 문서는 UnitFlow AI를 초청 사용자 기반 폐쇄형 베타로 열 수 있는지 판단하기 위한 체크리스트다. 장기 로드맵이 아니라 폐쇄형 베타 범위만 판단한다.

## Decision Rule

- **GO**: 모든 must-pass 항목 충족, critical bug 0개, 학생 핵심 루프 placeholder 0개, PostgreSQL + Alembic + seed + build + tests 통과
- **NO-GO**: must-pass 항목 하나라도 실패, 학생 핵심 route runtime error, 학생 전략 루프 placeholder 잔존, 접근 제어 누수

## A. Scope Lock

폐쇄형 베타 blocking 범위:

- exam / question / student result input
- unit mastery / weakness diagnosis
- target-university-aware strategy generation
- instructor review / approval / revision flow
- audit / change history / recalculation jobs
- student home
- diagnosis detail
- strategy workspace
- weekly planner
- growth report
- what-if simulator

폐쇄형 베타 non-blocking 범위:

- OCR-assisted input
- parent portal
- real-time competition rate tracking
- public community
- content recommendation
- full V1.1 / V2 roadmap

## B. Student Core Loop

### B1. Student Home

- [ ] shows today's key tasks using real data
- [ ] shows admission direction card
- [ ] shows goal gap summary
- [ ] shows weekly strategy summary
- [ ] shows low-confidence remediation CTA when needed
- [ ] contains no placeholder copy or TODO text

### B2. Diagnosis Detail

- [ ] shows weakness type cards
- [ ] shows weak subjects and weak units
- [ ] shows explainable evidence/signals
- [ ] shows study recipes
- [ ] explains why confidence is low when applicable
- [ ] provides direct remediation actions for missing data

### B3. Strategy Workspace

- [ ] shows AI basic strategy
- [ ] shows AI conservative strategy
- [ ] shows current approved strategy
- [ ] allows student workspace draft save
- [ ] shows diff between AI base and student edits
- [ ] shows review / approval timeline
- [ ] clearly distinguishes draft vs approved strategy

### B4. Weekly Planner

- [ ] generates weekly plan
- [ ] renders checklist by day/subject
- [ ] saves completion state
- [ ] saves time spent
- [ ] supports rollover for incomplete items
- [ ] saves weekly reflection

### B5. Growth Report

- [ ] renders score trends
- [ ] renders goal gap reduction trend
- [ ] renders weakness change over time
- [ ] renders stability change over time
- [ ] renders execution trend over time

### B6. What-If Simulator

- [ ] accepts score delta inputs
- [ ] accepts weekly study-time change
- [ ] accepts target-goal change
- [ ] returns changed priorities / strategy summary
- [ ] clearly shows what would matter most if assumptions change

Immediate NO-GO:

- [ ] diagnosis, strategy workspace, weekly planner, growth report, or what-if simulator is still placeholder/empty-state only
- [ ] any student core page throws a runtime error
- [ ] students can see an unapproved draft as the official strategy

## C. Instructor Loop

- [ ] create/update exams
- [ ] create/update questions
- [ ] edit multi-unit weights
- [ ] enter student results
- [ ] upload CSV results
- [ ] recomputation runs after result changes
- [ ] compare AI basic / conservative / student draft / approved strategy
- [ ] approve strategy
- [ ] hold strategy
- [ ] request revision
- [ ] write student-facing coaching message
- [ ] keep internal note separate from student-facing message

Immediate NO-GO:

- [ ] instructor cannot review student draft strategy
- [ ] approval / hold / revision path is missing
- [ ] CSV upload works but recomputation does not

## D. Admin / Governance

- [ ] university policy CRUD works
- [ ] policy change triggers impact-aware recalculation path
- [ ] audit log list works
- [ ] change history list works
- [ ] recalculation jobs list works
- [ ] role separation works
- [ ] student sees own data only
- [ ] instructor sees assigned students only
- [ ] admin has academy-wide governance scope

Immediate NO-GO:

- [ ] any cross-student data leak exists
- [ ] instructor has unrestricted admin-only access
- [ ] changes happen without audit trail

## E. AI / Analysis Trustworthiness

- [ ] weakness diagnosis is stored as structured data
- [ ] target-university readiness uses actual policy data
- [ ] strategies include subject priorities
- [ ] strategies include weekly time allocation
- [ ] strategies include unit study order
- [ ] strategies include recommended study methods
- [ ] strategies include next check-in schedule
- [ ] strategies include risk factors
- [ ] strategy explanation is tied to evidence/signals
- [ ] low-confidence state triggers collect-more-data-first path
- [ ] student language remains coaching-oriented
- [ ] natural-language output does not overstate certainty or promise outcomes

Immediate NO-GO:

- [ ] recommendations appear without rationale/evidence
- [ ] policy-blind hardcoded recommendations remain
- [ ] low-confidence users still receive overly certain strategy language

## F. Deployment / Operations Hardening

- [ ] PostgreSQL is supported and tested
- [ ] Alembic `upgrade head` passes
- [ ] seed/demo data loads successfully
- [ ] `.env.example` is current
- [ ] `README.md` is current
- [ ] health check endpoint exists
- [ ] structured logging exists
- [ ] beta operations guide exists
- [ ] backend tests pass
- [ ] frontend production build passes

Validation commands:

### Backend

```bash
cd apps/api
alembic upgrade head
python manage_db.py seed
pytest -q
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd apps/frontend
npm install
npm run build
npm run dev
```

Immediate NO-GO:

- [ ] PostgreSQL-only issues remain unresolved
- [ ] migrations cannot reproduce schema from scratch
- [ ] seed/demo data is missing or broken
- [ ] README setup steps are outdated
- [ ] tests or build fail

## G. Role-Based Smoke Tests

### Student Smoke Test

- [ ] login works
- [ ] home loads
- [ ] diagnosis loads
- [ ] strategy workspace loads
- [ ] weekly planner loads
- [ ] growth report loads
- [ ] simulator loads
- [ ] draft save works
- [ ] review request works
- [ ] reflection save works

### Instructor Smoke Test

- [ ] login works
- [ ] dashboard loads
- [ ] exam create works
- [ ] question create works
- [ ] result entry works
- [ ] CSV upload works
- [ ] strategy compare works
- [ ] approve / hold / revision works

### Admin Smoke Test

- [ ] login works
- [ ] policy list works
- [ ] policy create/update works
- [ ] audit log works
- [ ] recalculation job list works

Immediate NO-GO:

- [ ] any critical route fails during smoke test
- [ ] any route is still visibly placeholder content

## H. Final Go / No-Go Sign-Off

GO only if every box below is true:

- [ ] no placeholder pages remain in student core loop
- [ ] no runtime errors remain in student core loop
- [ ] student loop is fully operable end-to-end
- [ ] instructor loop is fully operable end-to-end
- [ ] admin governance loop is operable
- [ ] PostgreSQL + Alembic + seed + tests + build all pass
- [ ] demo accounts and sample data are ready
- [ ] critical bugs are zero
- [ ] access-control leakage is zero
- [ ] strategy explanations are evidence-backed

Default decision: if even one item is false, release decision is **NO-GO**.
