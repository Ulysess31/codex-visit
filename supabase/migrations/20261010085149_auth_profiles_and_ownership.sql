-- Supabase Auth UID를 프로필 및 방명록/댓글 소유권에 연결한다.
-- 기존 공개 읽기, 비회원 작성, 데이터와 Storage 오브젝트는 보존한다.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_avatar_path_owner_check
    check (avatar_path is null or avatar_path like ('avatars/' || id::text || '/%'))
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      '새 방문자'
    ), 40)
  );
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user_profile();

alter table public.guestbook
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.guestbook_comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists guestbook_user_id_idx on public.guestbook (user_id);
create index if not exists guestbook_comments_user_id_idx on public.guestbook_comments (user_id);

-- anon 역할은 기존 검증 조건과 user_id IS NULL을 모두 만족해야 등록할 수 있다.
drop policy if exists guestbook_public_insert on public.guestbook;
create policy guestbook_public_insert on public.guestbook
  for insert to anon
  with check (
    user_id is null
    and author is not null
    and char_length(trim(author)) between 1 and 40
    and (
      (content is not null and char_length(trim(content)) between 1 and 500)
      or (media_path is not null and media_kind in ('photo', 'drawing'))
    )
    and (
      (media_path is null and media_kind is null)
      or (media_path like 'entries/%' and media_kind in ('photo', 'drawing'))
    )
  );

drop policy if exists guestbook_authenticated_insert_own on public.guestbook;
create policy guestbook_authenticated_insert_own on public.guestbook
  for insert to authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and author is not null
    and char_length(trim(author)) between 1 and 40
    and (
      (content is not null and char_length(trim(content)) between 1 and 500)
      or (media_path is not null and media_kind in ('photo', 'drawing'))
    )
    and (
      (
        user_id is null
        and (
          (media_path is null and media_kind is null)
          or (media_path like 'entries/%' and media_kind in ('photo', 'drawing'))
        )
      )
      or (
        user_id = (select auth.uid())
        and (
          (media_path is null and media_kind is null)
          or (media_path like 'entries/%' and media_kind in ('photo', 'drawing'))
          or (media_path like ('members/' || (select auth.uid())::text || '/%') and media_kind in ('photo', 'drawing'))
        )
      )
    )
  );

drop policy if exists guestbook_update_own on public.guestbook;
create policy guestbook_update_own on public.guestbook
  for update to authenticated
  using (user_id is not null and user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and author is not null
    and char_length(trim(author)) between 1 and 40
    and (
      (content is not null and char_length(trim(content)) between 1 and 500)
      or (media_path is not null and media_kind in ('photo', 'drawing'))
    )
    and (
      (media_path is null and media_kind is null)
      or (media_path like 'entries/%' and media_kind in ('photo', 'drawing'))
      or (media_path like ('members/' || (select auth.uid())::text || '/%') and media_kind in ('photo', 'drawing'))
    )
  );

drop policy if exists guestbook_delete_own on public.guestbook;
create policy guestbook_delete_own on public.guestbook
  for delete to authenticated
  using (user_id is not null and user_id = (select auth.uid()));

drop policy if exists guestbook_comments_public_insert on public.guestbook_comments;
create policy guestbook_comments_public_insert on public.guestbook_comments
  for insert to anon
  with check (
    user_id is null
    and char_length(trim(author)) between 1 and 40
    and char_length(trim(content)) between 1 and 500
    and exists (select 1 from public.guestbook entry where entry.id = guestbook_id)
  );

drop policy if exists guestbook_comments_authenticated_insert_own on public.guestbook_comments;
create policy guestbook_comments_authenticated_insert_own on public.guestbook_comments
  for insert to authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and char_length(trim(author)) between 1 and 40
    and char_length(trim(content)) between 1 and 500
    and exists (select 1 from public.guestbook entry where entry.id = guestbook_id)
  );

drop policy if exists guestbook_comments_update_own on public.guestbook_comments;
create policy guestbook_comments_update_own on public.guestbook_comments
  for update to authenticated
  using (user_id is not null and user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and char_length(trim(author)) between 1 and 40
    and char_length(trim(content)) between 1 and 500
    and exists (select 1 from public.guestbook entry where entry.id = guestbook_id)
  );

drop policy if exists guestbook_comments_delete_own on public.guestbook_comments;
create policy guestbook_comments_delete_own on public.guestbook_comments
  for delete to authenticated
  using (user_id is not null and user_id = (select auth.uid()));

-- 기존 공개 파일은 유지하고, 신규 비회원/회원 업로드 경로를 분리한다.
drop policy if exists guestbook_media_public_insert on storage.objects;
drop policy if exists guestbook_media_anon_entries_insert on storage.objects;
create policy guestbook_media_anon_entries_insert on storage.objects
  for insert to anon
  with check (bucket_id = 'guestbook-media' and (storage.foldername(name))[1] = 'entries');

drop policy if exists guestbook_media_authenticated_insert_own on storage.objects;
create policy guestbook_media_authenticated_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'guestbook-media'
    and (
      ((storage.foldername(name))[1] = 'members' and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = (select auth.uid())::text)
    )
  );

drop policy if exists guestbook_media_update_own on storage.objects;
create policy guestbook_media_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'guestbook-media'
    and (storage.foldername(name))[1] in ('members', 'avatars')
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'guestbook-media'
    and (storage.foldername(name))[1] in ('members', 'avatars')
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists guestbook_media_delete_own on storage.objects;
create policy guestbook_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'guestbook-media'
    and (storage.foldername(name))[1] in ('members', 'avatars')
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
