import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { MEDIA_BUCKET, mediaUrl, supabase } from './lib/supabase'
import type { Profile } from './types'

export type AuthDialogMode = 'login' | 'signup' | 'profile' | 'recovery'

type Props = {
  mode: AuthDialogMode
  user: User | null
  profile: Profile | null
  onClose: () => void
  onProfileSaved: (profile: Profile) => void
}

const authRedirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).toString()

export default function AuthDialog({ mode, user, profile, onClose, onProfileSaved }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [resetMode, setResetMode] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
  }, [profile?.display_name])

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const showError = (value: string) => { setErrorMessage(value); setMessage('') }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { showError('Supabase 연결 설정이 필요해요.'); return }
    setBusy(true)
    setErrorMessage('')
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (error) throw error
        if (!data.session) throw new Error('회원가입은 처리됐지만 바로 로그인되지 않았어요. Supabase Auth에서 이메일 확인(Confirm email)을 꺼야 인증 메일 없이 가입할 수 있어요.')
        setMessage('회원가입이 완료됐어요.')
        window.setTimeout(onClose, 700)
      } else if (mode === 'login' && resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() })
        if (error) throw error
        setMessage('비밀번호 재설정 링크를 이메일로 보냈어요.')
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onClose()
      } else if (mode === 'recovery') {
        if (newPassword.length < 8) throw new Error('새 비밀번호는 8자 이상 입력해 주세요.')
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        setMessage('비밀번호를 변경했어요.')
        window.setTimeout(onClose, 700)
      } else if (mode === 'profile' && user) {
        const name = displayName.trim()
        if (name.length < 1 || name.length > 40) throw new Error('표시 이름은 1~40자로 입력해 주세요.')
        let avatarPath = profile?.avatar_path ?? null
        if (avatarFile) {
          if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(avatarFile.type)) throw new Error('JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요.')
          if (avatarFile.size > 5 * 1024 * 1024) throw new Error('프로필 이미지는 5MB 이하로 올려주세요.')
          const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
          avatarPath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`
          const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(avatarPath, avatarFile, { contentType: avatarFile.type, upsert: false })
          if (uploadError) throw uploadError
        }
        const { data, error } = await supabase.from('profiles').update({ display_name: name, avatar_path: avatarPath, updated_at: new Date().toISOString() }).eq('id', user.id).select('id, display_name, avatar_path, created_at, updated_at').single()
        if (error) {
          if (avatarFile && avatarPath) void supabase.storage.from(MEDIA_BUCKET).remove([avatarPath])
          throw error
        }
        onProfileSaved(data as Profile)
        if (profile?.avatar_path && profile.avatar_path !== avatarPath) void supabase.storage.from(MEDIA_BUCKET).remove([profile.avatar_path])
        setAvatarFile(null)
        setMessage('프로필을 저장했어요.')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signup' ? '회원가입' : mode === 'profile' ? '내 프로필' : mode === 'recovery' ? '비밀번호 변경' : resetMode ? '비밀번호 재설정' : '로그인'
  const currentAvatar = avatarPreview ?? mediaUrl(profile?.avatar_path)

  return <div className="auth-overlay" role="presentation">
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-heading"><div><span className="eyebrow">CLOUD GUESTBOOK</span><h2 id="auth-title">{title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="닫기">×</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label className="field-label" htmlFor="auth-display-name">표시 이름<input id="auth-display-name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={1} maxLength={40} autoComplete="nickname" required /></label>}
        {mode === 'profile' && <>
          <div className="profile-avatar-row">{currentAvatar ? <img src={currentAvatar} alt="프로필 사진" /> : <span>{displayName.slice(0, 1) || '✿'}</span>}<label className="tool-button">사진 변경<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} /></label></div>
          <label className="field-label" htmlFor="profile-display-name">표시 이름<input id="profile-display-name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={1} maxLength={40} autoComplete="nickname" required /></label>
          <label className="field-label" htmlFor="profile-email">이메일<input id="profile-email" className="text-input" value={user?.email ?? ''} readOnly /></label>
        </>}
        {(mode === 'login' || mode === 'signup') && <label className="field-label" htmlFor="auth-email">이메일<input id="auth-email" className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>}
        {(mode === 'login' && !resetMode || mode === 'signup') && <label className="field-label" htmlFor="auth-password">비밀번호<input id="auth-password" className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>}
        {mode === 'recovery' && <label className="field-label" htmlFor="auth-new-password">새 비밀번호<input id="auth-new-password" className="text-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></label>}
        {message && <p className="auth-message" role="status">{message}</p>}
        {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
        <button className="primary-button auth-submit" disabled={busy || (mode === 'profile' && !profile)}>{busy ? <><span className="spinner" /> 처리 중…</> : mode === 'profile' ? '프로필 저장' : mode === 'recovery' ? '비밀번호 변경' : mode === 'signup' ? '가입하기' : resetMode ? '재설정 이메일 보내기' : '로그인'}</button>
      </form>
      {mode === 'login' && <div className="auth-switches">{!resetMode && <button type="button" onClick={() => { setResetMode(true); setErrorMessage(''); setMessage('') }}>비밀번호를 잊으셨나요?</button>}<button type="button" onClick={() => { setResetMode(false); setErrorMessage(''); setMessage('') }}>{resetMode ? '로그인으로 돌아가기' : '회원가입'}</button></div>}
    </section>
  </div>
}
