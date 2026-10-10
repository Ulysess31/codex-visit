import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const MEDIA_BUCKET = 'guestbook-media'

export function mediaUrl(path: string | null | undefined) {
  if (!path || !supabase) return null
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}
