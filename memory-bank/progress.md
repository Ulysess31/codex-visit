# 진행 상황

## 현재 상태

- 브라우저 탭 제목을 `클라우드성공 방명록`으로 변경하고 프로덕션 빌드, main push 및 GitHub Pages 배포를 완료했다.
- 화면, 클라이언트, 원격 Supabase 설정 및 GitHub Pages 배포 완료. 기존 방명록 데이터를 보존했다.
- 저장소를 `Ulysess31/codex-visit`에 연결했다. Clone 당시 저장소는 비어 있었다.
- Supabase `public.guestbook`에 확인된 항목이 하나 있다(`id = 1`). 이후 스키마 변경이나 기능 구현 시 이 데이터를 보존한다.
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
3. 이 저장소의 `supabase/migrations/20261010000000_guestbook_realtime_app.sql` 내용을 SQL Editor에 붙여 넣고 실행한다. 이 SQL은 `media_path`·`media_kind` 컬럼, 댓글 테이블과 인덱스, RLS 정책, `guestbook-media` 버킷 및 Realtime 등록을 추가한다. 기존 방명록 행은 수정하거나 삭제하지 않는다.
4. SQL Editor에서 `public.guestbook`과 `public.guestbook_comments`의 정책, 버킷의 공개 여부·5MB 제한·이미지 MIME 형식, Realtime 게시에 두 테이블이 포함됐는지 확인한다. SQL Editor에서 `select id, author, content, media_path, media_kind from public.guestbook order by id;`를 실행해 기존 방명록도 확인한다.
5. 로컬 프로젝트에서 `.env.example`을 `.env.local`로 복사하고 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`에 프로젝트 값을 입력한다. 실제 키가 든 `.env.local`은 저장소에 커밋하지 않는다.
6. 프로젝트 폴더에서 `npm install` 후 `npm run build`로 빌드를 확인하고, `npm run dev`로 앱을 실행한다.
7. 앱에서 글만 등록, 사진 업로드, 그림 그리기, 포스트잇 상세 보기, 댓글 등록을 각각 확인한다. 별도 브라우저 세션에서 새 글과 댓글이 새로고침 없이 표시되는지도 확인한다.

공개 보드이므로 3단계는 기존 글·댓글·이미지의 공개 조회와 비로그인 글·댓글·이미지 등록을 허용한다. 이 권한 구성을 승인받은 뒤에만 실행한다.

## 다음 작업

1. 브라우저에서 공개 사이트의 방명록, 사진, 댓글 및 실시간 업데이트 흐름을 확인한다.
2. 공개 쓰기 운영을 위한 스팸 방지 방식을 결정한다.
