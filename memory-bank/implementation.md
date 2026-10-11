# 구현 기록

## 상태

클라이언트 애플리케이션과 Supabase 마이그레이션을 구현·적용했으며 프로덕션 빌드가 성공했다. 이 문서에는 확정된 기술 선택과 완료 기능을 기록하고, 검증하거나 채택하기 전의 제안은 미정 항목으로 구분한다.

## 기존 백엔드 확인 사항

- Supabase가 MCP를 통해 연결되어 있다.
- 기본 방명록 확인 당시 `public.guestbook` 컬럼은 `id`(bigint identity 기본 키), `created_at`(timestamptz, 기본값 `now()`), `author`(nullable text), `content`(nullable text)였다. 이후 미디어 및 Auth 소유권 컬럼을 추가했다.
- `public.guestbook`에는 Row Level Security가 활성화되어 있다.
- Auth migration 적용 직전 방명록 3건, 댓글 6건, Storage 오브젝트 2개가 있었고, 적용 후에도 모두 유지됐다.
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
- 초기 마이그레이션은 `supabase/migrations/20261010062619_guestbook_realtime_app.sql`이며 원격에도 적용됐다.
- Auth/RLS 확장 migration은 `supabase/migrations/20261010085149_auth_profiles_and_ownership.sql`이며, 기존 데이터를 유지하면서 현재 Supabase 프로젝트에 적용했다.
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

## 회원 인증·인가 구현 상태

- Supabase Auth 이메일/비밀번호 가입·로그인·로그아웃, 세션 복원, 비밀번호 재설정, 프로필 표시 이름·아바타 편집 UI를 추가했다.
- 2026-10-11: 회원가입은 이메일 확인 없이 즉시 세션을 만들도록 클라이언트 흐름을 변경했다. Supabase 프로젝트의 Email provider에서 Confirm email을 꺼야 완전히 적용된다. 현재 연결된 MCP에는 Auth 프로젝트 설정을 갱신하는 기능이 없어 원격 토글은 아직 변경하지 못했다. 비밀번호 재설정 메일은 유지한다.
- 가입 시 `auth.users` 트리거가 `public.profiles`를 생성하도록 migration을 적용했다. 서비스 역할 키를 클라이언트에서 사용하지 않는다.
- guestbook/comment에 `auth.users.id` FK 기반 nullable `user_id`와 소유자 수정·삭제 RLS, Storage의 `members/<uid>` 및 `avatars/<uid>` 경로 정책을 migration에 정의했다.
- 기존 공개 읽기, 비회원 작성/`entries/` 업로드 및 기존 데이터는 보존하는 정책이다. 회원 글·댓글의 수정·삭제 UI는 사용자 소유 항목에만 표시한다.
- `supabase/migrations/20261010085149_auth_profiles_and_ownership.sql`을 현재 Supabase 프로젝트에 적용했다. 기존 guestbook 3건, 댓글 6건, Storage 파일 2개가 유지됨을 확인했다.
- Supabase Security Advisor에는 결과가 없었다. Performance Advisor는 새 UID 인덱스 2개가 아직 사용되지 않았다는 정보성 결과를 보였다.
- GitHub Pages는 이 변경 이후 아직 재배포하지 않았다. Supabase Auth URL/email 설정과 실제 회원가입·로그인 흐름 확인은 남아 있다.
- `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`는 이 클라이언트 기능에서 읽지 않는다. 브라우저 번들에 `VITE_` 접두어 service-role 변수를 넣지 않는다.

## 변경 기록

- 2026-10-10: 탭 제목만 변경되어 화면 상단에는 이전 이름이 남아 있던 문제를 수정했다. 공통 헤더를 `클라우드성공 방명록`, 브랜드 마크를 `클`로 바꾸고 README 제목도 일치시켰다.
- 2026-10-10: 브라우저 탭 제목을 `클라우드성공 방명록`으로 변경했다. 프로덕션 빌드와 main push를 완료하고 GitHub Pages Actions 실행 `38036528091`의 배포 성공을 확인했다.
- 2026-10-10: 브라우저 탭 제목을 `클라우드 방명록`으로 변경했다.

- 2026-10-10: 제품 설명과 확인된 Supabase 상태를 바탕으로 최초 구현 기록을 작성했다.
- 2026-10-10: 문서 설명을 한국어로 정리했다.
- 2026-10-10: Vite + React + TypeScript 클라이언트와 Supabase 연동, 마이그레이션 초안을 구현했다.
- 2026-10-10: `npm install` 완료, `npm run build` 성공. 사용자 승인 후 원격 Supabase 마이그레이션 적용 및 스키마·RLS·Storage·Realtime 검증 완료.
- 2026-10-10: GitHub Pages Actions 변수를 저장소에 설정한 뒤 배포 성공을 확인했다. 공개 주소는 `https://ulysess31.github.io/codex-visit/`이며 HTTP 200으로 응답했다.
- 2026-10-10: GitHub Pages용 `/codex-visit/` base 경로 및 Actions 배포 워크플로 추가. 실제 배포를 위해 저장소 Pages 소스와 Supabase Actions 변수의 수동 설정이 남아 있다.
