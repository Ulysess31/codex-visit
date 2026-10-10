# 클라우드성공 방명록

사진과 직접 그린 그림, 짧은 인사를 남기고 포스트잇 보드에서 서로의 방명록과 댓글을 실시간으로 확인하는 웹앱입니다.

## 실행

1. Node.js 20.19 이상을 준비합니다.
2. 의존성을 설치합니다.

   ```sh
   npm install
   ```

3. `.env.example`을 `.env.local`로 복사한 뒤 Supabase 프로젝트 값을 입력합니다.

   ```sh
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. 개발 서버를 실행합니다.

   ```sh
   npm run dev
   ```

## Supabase 설정

`supabase/migrations/20261010062619_guestbook_realtime_app.sql`은 방명록 미디어, 댓글, Storage, RLS 및 Realtime 구성을 준비합니다. `supabase/migrations/20261010085149_auth_profiles_and_ownership.sql`은 Supabase Auth 프로필과 회원 소유권 정책을 추가합니다. 두 migration은 연결된 Supabase 프로젝트에 적용되어 있으며, 기존 방명록·댓글·이미지는 보존됩니다.

회원가입 프로필은 `auth.users.id`를 참조하는 DB 트리거가 생성합니다. 이 정적 브라우저 앱에는 `SUPABASE_SERVICE_ROLE_KEY`가 필요하지 않습니다. Supabase **Authentication → URL Configuration**의 Site URL은 운영 `https://ulysess31.github.io/codex-visit/`로 설정하고, 허용 Redirect URLs에 로컬 주소를 추가해야 합니다. 현재 로컬 개발 서버는 `http://localhost:5174/`에서 실행 중이며, 기존 사용 중인 포트 `5173`도 사용할 계획이면 `http://localhost:5173/`도 함께 등록하세요.

이 방명록은 공개 보드로 설계되어 비로그인 방문자의 읽기와 쓰기를 허용합니다. 프로젝트 운영자 승인 후 마이그레이션을 연결된 Supabase 프로젝트에 적용했습니다. 정책은 작성자와 본문 길이를 제한하고 새 글·댓글의 공개 등록을 허용합니다. 기존 `guestbook` 데이터는 보존됩니다.

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`이 `main` 브랜치에 push될 때 사이트를 빌드하고 배포합니다. 저장소 설정에서 Pages 게시 소스를 GitHub Actions로 정하고, **Settings → Secrets and variables → Actions → Variables**에서 다음 저장소 변수를 추가해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

두 값은 앱에서 브라우저로 사용하는 공개 연결 정보이며, Supabase `service_role` 키를 사용하면 안 됩니다. 최초 설정 후 **Actions** 탭에서 `Deploy to GitHub Pages` 워크플로를 다시 실행합니다. 배포 주소는 `https://ulysess31.github.io/codex-visit/`입니다.

## 주요 기능

- 사진 첨부 또는 브라우저 그림판으로 방명록 남기기
- 포스트잇 카드 보드, 정렬, 실시간 새 글 표시
- 방명록 상세와 실시간 댓글
- 모바일 대응, 입력 검증, 오류·연결 상태 안내
