# 회원 인증·인가 구현 및 마이그레이션 계획

## 목적과 범위

현재 공개 방명록 앱에 회원가입, 로그인, 로그아웃, 세션 복원, 프로필 관리 기능을 추가하고, 글·댓글·이미지의 소유권을 데이터베이스와 Storage 정책으로 보호한다. 클라이언트와 migration을 구현했으며, 현재 Supabase 프로젝트에 migration을 적용했다. 기존 데이터는 삭제하지 않았고, 기존 글 3건·댓글 6건·이미지 2개를 보존했다. GitHub Pages 배포 및 Auth 이메일/리디렉션 설정 검증은 남아 있다.

### 현재 구조에서 확인된 사실

- 클라이언트는 Vite + React + TypeScript이고 Supabase JS 클라이언트는 `src/lib/supabase.ts`에서 초기화한다.
- `public.guestbook`에는 `id`, `created_at`, `author`, `content`, `media_path`, `media_kind`가 있다. 기존 글은 공개 보드에 노출된다.
- `public.guestbook_comments`에는 `id`, `guestbook_id`, `author`, `content`, `created_at`이 있다.
- 두 테이블은 RLS가 켜져 있고 `anon`, `authenticated` 모두 공개 조회 및 제한된 삽입이 가능하다. 공개 UPDATE/DELETE 정책은 없다.
- `guestbook-media` 버킷은 공개 버킷이다. 현재 `entries/` 경로에 비로그인/로그인 모두 업로드 가능하며, 기존 파일 URL은 공개 게시물에서 사용한다.
- 두 테이블은 Realtime 게시에 등록되어 있다. 앱은 브라우저에서 직접 Supabase API를 호출하며, 이 구조에서는 RLS가 핵심 인가 경계다.
- GitHub Pages 주소는 `https://ulysess31.github.io/codex-visit/`이고 앱 경로는 `/codex-visit/`이다.

## 권장 정책 결정

1. **공개 열람 유지:** 방명록·댓글·게시물 이미지는 계속 공개 조회할 수 있게 한다.
2. **기존 익명 사용 흐름 보존:** 기본 마이그레이션은 비회원의 글·댓글·이미지 등록을 계속 허용한다. 로그인 회원의 새 글·댓글에는 `user_id`를 기록하고 소유권에 따른 수정·삭제 권한을 추가한다. 회원 전용 작성으로 바꾸려면 별도 제품 결정 후 비회원 INSERT/Storage INSERT 정책을 폐쇄한다.
3. **기존 데이터는 무소유 레코드로 유지:** 기존 글·댓글·파일에 계정을 추정해 연결하지 않는다. 새 소유자 컬럼은 nullable로 추가하고 기존 행은 `NULL`로 둔다. 기존 게시물의 author 문자열은 표시용 스냅샷으로 보존한다.
4. **권한 기준은 `user_id`만 사용:** `author`, 프로필 이름, `user_metadata`는 사용자가 바꿀 수 있는 표시 정보이므로 소유권이나 관리자 권한 판단에 쓰지 않는다.
5. **프로필에는 공개해도 되는 값만 저장:** `profiles`는 `id`, 표시 이름, 아바타 경로, 생성·수정 시각만 둔다. 이메일이나 비공개 개인정보를 두지 않는다. 방명록/댓글의 `author`에는 작성 시점의 이름을 복사해 기존 공개 조회 흐름과 과거 이름 표시를 유지한다.
6. **회원 탈퇴 시 콘텐츠 보존:** 글·댓글의 소유자 FK는 `ON DELETE SET NULL`을 사용해 회원 삭제 후에도 공개 기록을 보존한다. 프로필은 Auth 사용자 삭제 시 함께 지운다. Storage 사용자 소유 파일 삭제 정책은 탈퇴 처리 설계에서 별도로 정하고, 공개 글이 참조하는 파일은 제거 전에 참조 여부를 확인한다.

## 목표 데이터 모델

### `public.profiles` 신규 테이블

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text` — 길이 제한과 공백 정규화 적용
- `avatar_path text null` — URL 자체보다 Storage 경로 저장 권장
- `created_at`, `updated_at timestamptz`
- RLS 활성화. 본인 행만 생성·수정할 수 있게 하고, 공개 게시물에 프로필을 조인해 표시할 경우 이 테이블에는 공개 가능한 필드만 두고 필요한 SELECT 범위를 명시한다. 이메일은 `auth.users` 밖으로 복제하지 않는다.
- 가입 시 프로필 행 생성은 `auth.users` 트리거 또는 신뢰 가능한 서버 흐름 중 하나를 선택한다. 트리거를 택한다면 함수의 `search_path` 고정, 최소 권한, 가입 실패 전파를 검토하고 새 가입/이메일 확인 대기/중복 상황을 테스트한다. 트리거 오류가 회원가입 자체를 실패시킬 수 있으므로 원격 적용 전 검증한다.

### 기존 콘텐츠 테이블 변경

- `public.guestbook.user_id uuid null references auth.users(id) on delete set null`
- `public.guestbook_comments.user_id uuid null references auth.users(id) on delete set null`
- 두 `user_id` 컬럼에 인덱스를 추가해 RLS 필터와 내 게시물 조회를 지원한다.
- 기존 행의 `user_id`는 모두 `NULL`로 둔다. 기존 `author`, 댓글, ID, 시각, 이미지 경로를 재작성하지 않는다.
- 신규 로그인 작성 시 `user_id = auth.uid()`를 기록한다. 표시명은 저장 시점의 `profiles.display_name`을 author 스냅샷으로 기록한다.

### Storage 경로 및 정책

- 기존 공개 버킷과 `entries/` 파일은 유지해 기존 글의 사진·그림 URL을 깨뜨리지 않는다.
- 로그인 사용자가 새로 올리는 파일은 `members/<auth.uid()>/...` 경로를 사용하고, INSERT 정책에서 경로의 사용자 ID가 현재 로그인 UID와 같은지 확인한다.
- 비회원 업로드를 유지하는 기본안에서는 기존 `entries/` INSERT 권한을 `anon` 대상으로만 명시적으로 보존한다. 인증 사용자가 이 경로를 이용해 소유권 검사를 우회하지 못하도록 역할과 경로를 나눈다.
- 공개 조회는 게시물 이미지를 보여주기 위해 계속 필요하다. 공개 버킷의 URL은 누구나 볼 수 있으므로 비공개 사진 보관용으로 사용하지 않는다.
- 프로필 아바타도 공개 노출이 의도된 경우에만 공개 버킷/경로를 사용한다. 비공개 프로필 이미지를 지원한다면 별도 비공개 버킷과 signed URL 설계를 검토한다.

## 인증 UX 및 클라이언트 작업

1. 상단 내비게이션에 로그인/회원가입 진입점, 로그인 사용자 표시명, 로그아웃을 추가한다.
2. 이메일/비밀번호 가입과 로그인, 로그아웃, 비밀번호 재설정 이메일 요청 및 재설정 완료 화면을 구현한다. 이메일 확인을 켤지 Supabase Auth 설정에서 결정하고, 확인 대기 상태와 재전송 안내를 UI에서 처리한다.
3. 앱 시작 시 현재 세션을 복원하고 `onAuthStateChange` 구독으로 로그인/토큰 갱신/로그아웃을 UI 상태에 반영한다. 구독 해제와 컴포넌트 unmount 정리를 한다.
4. `profiles`에서 표시 이름과 아바타 경로를 조회·수정하는 프로필 화면을 추가한다. 가입 완료와 프로필 로딩 중에는 빈 이름/깜빡임이 생기지 않도록 로딩 상태를 둔다.
5. 회원 글·댓글 등록 요청에 `user_id`를 담고, 로그인한 경우 표시명은 프로필에서 채운다. 비회원 작성은 현재 익명/별명 흐름을 유지한다.
6. 본인이 소유한 글·댓글만 수정·삭제 UI를 노출하되, 버튼 숨김을 보안 수단으로 간주하지 않는다. DB RLS가 타 사용자 조작을 최종 차단해야 한다.
7. Supabase 클라이언트 브라우저 설정에는 프로젝트 URL과 Publishable Key만 둔다. `service_role`/secret key를 Vite 환경 변수, 저장소, 정적 빌드에 넣지 않는다.

## 데이터베이스 인가 규칙

RLS와 SQL 권한은 함께 검토한다. 정책은 기존 정책과 OR 결합될 수 있으므로, 넓은 기존 정책이 남아 새 제한을 무력화하지 않도록 기존 이름과 전체 정책 목록을 확인한 다음 교체한다.

### `guestbook`, `guestbook_comments`

- SELECT: `anon`, `authenticated` 모두 공개 행 조회 허용.
- INSERT: `anon`은 `user_id IS NULL`인 경우에만 현재 길이·필수값·연결 검증을 통과하도록 한다. `authenticated`는 `user_id IS NULL OR user_id = auth.uid()`를 검사해 익명식 작성 유지 여부를 허용한다. 스팸 방지/회원 전용 여부가 결정되면 비회원 정책을 별도 변경한다.
- UPDATE/DELETE: `authenticated` 역할에만 허용하고 `user_id IS NOT NULL AND user_id = (select auth.uid())`를 `USING` 및 필요한 `WITH CHECK`에 적용한다. 다른 사용자의 `user_id`로 소유권 이전하는 것도 막는다.
- 댓글에도 같은 소유권 컬럼 및 수정·삭제 검사를 적용한다. 댓글의 `guestbook_id`가 유효한지 기존 제약조건을 유지한다.
- 작성자 이름을 프로필에서 자동 동기화할 필요가 있다면 별도 RPC/트리거 또는 author 스냅샷 정책을 검토한다. 브라우저 입력 이름을 인증 증명으로 취급하지 않는다.

### `profiles`

- SELECT는 공개 이름/아바타 표시 요구를 먼저 결정한다. 테이블에 공개 필드만 둔 경우 전체 행 공개 조회가 가능하지만, 개인 이메일 등 향후 비공개 필드가 추가되면 같은 정책을 유지하지 않는다.
- INSERT/UPDATE는 `id = auth.uid()`로 제한한다. 클라이언트가 다른 사용자 프로필을 만들거나 수정할 수 없어야 한다.
- DELETE는 Auth 삭제 cascade를 기본 경로로 하고, 사용자 본인 삭제 UI를 지원한다면 별도의 안전한 서버 측 처리로 구현한다.

## 단계별 마이그레이션 및 배포 계획

### 0단계 — 현황 고정 및 정책 결정

- Supabase MCP/대시보드에서 실제 컬럼, 제약, 전체 RLS 정책(명칭·역할·명령·조건), 버킷 공개 여부와 Storage 정책, Realtime 등록을 다시 조회한다.
- 대상 Supabase 프로젝트가 운영/테스트 중 무엇인지 확인하고 schema/data 백업 또는 복구 가능한 내보내기를 준비한다.
- 비회원 글쓰기 유지 여부, 이메일 확인 여부, 공개 프로필 표시 범위, 아바타 사용 여부, 회원 탈퇴 후 이미지 보존 방식을 결정한다. 이 계획의 기본값은 비회원 작성 유지, 이메일 확인 설정은 사전 검토, 아바타는 선택, 콘텐츠 보존이다.
- 모든 SQL 변경은 `supabase/migrations/`에 새 타임스탬프 migration으로 추가한다. 이미 원격 적용된 과거 migration 파일은 편집하지 않는다.

### 1단계 — 호환성 우선 DB 확장

- 새 migration에서 `profiles` 테이블, RLS, 최소 권한, `user_id` nullable FK와 인덱스를 추가한다.
- 가입 프로필 자동 생성 방식을 정하고 트리거를 쓰면 실패 동작을 검증한다.
- 기존 공개 SELECT/INSERT 동작을 우선 유지하면서 새로운 authenticated INSERT/owner UPDATE·DELETE 정책을 만든다. 정책을 교체할 때 이름만 바꾸어 낡은 허용 정책이 남지 않았는지 확인한다.
- 기존 레코드나 Storage 오브젝트는 이 단계에서 UPDATE/DELETE/이동하지 않는다.
- SQL을 테스트 프로젝트에 먼저 적용하고 정책별 `anon`, 회원 A, 회원 B 요청을 검증한 뒤 운영에 반영한다.

### 2단계 — 로그인 기반을 클라이언트에 추가

- 인증 상태 Context/Hook 및 중앙 Supabase Auth 유틸리티를 구성한다.
- 가입/로그인/로그아웃/세션 복원, 이메일 확인 대기, 비밀번호 재설정, 오류 메시지를 구현한다.
- Auth 콜백/복귀 URL을 GitHub Pages 하위 경로(`/codex-visit/`)에 맞게 처리한다.
- Supabase Dashboard의 Auth URL Configuration에서 Site URL과 허용 Redirect URLs를 검토한다. 로컬 개발 URL(예: `http://localhost:5173/**`)과 운영 URL(`https://ulysess31.github.io/codex-visit/**`)만 필요한 범위로 등록한다. 별표 와일드카드를 과도하게 열지 않는다.
- 이메일 확인을 켠다면 SMTP/기본 발송 제한, 템플릿, 확인 링크의 경로를 테스트한다. 외부 OAuth 제공자는 별도 요구가 생길 때 추가한다.

### 3단계 — 프로필 및 소유권 연동

- 프로필 조회·수정 화면과 표시 이름 검증을 추가한다.
- 새 글/댓글 작성 시 회원의 `user_id`와 표시 이름 스냅샷을 기록한다. 비회원 레코드는 `user_id = NULL`로 유지한다.
- 회원 이미지 업로드 경로를 UID 기반으로 변경하고 Storage RLS 정책과 함께 배포한다. 기존 `entries/` 파일은 공개 읽기 상태로 보존한다.
- 본인 글·댓글의 수정·삭제 기능은 제품 범위에 포함할지 결정 후 구현한다. DB 정책을 먼저 검증하고 그 뒤에 UI를 연결한다.

### 4단계 — 검증 및 공개 배포

- 빌드 및 코드 점검 후 GitHub Pages 미리보기/운영 배포를 진행한다.
- 최소 검증 행렬:
  - 비로그인: 가입 전 공개 목록/상세/댓글 Realtime 읽기가 기존처럼 동작한다.
  - 비로그인: 허용된 익명 작성 정책에서 글·댓글·`entries/` 업로드가 기존 검증을 통과한다.
  - 회원 A: 가입/이메일 확인/로그인/새로고침 후 세션 복원/로그아웃/비밀번호 재설정이 동작한다.
  - 회원 A: 글·댓글·프로필을 만들고 본인 행만 수정·삭제할 수 있다.
  - 회원 B 및 비로그인: A 소유 레코드의 수정·삭제와 A 폴더 파일 업로드가 RLS에서 거부된다.
  - 모든 사용자: 기존 행 `user_id=NULL`, 기존 사진 경로, 공개 보드와 Realtime이 유지된다.
  - 운영 redirect URL, 이메일 확인 링크, GitHub Pages의 `/codex-visit/` 경로가 맞다.
- Supabase 정책 검증은 가능한 경우 Supabase DB 테스트 또는 실제 anon/두 회원 JWT로 실행한다. 프런트엔드에서 버튼이 안 보이는 것만으로 인가를 통과했다고 판단하지 않는다.

## 롤백 및 운영 복구

- 스키마 확장은 nullable 컬럼과 신규 테이블 중심으로 진행해 이전 클라이언트와 호환되게 한다.
- 문제가 나면 먼저 Pages에서 이전 빌드로 되돌리고, 그다음 신규 UPDATE/DELETE 정책 또는 잘못된 Storage 정책을 좁히거나 비활성화한다. 기존 공개 SELECT/익명 INSERT 정책을 무계획하게 다시 열지 않는다.
- 추가한 `user_id` 컬럼/프로필 테이블을 즉시 삭제하지 않는다. 데이터가 기록된 뒤의 파괴적 롤백은 소유권 정보 손실을 일으킬 수 있으므로 별도 백업과 영향 검토 없이 실행하지 않는다.
- 공개 Storage 파일은 DB 행과 오브젝트 참조를 대조한 뒤에만 삭제한다. `storage` 시스템 테이블을 직접 수정하지 않고 Supabase Storage API를 통해 파일을 관리한다.

## 완료 기준

- 가입부터 로그인·세션 유지·로그아웃·프로필 편집까지 운영 URL에서 사용할 수 있다.
- Auth UID가 글·댓글 소유권과 Storage 업로드 경로에 연결되고, 다른 계정의 위조 요청이 RLS에서 차단된다.
- 기존 공개 게시물, 댓글, 파일 및 Realtime 흐름이 보존된다.
- 비회원 게시 허용 여부와 Auth 이메일/리디렉션 설정이 문서화되고, 테스트 행렬을 통과한다.
- 완료 후 `progress.md`, `implementation.md`, 필요 시 `architecture.md`를 실제 적용 결과에 맞춰 갱신한다.

## 참고 자료

- Supabase [User Management](https://supabase.com/docs/guides/auth/managing-user-data) — `auth.users` 참조, 프로필 테이블, 가입 트리거 및 메타데이터
- Supabase [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `auth.uid()`와 역할 기반 정책
- Supabase [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — 버킷 업로드 RLS와 UID 폴더 정책
- Supabase [Auth Users](https://supabase.com/docs/guides/auth/users) — 인증 사용자와 익명 사용자의 차이
