# 마이그레이션 실행 순서

## 목적

기존 DB는 보존하고, 새 DB는 `alembic upgrade head`만으로 바로 생성되게 한다.

이번 체계는 full snapshot baseline 방식을 사용한다. `0000_baseline_current_schema`가 기존 핵심 테이블 전체를 만들고, 이후 revision은 학생 중심 P0 기능을 additive 방식으로 확장한다.

## 핵심 원칙

- 무거운 계산과 백필은 Alembic 안에서 실행하지 않는다.
- SQLite 호환을 위해 기존 테이블 변경은 가능한 한 `batch_alter_table()`로 처리한다.
- 컬럼은 `nullable 추가 -> 백필 -> non-null 강화` 순서로 조인다.
- 기존 모델명은 유지하고 PRD 엔티티명은 문서와 서비스 레이어에서 매핑한다.

## 새 로컬 DB

새 DB는 baseline부터 끝까지 올리면 된다.

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\..\.env.example .env
python manage_db.py upgrade
python manage_db.py seed
```

## 기존 DB

이미 기존 테이블이 있는 DB는 baseline을 생성하지 않고 현재 상태로 표시한 뒤, 후속 revision만 적용한다.

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage_db.py stamp --revision 0000_baseline_current_schema
python manage_db.py upgrade
```

## Revision 순서

| revision | 역할 |
| --- | --- |
| `0000_baseline_current_schema` | 기존 핵심 스키마 전체 생성 |
| `0001_expand_profiles_and_habits` | 학생 프로필, 학습 습관 입력 확장 |
| `0002_create_direction_and_goal_readiness_snapshots` | 수시/정시 방향성과 목표대학 gap snapshot |
| `0003_extend_diagnosis_and_create_signals_and_recipes` | 진단 근거 signal, 공부 레시피 템플릿 |
| `0004_strategy_workspace` | 학생 전략 작업공간, 강사 리뷰 확장 |
| `0005_strategy_schema_v2` | 전략 payload schema v2 컬럼 |
| `0006_weekly_planner` | 주간 계획, 실행 항목, 회고 |
| `0007_indexes_recalc` | 성장 조회용 인덱스 |
| `0008_harden_after_backfill` | 백필 이후 schema version 필수화, current workspace 유일성 |

## Migration 밖에서 실행할 백필

아래 작업은 데이터 계산이 포함되므로 Alembic에 넣지 않는다.

```powershell
python manage_db.py seed_study_recipes
python manage_db.py backfill_direction_snapshots
python manage_db.py backfill_goal_readiness
python manage_db.py backfill_diagnosis_signals
python manage_db.py normalize_strategy_schema
python manage_db.py recompute_strategies --all
python manage_db.py generate_weekly_plans --week-start 2026-04-13
```

현재 MVP에서는 일부 백필 커맨드가 아직 구현 전일 수 있다. 이 경우 migration 적용은 가능하고, 서비스 구현이 붙는 순서대로 커맨드를 채운다.

## 검증 명령

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m alembic -c alembic.ini heads
.\.venv\Scripts\python.exe -m alembic -c alembic.ini history
.\.venv\Scripts\python.exe -m pytest tests
```
