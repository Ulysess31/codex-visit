# 진행 상황

## 현재 상태

- 화면 상단의 표시 제목을 `클라우드성공 방명록`으로 수정했다. 브랜드 마크와 README 제목도 맞췄으며, 프로덕션 빌드 및 산출물의 화면·탭 제목 검증과 GitHub Pages 재배포를 완료했다.
- 브라우저 탭 제목을 `클라우드성공 방명록`으로 변경하고 프로덕션 빌드, main push 및 GitHub Pages 배포를 완료했다.
- 화면, 클라이언트, 원격 Supabase 설정 및 GitHub Pages 배포 완료. 기존 방명록 데이터를 보존했다.
- 회원 인증 UI와 원격 Supabase 프로필·소유권 migration도 적용했다. 기존 guestbook 3건, 댓글 6건, 이미지 2개는 보존됐다. 이 인증 기능을 포함한 GitHub Pages 재배포와 Auth 리디렉션 설정 확인은 아직 남아 있다.
- 저장소를 `Ulysess31/codex-visit`에 연결했다. Clone 당시 저장소는 비어 있었다.
- Auth migration 전 Supabase `public.guestbook`에는 3개 행(기존 `id = 1` 포함)이 있었고, migration 후에도 기존 행을 모두 보존했다.
- 공개 읽기와 비로그인 쓰기 정책을 사용자 승인 후 Supabase에 적용했다.

## 주요 단계

- [x] 제품 개요와 사용자 흐름 정리
- [x] 프로젝트 지침 및 memory-bank 문서 생성
- [x] 저장소를 확인하고 앱 프레임워크 결정 (Vite + React + TypeScript)
- [x] Supabase의 기존 스키마, RLS, Storage 버킷 및 Realtime 게시 테이블 확인
- [x] 사진 업로드와 그림판을 포함한 방명록 작성 화면 구현
- [x] 포스트잇 보드 및 실시간 구독 구현
- [x] 방명록 상세 화면과 실시간 댓글 화면 구현
- [x] 반응형 화면과 접근성 기본 동작 구현
- [x] 검토된 Supabase 스키마와 공개 접근 정책을 원격 프로젝트에 적용
- [x] 원격 정책, Storage, Realtime, 기존 데이터 유지 확인
- [x] GitHub Pages용 Vite base 경로와 자동 배포 워크플로 준비
- [x] GitHub 저장소 Pages 소스 및 Supabase Actions 변수 설정
- [x] GitHub Pages 배포 완료 및 공개 URL 확인

## 작업 기록

### 2026-10-10 — 회원 인증·인가 기능 및 Supabase migration 적용

- `auth-plan.md`와 실제 Supabase 테이블·RLS·Storage 상태를 확인했다. 기존 guestbook 데이터는 3건이며 `guestbook_comments`와 공개 버킷을 확인했다.
- 이메일 가입/인증 메일 재전송, 로그인, 로그아웃, 세션 복원, 비밀번호 재설정/변경, 프로필 이름·아바타 편집 UI를 추가했다.
- 회원 글·댓글 UID 연결, 본인 글·댓글 수정/삭제 UI, UID 기반 이미지 경로 정책을 포함한 `supabase/migrations/20261010085149_auth_profiles_and_ownership.sql`을 작성했다. `SUPABASE_SERVICE_ROLE_KEY`는 코드에서 사용하지 않는다.
- 기존 공개 읽기 및 비회원 작성은 유지하고, 기존 행은 `user_id = NULL`로 보존하도록 설계했다.
- 사용자가 기존 데이터 삭제 및 테이블 변경을 허용한 뒤, 데이터를 지우지 않는 추가형 migration을 현재 Supabase 프로젝트에 직접 적용했다. 적용 기록은 `20261010085149 / auth_profiles_and_ownership`이다.
- 적용 후 기존 guestbook 3건, 댓글 6건, Storage 오브젝트 2개가 유지됨을 확인했다. `profiles`, 회원 UID 컬럼, 가입 트리거, RLS/Storage 정책이 생성되었고 Security Advisor는 발견 항목이 없었다. Performance Advisor의 새 UID 인덱스 2개 미사용 알림은 아직 사용 전이라 발생한 정보성 알림이다.
- `npm run build`가 TypeScript 검사와 Vite 프로덕션 빌드를 통과했다. 로컬 개발 서버를 `http://localhost:5174/`에서 실행 중이다. 기본 포트 5173은 이미 사용 중이었다.
- GitHub Pages 배포는 하지 않았다. Supabase Auth URL/이메일 설정과 실제 가입·로그인 확인은 운영 URL 설정과 사용자 계정이 필요하므로 남은 확인 사항이다.

### 2026-10-10 — 인증·인가 구현 및 마이그레이션 계획

- 현재 앱의 Supabase 스키마, 공개 RLS 정책, 이미지 Storage 경로, Realtime 구성을 확인했다.
- 기존 공개/비회원 방명록을 기본으로 보존하면서 회원 소유권을 추가하는 단계별 계획을 `memory-bank/auth-plan.md`에 기록했다.
- 이 작업에서는 인증 코드나 원격 Supabase 스키마를 변경하지 않았다. 비회원 작성, 이메일 확인, 공개 프로필/아바타 범위는 구현 전에 확정할 항목이다.

### 2026-10-10 — 화면 상단 제목 수정 및 재배포

- 이전 작업은 HTML 탭 제목만 바꿔 공통 헤더의 `모여서 쓰는 방명록`이 남아 있었다. 헤더를 `클라우드성공 방명록`, 브랜드 마크를 `클`로 수정하고 README 제목을 일치시켰다.
- `npm run build`와 `git diff --check`가 통과했다. 빌드된 JavaScript에 새 표시 제목이 존재하고 이전 제목은 없는지, HTML 탭 제목도 같은지 확인했다.
- 커밋 `83bac6f`를 main에 push하고 GitHub Pages 실행 `38036726165`의 성공을 확인했다.

### 2026-10-10 — 클라우드성공 방명록 제목 배포

- `index.html`의 브라우저 탭 제목을 `클라우드성공 방명록`으로 변경했다.
- `npm run build`, `git diff --check` 및 빌드 산출물의 제목 확인을 완료했다.
- 변경 커밋 `17be9ba`를 main에 push했다. GitHub Pages Actions 실행 `38036528091`의 build/deploy 성공을 확인했다.
- 공개 주소는 `https://ulysess31.github.io/codex-visit/`이다. 현재 클라우드 환경의 공개 URL 요청은 HTTP 403으로 제한되어 실제 응답 내용은 확인하지 못했다.

### 2026-10-10

- 브라우저 탭 제목을 `클라우드 방명록`으로 변경하고 프로덕션 빌드를 확인했다.

### 2026-10-10

- 프로젝트 참여자가 memory-bank Markdown 문서를 읽고 따르도록 루트 `AGENTS.md`를 추가했다.
- 아키텍처, 진행 상황, 구현 기록 문서의 초안을 추가했다.
- 문서 설명을 한국어로 작성하도록 정리했다.
- Vite + React + TypeScript 기반 앱, 사진 업로드, 그림판, 포스트잇 보드, 상세 댓글 및 Supabase Realtime 연결 코드를 구현했다.
- 원격 Supabase 정책과 테이블이 없는 것을 확인하고, 비파괴 마이그레이션 파일을 준비했다. 자동 안전성 검토가 원격 적용을 거절해 적용하지 않았다.
- `npm install` 및 프로덕션 빌드를 완료했다.
- 공개 읽기와 비로그인 글·댓글·이미지 등록 정책에 대한 사용자 승인을 받고 Supabase 마이그레이션을 적용했다.
- 새 댓글 테이블, 미디어 컬럼, `guestbook-media` Storage 버킷과 RLS 정책, Realtime 게시 테이블 등록을 확인했다.
- 기존 방명록 `id = 1`의 내용과 레코드가 그대로 보존된 것을 확인했다.
- Supabase 보안 Advisor에는 발견 사항이 없었다. 성능 Advisor의 미사용 인덱스 알림은 빈 댓글 테이블에 방금 추가한 조회용 인덱스를 가리킨다.
- GitHub Actions에서 초기 설정 누락으로 실패한 실행 뒤 재실행이 성공한 것을 확인했다. 성공 실행은 `38032957641`이며 커밋은 `e10ea96`이다.
- `https://ulysess31.github.io/codex-visit/`가 HTTP 200으로 응답하고 배포된 페이지를 제공하는 것을 확인했다.

## 수작업으로 적용할 때의 절차

이번 원격 변경은 Supabase MCP의 마이그레이션 도구로 적용했다. 같은 작업을 Supabase 대시보드와 로컬 프로젝트에서 직접 처리하려면 아래 순서로 진행한다.

1. Supabase 대시보드에서 해당 프로젝트를 열고 **SQL Editor**로 이동한다.
2. 변경 전 `public.guestbook`의 컬럼과 데이터를 확인한다. 특히 기존 `id = 1` 방명록을 확인하고 보존한다. `Authentication > Policies`, `Storage > Buckets`, Realtime 게시 설정도 먼저 확인한다.
3. 초기 설정 때 적용한 `supabase/migrations/20261010062619_guestbook_realtime_app.sql`과 Auth 확장 `supabase/migrations/20261010085149_auth_profiles_and_ownership.sql`의 적용 상태를 확인한다. 현재 두 migration 모두 Supabase MCP로 적용되어 있다.
4. SQL Editor에서 `public.guestbook`과 `public.guestbook_comments`의 정책, 버킷의 공개 여부·5MB 제한·이미지 MIME 형식, Realtime 게시에 두 테이블이 포함됐는지 확인한다. SQL Editor에서 `select id, author, content, media_path, media_kind from public.guestbook order by id;`를 실행해 기존 방명록도 확인한다.
5. 로컬 프로젝트에서 `.env.example`을 `.env.local`로 복사하고 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`에 프로젝트 값을 입력한다. 실제 키가 든 `.env.local`은 저장소에 커밋하지 않는다.
6. 프로젝트 폴더에서 `npm install` 후 `npm run build`로 빌드를 확인하고, `npm run dev`로 앱을 실행한다.
7. 앱에서 글만 등록, 사진 업로드, 그림 그리기, 포스트잇 상세 보기, 댓글 등록을 각각 확인한다. 별도 브라우저 세션에서 새 글과 댓글이 새로고침 없이 표시되는지도 확인한다.

초기 공개 보드 migration은 기존 글·댓글·이미지의 공개 조회와 비로그인 등록을 허용한다. Auth migration은 이 흐름을 유지하면서 회원 소유권 정책을 추가한다.

## 다음 작업

1. Supabase Auth URL Configuration에 운영 `https://ulysess31.github.io/codex-visit/` 및 로컬 `http://localhost:5174/` 리디렉션 주소가 허용됐는지 확인한다. 이메일 확인/재설정 메일 설정도 확인한다.
2. 로컬 `http://localhost:5174/`에서 가입·메일 인증·로그인·로그아웃·프로필 수정 및 두 회원 사이의 글/댓글 소유권을 확인한다.
3. GitHub Pages 재배포와 공개 쓰기 스팸 방지 방식을 진행한다.
