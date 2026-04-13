# Closed Beta Validation Report

Generated on 2026-04-13.

## Current Decision

**Conditional GO candidate.**

Automated backend, frontend, Alembic, seed, and role-based smoke checks pass. Final GO still requires a real PostgreSQL instance to be available and one browser click-through session on the target machine.

## Completed Checks

### Backend

Command:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest -q
```

Result:

```text
38 passed
```

Notes:

- Pytest cache warnings appear because this Windows workspace denies cache directory writes.
- The warnings do not indicate test failures.

### Role-Based Smoke

Covered by:

```text
apps/api/tests/test_closed_beta_smoke.py
```

Verified:

- Student core routes load.
- Student strategy note save works.
- Student planner generation and reflection save work.
- Student what-if simulator returns changed priorities.
- Instructor dashboard, students, exams, result-entry, CSV template, and strategy review routes load.
- Admin policies, audit logs, change history, recalculation jobs, and metadata routes load.

### Frontend

Command:

```powershell
cd apps/frontend
npm.cmd run build
npm.cmd run test
```

Result:

```text
production build passed
3 test files passed
17 tests passed
```

Note:

- In the normal sandbox, Vite/esbuild can fail with `spawn EPERM`.
- The same commands pass when allowed to spawn the Vite/esbuild child process.

### Alembic / Seed Smoke

Commands:

```powershell
cd apps/api
$env:DATABASE_URL='sqlite:///./.tmp/checklist_alembic.sqlite3'
.\.venv\Scripts\python.exe manage_db.py upgrade

$env:DATABASE_URL='sqlite:///./.tmp/checklist_seed.sqlite3'
.\.venv\Scripts\python.exe manage_db.py seed
```

Result:

```text
alembic upgraded to head
seed completed
```

## Blocked Checks

### Real PostgreSQL Runtime

Attempted:

```powershell
docker compose up -d postgres
```

Result:

```text
unable to get image 'postgres:16-alpine'
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

Also checked local port:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432
```

Result:

```text
TcpTestSucceeded: False
```

Interpretation:

- Docker is installed, but Docker Desktop / Linux engine is not running.
- No local PostgreSQL service is currently listening on `127.0.0.1:5432`.
- PostgreSQL support is configured via `psycopg` and documented, but the real Postgres smoke remains blocked by local environment availability.

## Cleanup

Removed:

- `apps/api/uvicorn.err.log`
- `apps/api/uvicorn.out.log`

Not removed:

- `apps/api/pytest-cache-files-*` directories remain because Windows denied access.
- `apps/frontend/.claude/settings.local.json` was left in place because it is Claude-local configuration, not a runtime log artifact.

## Remaining Manual Checks

Run both servers:

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
python manage_db.py seed
python -m uvicorn app.main:app --reload
```

```powershell
cd apps/frontend
npm.cmd run dev
```

Then click through:

- Student: login, home, diagnosis, strategy workspace, note save, review request, planner generate/check/reflection, growth, simulator.
- Instructor: login, dashboard, exam/detail/result-entry, CSV template/upload, strategy review, approve/hold/revision.
- Admin: login, policy list/create/update, audit log, change history, recalculation jobs.

Final GO should only be signed after the PostgreSQL smoke and browser click-through pass.
