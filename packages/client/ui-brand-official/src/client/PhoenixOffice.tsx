import { useCallback, useEffect, useState } from 'react'
import css from './PhoenixOffice.module.css'

export function PhoenixOfficeIcon({ size }: { size: number }) {
  return <span aria-hidden="true" style={{ fontSize: size * .83, lineHeight: 1 }}>▦</span>
}

type Bot = {
  id: string
  sessionId?: string
  name: string
  role: string
  instructions?: string
  model?: string
  waiting?: boolean
  blocked?: unknown
  preview?: string
}
type Model = { ref: string; name?: string; label?: string; needsKey?: boolean }
type OfficeState = {
  bots: Bot[]
  mainBotIds: string[]
  models: Model[]
  defaultModel: string | null
  work?: { bots?: Record<string, unknown> }
  readOnly?: string | null
}
type BotReply<T> = { ok: true; value: T } | { ok: false; error?: { message?: string } }

async function botRequest<T>(endpoint: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('api/bot', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
  })
  if (!response.ok) throw new Error(response.status === 404 ? '办公室服务尚未启用' : `办公室服务暂时不可用 (${response.status})`)
  const reply = await response.json() as BotReply<T>
  if (!reply.ok) throw new Error(reply.error?.message ?? '办公室请求失败')
  return reply.value
}

function statusFor(bot: Bot, state: OfficeState | null): { label: string; busy: boolean } {
  if (bot.blocked) return { label: '需要处理', busy: false }
  if (bot.waiting) return { label: '等待模型', busy: false }
  if (state?.work?.bots?.[bot.id]) return { label: '工作中', busy: true }
  return { label: '待命', busy: false }
}

function initials(name: string): string {
  return Array.from(name.trim()).slice(0, 2).join('') || 'AI'
}

/** Phoenix's office reads and updates the existing durable employee roster. */
export function PhoenixOffice({ onHome, onOpenEmployee }: { onHome: () => void; onOpenEmployee: (sessionId: string) => void }) {
  const [state, setState] = useState<OfficeState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Bot | 'new' | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [instructions, setInstructions] = useState('')
  const [model, setModel] = useState('')

  const refresh = useCallback(async () => {
    try {
      const next = await botRequest<OfficeState>('state', { locale: navigator.language })
      setState(next)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取员工')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const openEditor = (bot: Bot | 'new') => {
    setEditing(bot)
    setName(bot === 'new' ? '' : bot.name)
    setRole(bot === 'new' ? '' : bot.role)
    setInstructions(bot === 'new' ? '' : bot.instructions ?? '')
    setModel(bot === 'new' ? state?.defaultModel ?? '' : bot.model ?? '')
    setError(null)
  }

  const save = async () => {
    if (!editing || !name.trim() || !role.trim()) return
    setBusy(true)
    setError(null)
    try {
      const payload = { name: name.trim(), role: role.trim(), instructions: instructions.trim(), ...(model ? { model } : {}) }
      if (editing === 'new') await botRequest('create-bot', payload)
      else await botRequest('update-bot', { id: editing.id, ...payload })
      setEditing(null)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存员工失败')
    } finally {
      setBusy(false)
    }
  }

  const staff = state?.bots.filter(bot => !state.mainBotIds.includes(bot.id)) ?? []
  const working = staff.filter(bot => statusFor(bot, state).busy).length
  const selectedSessionId = editing === 'new' ? undefined : editing?.sessionId

  return <main className={css.page}>
    <header className={css.header}>
      <div className={css.heading}>
        <button type="button" className={css.back} onClick={onHome} aria-label="返回主页">←</button>
        <div><span className={css.eyebrow}>PHOENIX · WORKSPACE</span><h1>AI 办公室</h1></div>
      </div>
      <div className={css.headerActions}>
        <span className={css.live}><i />{working} 位工作中 · {staff.length} 位员工</span>
        <button type="button" className={css.primary} onClick={() => openEditor('new')} disabled={!state || !!state.readOnly}>＋ 创建员工</button>
      </div>
    </header>

    <div className={css.scroll}>
      <section className={css.intro}>
        <div><span className={css.introTag}>你的智能团队</span><h2>让每个想法，<br /><em>都有专属搭档。</em></h2>
          <p>为员工设定姓名、职责、工作指令和模型。工位会显示真实工作状态，对话与记录会自动保存。</p>
        </div>
        <div className={css.introArt} aria-hidden="true"><span className={css.sun}>✦</span><span className={css.artDesk}>▰</span><span className={css.artPerson}>●</span><span className={css.artBubble}>✧</span></div>
      </section>

      <div className={css.sectionTitle}><div><span className={css.eyebrow}>FLOOR 01</span><h2>员工工位</h2></div><span>点击工位编辑员工资料</span></div>
      {error && <div className={css.error} role="alert">{error}</div>}
      {state === null && !error && <p className={css.loading}>正在连接办公室…</p>}
      <div className={css.floor}>
        {staff.map((bot, index) => {
          const status = statusFor(bot, state)
          return <button type="button" className={css.station} key={bot.id} onClick={() => openEditor(bot)}>
            <span className={css.stationNumber}>DESK {String(index + 1).padStart(2, '0')}</span>
            <span className={css.deskScene}>
              <span className={css.chair} /><span className={css.avatar}>{initials(bot.name)}</span>
              <span className={css.monitor}>▣</span><span className={css.table} />
            </span>
            <span className={css.stationInfo}><span><strong>{bot.name}</strong><small>{bot.role || '未设置职责'}</small></span><span className={status.busy ? css.statusBusy : css.status}><i />{status.label}</span></span>
          </button>
        })}
        <button type="button" className={css.addStation} onClick={() => openEditor('new')} disabled={!state || !!state.readOnly}>
          <span className={css.addIcon}>＋</span><strong>添加新员工</strong><small>设置职责，加入办公室</small>
        </button>
      </div>
      {staff.length === 0 && state && <p className={css.empty}>办公室还没有员工。创建第一位员工，工位就会出现在这里。</p>}
    </div>

    {editing && <div className={css.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) setEditing(null)
    }}>
      <section className={css.dialog} role="dialog" aria-modal="true" aria-label={editing === 'new' ? '创建员工' : '编辑员工'}>
        <div className={css.dialogHead}><div><span className={css.eyebrow}>TEAM MEMBER</span><h2>{editing === 'new' ? '创建员工' : '员工资料'}</h2></div><button type="button" className={css.close} onClick={() => setEditing(null)} disabled={busy} aria-label="关闭">×</button></div>
        <label>姓名<input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="例如：小羽" autoFocus /></label>
        <label>职责<input value={role} onChange={event => setRole(event.target.value)} maxLength={24} placeholder="例如：研究助理" /></label>
        <label>工作指令<textarea value={instructions} onChange={event => setInstructions(event.target.value)} rows={5} placeholder="说明这位员工负责什么、怎样工作…" /></label>
        <label>模型<select value={model} onChange={event => setModel(event.target.value)}><option value="">使用默认模型</option>{state?.models.map(item => <option key={item.ref} value={item.ref}>{item.label ?? item.name ?? item.ref}{item.needsKey ? ' · 需要凭据' : ''}</option>)}</select></label>
        <p className={css.hint}>沿用现有模型与凭据。新员工创建后可能使用所选模型发送一次问候，产生相应模型用量。</p>
        {error && <p className={css.formError} role="alert">{error}</p>}
        <div className={css.dialogActions}>
          {selectedSessionId && <button type="button" className={css.secondary} onClick={() => {
            setEditing(null)
            onOpenEmployee(selectedSessionId)
          }}>开始对话 ↗</button>}
          <button type="button" className={css.primary} onClick={() => { void save() }} disabled={busy || !name.trim() || !role.trim()}>
            {busy ? '保存中…' : editing === 'new' ? '创建员工' : '保存资料'}
          </button>
        </div>
      </section>
    </div>}
  </main>
}
