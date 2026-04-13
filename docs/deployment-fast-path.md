# 빠른 배포 루트

목표는 해커톤 데모용 공개 링크를 가장 빨리 만드는 것이다. 권장 조합은 다음과 같다.

- Backend: Render Web Service
- Database: Render PostgreSQL
- Frontend: Vercel

이 방식은 Docker 없이 GitHub 연동만으로 배포할 수 있고, 현재 레포 구조(`apps/api`, `apps/frontend`)를 유지한다.

## 1. 사전 준비

GitHub `main` 브랜치에 최신 코드가 push되어 있어야 한다.

```powershell
git status --short
git push origin main
```

## 2. Backend 배포: Render

Render에서 `New +` -> `Blueprint`를 선택하고 이 레포를 연결한다.

루트의 `render.yaml`이 아래 리소스를 만든다.

- `unitflow-api`: FastAPI web service
- `unitflow-db`: PostgreSQL database

배포 후 Render 서비스의 Environment에서 반드시 확인한다.

```env
APP_ENV=production
AUTO_CREATE_SCHEMA=false
DATABASE_URL=<Render database connection string>
JWT_SECRET=<자동 생성 또는 직접 입력>
CORS_ORIGINS=https://<vercel-frontend-domain>
CORS_ORIGIN_REGEX=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_STRATEGY_EXPLANATION_ENABLED=true
```

`CORS_ORIGINS`는 프런트 배포 주소가 나온 뒤 다시 넣는다. 예시는 다음과 같다.

```env
CORS_ORIGINS=https://unitflow-ai.vercel.app
```

Render 배포 명령은 `render.yaml`에 들어 있다.

```bash
pip install -r requirements.txt
python manage_db.py upgrade
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

정상 확인:

```text
https://<render-api-domain>/health
```

정상 응답 예:

```json
{"status":"ok","environment":"production","database":"ok"}
```

## 3. Seed 데이터 주입

해커톤 데모용 계정이 필요하면 Render Shell에서 한 번만 실행한다.

```bash
python manage_db.py seed
```

데모 계정:

```text
admin@unitflow.ai / password123
instructor@unitflow.ai / password123
student@unitflow.ai / password123
```

운영에 가까운 데모에서는 seed 계정 비밀번호를 바꾸거나 별도 계정을 발급한다.

## 4. Frontend 배포: Vercel

Vercel에서 `New Project`로 같은 GitHub 레포를 import한다.

Project Settings:

```text
Framework Preset: Vite
Root Directory: apps/frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

Environment Variables:

```env
VITE_API_BASE_URL=https://<render-api-domain>
```

예:

```env
VITE_API_BASE_URL=https://unitflow-api.onrender.com
```

프런트를 배포한 뒤 나온 Vercel 도메인을 다시 Render의 `CORS_ORIGINS`에 입력하고 백엔드를 재배포한다.

## 5. 배포 후 스모크 테스트

1. `https://<render-api-domain>/health` 접속
2. `https://<vercel-domain>` 접속
3. 학생 계정 로그인
4. 학생 홈 진입
5. 전략 설계실 진입
6. 공유 시험 목록 진입
7. 주간 플래너 생성 또는 재생성
8. What-if 시뮬레이션 실행

브라우저 콘솔에서 CORS 오류가 보이면 Render의 `CORS_ORIGINS` 값이 Vercel 도메인과 정확히 같은지 확인한다. 마지막 `/`는 붙이지 않는다.

## 6. 가장 흔한 실패 원인

- `VITE_API_BASE_URL`이 비어 있음: Vercel 프런트가 자기 도메인으로 API를 호출하게 된다.
- `CORS_ORIGINS`에 Vercel 도메인을 넣지 않음: 로그인 또는 학생 홈에서 Failed to fetch가 난다.
- 마이그레이션 누락: `/health`는 되지만 화면 API에서 테이블 없음 오류가 난다.
- Render 무료 플랜 슬립: 첫 요청이 느릴 수 있다. 해커톤 발표 직전 `/health`를 한 번 열어 깨워둔다.
- `OPENAI_API_KEY` 없음: LLM 문구는 deterministic fallback으로 동작한다. 서비스 자체는 정상이다.

## 7. 발표 직전 체크

- Render API가 깨어 있는지 확인
- Vercel 최신 deployment가 production인지 확인
- 학생/강사/admin 데모 계정 로그인 확인
- 학생 홈, 전략 설계실, 공유 시험, 플래너, 시뮬레이터 화면 확인
- OpenAI를 보여줄 계획이면 `OPENAI_API_KEY` 설정 후 전략 설명 source가 `llm`인지 확인
