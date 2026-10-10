export type GuestbookEntry = {
  id: number
  created_at: string
  author: string | null
  content: string | null
  media_path: string | null
  media_kind: 'photo' | 'drawing' | null
}

export type GuestbookComment = {
  id: number
  guestbook_id: number
  author: string
  content: string
  created_at: string
}
