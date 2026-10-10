# 구현 기록

## 상태

클라이언트 애플리케이션과 Supabase 마이그레이션을 구현·적용했으며 프로덕션 빌드가 성공했다. 이 문서에는 확정된 기술 선택과 완료 기능을 기록하고, 검증하거나 채택하기 전의 제안은 미정 항목으로 구분한다.

## 기존 백엔드 확인 사항

- Supabase가 MCP를 통해 연결되어 있다.
- 확인된 `public.guestbook` 컬럼은 `id`(bigint identity 기본 키), `created_at`(timestamptz, 기본값 `now()`), `author`(nullable text), `content`(nullable text)이다.
- `public.guestbook`에는 Row Level Security가 활성화되어 있다.
- `id = 1` 항목이 있다. 내용은 `첫방문입니다.반가와요`로 변경되었다.
- 초기에는 `guestbook` RLS 정책, 공개 Storage 버킷, Realtime 게시 테이블이 없었다. 사용자 승인을 받은 후 아래 마이그레이션을 적용했다.
- `guestbook`에는 `media_path`, `media_kind` 컬럼이 추가됐다. 기존 레코드의 내용은 변경하지 않았다.
- `guestbook_comments` 테이블을 만들고 1~40자 작성자, 1~500자 댓글 본문, 기존 방명록 연결을 적용했다.
- 공개 Storage 버킷 `guestbook-media`는 최대 5MB, JPEG/PNG/WEBP/GIF를 허용한다.
- 방명록·댓글 공개 조회와 길이 검증을 포함한 비로그인 삽입 정책, 이미지 공개 조회 및 `entries/` 폴더 업로드 정책을 적용했다. UPDATE/DELETE 공개 정책은 만들지 않았다.
- `guestbook` 및 `guestbook_comments`를 Supabase Realtime 게시에 등록했다.
- 원격 조회로 `id = 1` 데이터 보존, 정책, 버킷, Realtime 등록을 확인했다.
- 로컬 `.env.local`은 Supabase 프로젝트 URL과 공개 가능한 Publishable Key를 사용하며 `.gitignore`에 의해 커밋되지 않는다.

## 확정된 구현 결정

- 데이터베이스, 파일 저장 및 실시간 업데이트에 Supabase를 사용한다.
- 사진·그림·댓글 기능을 추가할 때 기존 방명록 레코드를 보존한다.
- 데이터베이스 변경 전에 현재 스키마와 접근 정책을 확인한다.
- 프런트엔드는 Vite + React + TypeScript로 구성한다.
- 공개 보드에서 사용할 마이그레이션 SQL을 `supabase/migrations/20261010000000_guestbook_realtime_app.sql`에 준비했다. 적용 전에 공개 읽기·비로그인 쓰기 정책에 대한 운영자 검토가 필요하다.
- 운영자 승인 후 위 SQL을 Supabase 원격 프로젝트에 적용했다.
- 앱은 사진 업로드 5MB 제한(JPEG, PNG, WEBP, GIF), 그림판 PNG, 40자 작성자 이름, 500자 본문·댓글 제한을 적용한다.
- 새 방명록과 댓글의 Realtime 구독, 로딩/연결 오류 표시, 반응형 UI를 구현했다.

## 미정 결정 사항

- 공개 쓰기 운영을 위한 스팸 방지 방안
- GitHub Pages 게시 소스와 Actions 변수를 저장소 설정에서 활성화

## 구현 완료 기능

- 방명록 작성 화면과 포스트잇 보드
- 사진 업로드 및 그림판
- 방명록 상세 화면과 댓글 입력
- Supabase 조회·저장·Realtime 구독 코드
- 모바일 대응 스타일
- GitHub Pages 빌드 및 배포 워크플로

## 변경 기록

- 2026-10-10: 브라우저 탭 제목을 `클라우드성공 방명록`으로 변경했다. 프로덕션 빌드와 main push를 완료하고 GitHub Pages Actions 실행 `38036528091`의 배포 성공을 확인했다.
- 2026-10-10: 브라우저 탭 제목을 `클라우드 방명록`으로 변경했다.

- 2026-10-10: 제품 설명과 확인된 Supabase 상태를 바탕으로 최초 구현 기록을 작성했다.
- 2026-10-10: 문서 설명을 한국어로 정리했다.
- 2026-10-10: Vite + React + TypeScript 클라이언트와 Supabase 연동, 마이그레이션 초안을 구현했다.
- 2026-10-10: `npm install` 완료, `npm run build` 성공. 사용자 승인 후 원격 Supabase 마이그레이션 적용 및 스키마·RLS·Storage·Realtime 검증 완료.
- 2026-10-10: GitHub Pages Actions 변수를 저장소에 설정한 뒤 배포 성공을 확인했다. 공개 주소는 `https://ulysess31.github.io/codex-visit/`이며 HTTP 200으로 응답했다.
- 2026-10-10: GitHub Pages용 `/codex-visit/` base 경로 및 Actions 배포 워크플로 추가. 실제 배포를 위해 저장소 Pages 소스와 Supabase Actions 변수의 수동 설정이 남아 있다.
