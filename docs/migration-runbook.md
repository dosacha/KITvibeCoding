# 마이그레이션 실행 순서

## 목적

기존 DB를 버리지 않고 학생 중심 P0 데이터모델을 적용하는 절차다. 기존 운영 DB가 있다면 먼저 백업한 뒤 진행한다.

## 새 로컬 DB

새로 클론한 로컬 환경은 기존 README 흐름대로 시드하면 된다.

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\..\.env.example .env
python manage_db.py seed
```

## 기존 DB에 migration 체계 붙이기

이미 테이블이 있는 DB는 baseline을 먼저 찍고 이후 revision을 올린다.

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage_db.py stamp --revision 0000_baseline
python manage_db.py upgrade
```

## revision 순서

| revision | 역할 |
| --- | --- |
| 0000_baseline | 기존 DB 구조 기준점 |
| 0001_profile_expand | 학생 프로필, 학습 습관 확장 |
| 0002_goal_snapshots | 수시·정시 방향성, 목표 gap snapshot |
| 0003_diagnosis_recipe | 진단 signal, 공부 레시피 템플릿 |
| 0004_strategy_workspace | 학생 전략 작업공간, 리뷰 확장 |
| 0005_strategy_schema_v2 | 전략 payload schema version |
| 0006_weekly_planner | 주간 계획, 항목, 회고 |
| 0007_indexes_recalc | 성장 조회용 인덱스와 재계산 기반 |

## 검증 명령

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m alembic -c alembic.ini heads
.\.venv\Scripts\python.exe -m alembic -c alembic.ini history
.\.venv\Scripts\python.exe -m pytest tests
```

## 주의

무거운 계산과 백필은 Alembic 안에 넣지 않는다. 방향성 snapshot, 목표 gap snapshot, 진단 signal, 전략 schema 정규화는 별도 recompute command로 분리한다.
