export type GuestbookEntry = {
  id: number
  user_id: string | null
  created_at: string
  author: string | null
  content: string | null
  media_path: string | null
  media_kind: 'photo' | 'drawing' | null
}

export type GuestbookComment = {
  id: number
  user_id: string | null
  guestbook_id: number
  author: string
  content: string
  created_at: string
}

export type Profile = {
  id: string
  display_name: string
  avatar_path: string | null
  created_at: string
  updated_at: string
}
