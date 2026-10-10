import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from 'react'
import { hasSupabaseConfig, MEDIA_BUCKET, mediaUrl, supabase } from './lib/supabase'
import type { GuestbookComment, GuestbookEntry } from './types'

type Screen = 'write' | 'board'
type Toast = { kind: 'success' | 'error' | 'info'; message: string } | null

const colors = ['#fff0a8', '#d9efdb', '#dce9ff', '#ffe0cf', '#f5dcf7', '#d8f1ef']
const penColors = ['#243b35', '#d7654c', '#5269aa', '#408a68', '#b77b17']

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

function CameraIcon() { return <Icon><path d="M14 4H8L6.5 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5L16 4h-2Z"/><circle cx="12" cy="13" r="3.5"/></Icon> }
function BoardIcon() { return <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h8"/></Icon> }
function ArrowIcon() { return <Icon><path d="M5 12h14M13 6l6 6-6 6"/></Icon> }
function CloseIcon() { return <Icon><path d="m18 6-12 12M6 6l12 12"/></Icon> }
function SendIcon() { return <Icon><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></Icon> }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function CanvasPad({ onDone, onCancel }: { onDone: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [color, setColor] = useState(penColors[0])
  const [width, setWidth] = useState(5)
  const [eraser, setEraser] = useState(false)
  const [hasMarks, setHasMarks] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#fffdf8'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }
  }

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const context = canvas.getContext('2d')!
    const p = point(event)
    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(p.x, p.y)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = eraser ? '#fffdf8' : color
    context.lineWidth = eraser ? width * 5 : width
    context.lineTo(p.x + 0.01, p.y + 0.01)
    context.stroke()
    setHasMarks(true)
  }

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const p = point(event)
    const context = canvasRef.current!.getContext('2d')!
    context.strokeStyle = eraser ? '#fffdf8' : color
    context.lineWidth = eraser ? width * 5 : width
    context.lineTo(p.x, p.y)
    context.stroke()
  }

  const finish = () => { drawingRef.current = false }
  const clear = () => {
    const canvas = canvasRef.current!
    const context = canvas.getContext('2d')!
    context.fillStyle = '#fffdf8'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setHasMarks(false)
  }

  const save = () => {
    canvasRef.current?.toBlob((blob) => { if (blob) onDone(blob) }, 'image/png')
  }

  return <div className="canvas-overlay" role="dialog" aria-modal="true" aria-labelledby="canvas-title">
    <div className="canvas-dialog">
      <div className="canvas-heading"><div><span className="eyebrow">DRAWING STUDIO</span><h2 id="canvas-title">마음 가는 대로 그려보세요</h2></div><button className="icon-button" onClick={onCancel} aria-label="그림판 닫기"><CloseIcon /></button></div>
      <div className="canvas-toolbar">
        <div className="swatches" aria-label="펜 색상 선택">{penColors.map((pen) => <button key={pen} aria-label={`펜 색상 ${pen}`} className={`swatch ${color === pen && !eraser ? 'selected' : ''}`} style={{ backgroundColor: pen }} onClick={() => { setColor(pen); setEraser(false) }} />)}</div>
        <label className="brush-control">펜 굵기 <input aria-label="펜 굵기" type="range" min="2" max="12" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
        <button className={`tool-button ${eraser ? 'active' : ''}`} onClick={() => setEraser(!eraser)}>지우개</button>
        <button className="tool-button" onClick={clear}>전체 지우기</button>
      </div>
      <canvas ref={canvasRef} className="drawing-canvas" width={1000} height={560} aria-label="마우스나 손가락으로 그림을 그리는 영역" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={finish} />
      <div className="canvas-footer"><p>완성한 그림은 방명록에 이미지로 저장됩니다.</p><button className="primary-button" disabled={!hasMarks} onClick={save}>그림 사용하기 <ArrowIcon /></button></div>
    </div>
  </div>
}

function App() {
  const [screen, setScreen] = useState<Screen>('write')
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [selected, setSelected] = useState<GuestbookEntry | null>(null)
  const [comments, setComments] = useState<GuestbookComment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [commentSaving, setCommentSaving] = useState(false)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [toast, setToast] = useState<Toast>(null)
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [drawing, setDrawing] = useState<Blob | null>(null)
  const [drawingPreview, setDrawingPreview] = useState<string | null>(null)
  const [showCanvas, setShowCanvas] = useState(false)
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const notify = (message: string, kind: NonNullable<Toast>['kind'] = 'info') => {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 3800)
  }

  const loadEntries = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase.from('guestbook').select('*').order('created_at', { ascending: false })
    setLoading(false)
    if (error) { setConnection('offline'); notify('방명록을 불러오지 못했어요. Supabase 접근 정책을 확인해 주세요.', 'error'); return }
    setEntries((data ?? []) as GuestbookEntry[])
    setConnection('online')
  }, [])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    void loadEntries()
    const channel = client.channel('guestbook-live-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guestbook' }, (payload) => {
        setEntries((current) => {
          if (payload.eventType === 'DELETE') return current.filter((entry) => entry.id !== Number(payload.old.id))
          const incoming = payload.new as GuestbookEntry
          return [incoming, ...current.filter((entry) => entry.id !== incoming.id)].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        })
      })
      .subscribe((status) => setConnection(status === 'SUBSCRIBED' ? 'online' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' ? 'offline' : 'connecting'))
    return () => { void client.removeChannel(channel) }
  }, [loadEntries])

  useEffect(() => {
    if (!selected || !supabase) { setComments([]); return }
    const client = supabase
    const entryId = selected.id
    const fetchComments = async () => {
      const { data, error } = await client.from('guestbook_comments').select('*').eq('guestbook_id', entryId).order('created_at', { ascending: true })
      if (error) { notify('댓글을 불러오지 못했어요. Supabase 설정을 확인해 주세요.', 'error'); return }
      setComments((data ?? []) as GuestbookComment[])
    }
    void fetchComments()
    const channel = client.channel(`guestbook-comments-${entryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guestbook_comments', filter: `guestbook_id=eq.${entryId}` }, (payload) => {
        setComments((current) => {
          if (payload.eventType === 'DELETE') return current.filter((comment) => comment.id !== Number(payload.old.id))
          const incoming = payload.new as GuestbookComment
          return [...current.filter((comment) => comment.id !== incoming.id), incoming].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        })
      })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [selected])

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { notify('JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요.', 'error'); event.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { notify('사진은 5MB 이하로 올려주세요.', 'error'); event.target.value = ''; return }
    setPhoto(file)
    setDrawing(null)
    setDrawingPreview(null)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const acceptDrawing = (blob: Blob) => {
    setDrawing(blob)
    setPhoto(null)
    setPhotoPreview(null)
    setDrawingPreview(URL.createObjectURL(blob))
    setShowCanvas(false)
  }

  const submitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { notify('Supabase 환경 변수를 먼저 설정해 주세요.', 'error'); return }
    if (!author.trim() || author.trim().length > 40) { notify('이름은 1자 이상 40자 이하로 입력해 주세요.', 'error'); return }
    if (!content.trim() && !photo && !drawing) { notify('한마디를 적거나 사진 또는 그림을 추가해 주세요.', 'error'); return }
    if (content.trim().length > 500) { notify('한마디는 500자 이내로 작성해 주세요.', 'error'); return }
    setSaving(true)
    let mediaPath: string | null = null
    let mediaKind: 'photo' | 'drawing' | null = null
    const media = photo ?? drawing
    if (media) {
      const extension = photo ? photo.name.split('.').pop()?.toLowerCase() ?? 'jpg' : 'png'
      mediaPath = `entries/${crypto.randomUUID()}.${extension}`
      mediaKind = photo ? 'photo' : 'drawing'
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(mediaPath, media, { contentType: media.type || 'image/png', upsert: false })
      if (uploadError) { setSaving(false); notify(`이미지를 저장하지 못했어요: ${uploadError.message}`, 'error'); return }
    }
    const { error } = await supabase.from('guestbook').insert({ author: author.trim(), content: content.trim() || null, media_path: mediaPath, media_kind: mediaKind })
    setSaving(false)
    if (error) { notify(`방명록을 저장하지 못했어요: ${error.message}`, 'error'); return }
    setAuthor('')
    setContent('')
    setPhoto(null)
    setPhotoPreview(null)
    setDrawing(null)
    setDrawingPreview(null)
    setScreen('board')
    notify('첫 인사를 남겼어요. 고마워요!', 'success')
    await loadEntries()
  }

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !selected) return
    if (!commentAuthor.trim() || commentAuthor.trim().length > 40 || !commentContent.trim() || commentContent.trim().length > 500) { notify('이름과 댓글을 확인해 주세요. (각각 1~40자, 1~500자)', 'error'); return }
    setCommentSaving(true)
    const { error } = await supabase.from('guestbook_comments').insert({ guestbook_id: selected.id, author: commentAuthor.trim(), content: commentContent.trim() })
    setCommentSaving(false)
    if (error) { notify(`댓글을 등록하지 못했어요: ${error.message}`, 'error'); return }
    setCommentAuthor('')
    setCommentContent('')
  }

  const sortedEntries = [...entries].sort((a, b) => sort === 'newest' ? Date.parse(b.created_at) - Date.parse(a.created_at) : Date.parse(a.created_at) - Date.parse(b.created_at))
  const currentMedia = selected ? mediaUrl(selected.media_path) : null

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen('write')} aria-label="방명록 작성 화면으로 이동"><span className="brand-mark">클</span><span>클라우드성공 방명록</span></button>
      <nav className="top-actions" aria-label="주요 메뉴">
        <span className={`live-status ${connection}`}><i />{connection === 'online' ? '실시간 연결됨' : connection === 'offline' ? '연결 확인 필요' : '연결 중'}</span>
        <button className={`nav-button ${screen === 'board' ? 'nav-current' : ''}`} onClick={() => setScreen('board')}><BoardIcon /> 보드 보기 <span className="entry-count">{entries.length}</span></button>
      </nav>
    </header>

    {!hasSupabaseConfig && <div className="setup-banner" role="status">Supabase 연결 설정이 필요해요. `.env.local`에 프로젝트 URL과 Publishable Key를 입력해 주세요.</div>}

    {screen === 'write' ? <section className="write-screen">
      <div className="intro-copy"><div className="eyebrow"><span className="tiny-sparkle">✳</span> OUR LITTLE CORNER OF THE INTERNET</div><h1>오늘의 마음을<br /><em>한 장 남겨주세요.</em></h1><p>사진 한 장, 그림 한 점, 짧은 인사도 좋아요.<br />당신의 흔적이 이곳을 더 따뜻하게 만들어요.</p></div>
      <div className="write-layout">
        <form className="write-card" onSubmit={submitEntry}>
          <div className="card-topline"><span>01 / YOUR NOTE</span><span className="card-date">작은 인사 남기기</span></div>
          <label className="field-label" htmlFor="guest-name">어떻게 불러드릴까요?</label>
          <input id="guest-name" className="text-input name-input" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="이름 또는 별명" maxLength={40} required />
          <label className="field-label message-label" htmlFor="guest-message">전하고 싶은 한마디 <span>선택</span></label>
          <textarea id="guest-message" className="message-input" value={content} onChange={(event) => setContent(event.target.value)} placeholder="여기에 다정한 말을 적어주세요…" maxLength={500} rows={4} />
          <div className="character-count">{content.length} / 500</div>
          <div className="field-label attach-label">무언가 함께 남겨볼까요? <span>선택 · 사진 또는 그림</span></div>
          <div className="attach-options">
            <button type="button" className={`attach-option ${photoPreview && !drawingPreview ? 'chosen' : ''}`} onClick={() => fileInputRef.current?.click()}><span className="attach-icon photo-icon"><CameraIcon /></span><span><b>사진 첨부</b><small>기억하고 싶은 순간</small></span><span className="option-arrow">↗</span></button>
            <button type="button" className={`attach-option ${drawingPreview ? 'chosen' : ''}`} onClick={() => setShowCanvas(true)}><span className="attach-icon draw-icon">✎</span><span><b>직접 그리기</b><small>손끝으로 그린 그림</small></span><span className="option-arrow">↗</span></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handlePhoto} />
          {(photoPreview || drawingPreview) && <div className="attachment-preview"><img src={photoPreview ?? drawingPreview ?? ''} alt={photo ? '첨부한 사진 미리보기' : '직접 그린 그림 미리보기'} /><div><b>{photo ? photo.name : '내가 그린 그림'}</b><small>{photo ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : 'PNG 그림 파일'}</small></div><button type="button" className="icon-button small" aria-label="첨부 삭제" onClick={() => { setPhoto(null); setPhotoPreview(null); setDrawing(null); setDrawingPreview(null) }}><CloseIcon /></button></div>}
          <div className="form-footer"><span>✿&nbsp; 공개 보드에 함께 보여요</span><button className="primary-button submit-button" disabled={saving || !hasSupabaseConfig}>{saving ? <><span className="spinner" /> 저장 중…</> : <>방명록 남기기 <ArrowIcon /></>}</button></div>
        </form>
        <aside className="note-preview-column" aria-label="포스트잇 미리보기"><div className="preview-caption"><span className="preview-dot" /> YOUR NOTE, ON THE BOARD</div><div className="sticky-preview"><span className="tape" /><div className="sticky-flower">✳</div><div className="preview-text">당신의 작은 인사가<br />누군가의 하루를<br /><em>밝혀줄지도 몰라요.</em></div><div className="preview-sign">— 여기 다녀간 사람들</div><div className="preview-sticker">✿</div></div><div className="preview-caption bottom-caption">모두의 마음이 모이는 곳 <span>↗</span></div><div className="guide-note"><span className="guide-icon">♡</span><p><b>부담 없이 남겨주세요</b><br />좋은 말은 오래 기억되니까요.</p></div></aside>
      </div>
      <footer className="page-footer"><span>ONE NOTE CAN MAKE A DAY</span><span>작은 기록들이 모여 큰 추억이 돼요 <i>✳</i></span></footer>
    </section> : <section className="board-screen">
      <div className="board-heading"><div><div className="eyebrow"><span className="tiny-sparkle">✳</span> THE COMMUNITY BOARD</div><h1>다정한 마음이<br /><em>여기 모였어요.</em></h1><p>서로의 하루에 살며시 놓고 간 인사들</p></div><button className="primary-button board-write-button" onClick={() => setScreen('write')}>나도 한 장 남기기 <ArrowIcon /></button></div>
      <div className="board-toolbar"><div><span className="board-total">{entries.length}</span><span className="board-caption">개의 작은 인사</span></div><div className="board-tools"><span className={`live-status compact ${connection}`}><i />{connection === 'online' ? '실시간 반영 중' : connection === 'offline' ? '연결 끊김' : '연결 중'}</span><select aria-label="정렬 기준" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')}><option value="newest">최신순</option><option value="oldest">오래된 순</option></select></div></div>
      {loading && entries.length === 0 ? <div className="empty-board"><div className="empty-icon"><span className="spinner dark" /></div><h2>다정한 마음을 불러오는 중</h2><p>잠시만 기다려주세요.</p></div> : entries.length === 0 ? <div className="empty-board"><div className="empty-icon">✿</div><h2>아직 첫 번째 인사가 없어요</h2><p>당신의 방명록이 이 보드의 첫 포스트잇이 될 수 있어요.</p><button className="text-link" onClick={() => setScreen('write')}>첫 인사 남기기 <ArrowIcon /></button></div> : <div className="sticky-board">{sortedEntries.map((entry, index) => {
        const image = mediaUrl(entry.media_path)
        return <button key={entry.id} className={`sticky-card sticky-color-${index % colors.length}`} style={{ '--card-tilt': `${[-2, 1.5, -1, 2, -1.5, 1][index % 6]}deg`, '--card-color': colors[index % colors.length] } as React.CSSProperties} onClick={() => setSelected(entry)} aria-label={`${entry.author ?? '익명'}의 방명록 열기`}>
          <span className="card-pin" />{image && <img className="sticky-image" src={image} alt={entry.media_kind === 'drawing' ? '작성자가 그린 그림' : '작성자가 첨부한 사진'} />}
          <span className="sticky-message">{entry.content || (entry.media_kind === 'drawing' ? '마음을 담아 그렸어요.' : '사진으로 남긴 순간')}</span><span className="sticky-author">— {entry.author || '익명'}</span><span className="sticky-time">{formatDate(entry.created_at)}</span><span className="sticky-open">↗</span>
        </button>
      })}</div>}
      <footer className="page-footer board-footer"><span>MADE OF LITTLE MOMENTS</span><span>우리의 이야기는 계속 이어져요 <i>✳</i></span></footer>
    </section>}

    {selected && <div className="detail-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
      <div className="detail-header"><span className="eyebrow">A LITTLE NOTE</span><button className="icon-button" onClick={() => setSelected(null)} aria-label="상세 화면 닫기"><CloseIcon /></button></div>
      <div className="detail-scroll"><article className="detail-note"><div className="detail-date">{formatDate(selected.created_at)}</div><h2 id="detail-title">{selected.author || '익명'}의 방명록</h2>{currentMedia && <img className="detail-image" src={currentMedia} alt={selected.media_kind === 'drawing' ? '방명록에 포함된 그림' : '방명록에 첨부된 사진'} />}<p className="detail-message">{selected.content || '그림과 사진으로 마음을 남겼어요.'}</p><div className="detail-signature">— {selected.author || '익명'} <span>✿</span></div></article>
        <div className="comment-section"><div className="comment-title"><div><span className="eyebrow">KIND WORDS</span><h3>다정한 댓글 <span>{comments.length}</span></h3></div><span className="comment-flower">✳</span></div>
          {comments.length === 0 ? <p className="no-comments">아직 댓글이 없어요. 첫 번째 다정한 말을 건네볼까요?</p> : <div className="comment-list">{comments.map((comment) => <article className="comment-item" key={comment.id}><div className="comment-avatar">{comment.author.slice(0, 1)}</div><div><div className="comment-meta"><b>{comment.author}</b><time>{formatDate(comment.created_at)}</time></div><p>{comment.content}</p></div></article>)}</div>}
          <form className="comment-form" onSubmit={submitComment}><input className="text-input comment-name" placeholder="이름" aria-label="댓글 작성자 이름" value={commentAuthor} maxLength={40} onChange={(event) => setCommentAuthor(event.target.value)} /><div className="comment-compose"><input placeholder="따뜻한 댓글을 남겨주세요…" aria-label="댓글 내용" value={commentContent} maxLength={500} onChange={(event) => setCommentContent(event.target.value)} /><button aria-label="댓글 등록" disabled={commentSaving || !commentContent.trim()}>{commentSaving ? <span className="spinner" /> : <SendIcon />}</button></div></form>
        </div>
      </div>
    </section></div>}

    {showCanvas && <CanvasPad onDone={acceptDrawing} onCancel={() => setShowCanvas(false)} />}
    {toast && <div className={`toast ${toast.kind}`} role="status">{toast.kind === 'success' ? '✿' : toast.kind === 'error' ? '!' : '✳'} {toast.message}</div>}
  </main>
}

export default App
