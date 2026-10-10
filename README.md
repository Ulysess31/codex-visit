# 모여서 쓰는 방명록

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

`supabase/migrations/20261010000000_guestbook_realtime_app.sql`은 기존 `guestbook` 데이터를 보존하면서 미디어 컬럼과 댓글 테이블, Storage 버킷, RLS 정책 및 Realtime 등록을 준비합니다.

이 방명록은 공개 보드로 설계되어 비로그인 방문자의 읽기와 쓰기를 허용합니다. 프로젝트 운영자 승인 후 마이그레이션을 연결된 Supabase 프로젝트에 적용했습니다. 정책은 작성자와 본문 길이를 제한하고 새 글·댓글의 공개 등록을 허용합니다. 기존 `guestbook` 데이터는 보존됩니다.

## 주요 기능

- 사진 첨부 또는 브라우저 그림판으로 방명록 남기기
- 포스트잇 카드 보드, 정렬, 실시간 새 글 표시
- 방명록 상세와 실시간 댓글
- 모바일 대응, 입력 검증, 오류·연결 상태 안내
