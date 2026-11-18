import { useCallback, useEffect, useMemo, useState } from 'react'
import css from './PhoenixOffice.module.css'
import { OfficeScene } from './office/OfficeScene.tsx'
import { officePeople, type OfficeBot as Bot, type OfficeState } from './office/model.ts'

export function PhoenixOfficeIcon({ size }: { size: number }) {
  return <span aria-hidden="true" style={{ fontSize: size * .83, lineHeight: 1 }}>▦</span>
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

/** Phoenix's office reads and updates the existing durable employee roster. */
export function PhoenixOffice({ onHome, onOpenEmployee }: { onHome: () => void; onOpenEmployee: (sessionId: string) => void }) {
  const [state, setState] = useState<OfficeState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Bot | 'new' | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [instructions, setInstructions] = useState('')
  const [model, setModel] = useState('')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [job, setJob] = useState('')
  const [floor, setFloor] = useState(0)
  const [focused, setFocused] = useState(false)
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [roomId, setRoomId] = useState('')
  const [hall, setHall] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const next = await botRequest<OfficeState>('state', { locale: navigator.language })
      setState(next)
      setConnectionError(null)
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : '无法读取员工')
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

  const staff = state?.bots ?? []
  const people = useMemo(() => officePeople(state, !!connectionError, roomId), [state, connectionError, roomId])
  const selectedBot = staff.find(bot => bot.id === selected)
  const floorCount = Math.max(1, ...people.map(p => p.floor + 1))
  const visibleFloor = Math.min(floor, floorCount - 1)
  const visiblePeople = useMemo(() => people.filter(p => p.floor === visibleFloor), [people, visibleFloor])
  const choices = staff.filter(bot => (!job || bot.role === job) && `${bot.name} ${bot.role}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const selectEmployee = (id: string) => {
    const person = people.find(p => p.id === id)
    if (!person) return
    setSelected(id)
    setFloor(person.floor)
    setFocused(true)
  }
  const activeRoom = state?.rooms?.find(room => room.id === roomId)
  const working = staff.filter(bot => statusFor(bot, state).busy).length
  const selectedSessionId = editing === 'new' ? undefined : editing?.sessionId

  return <main className={css.page}>
    <header className={css.header} data-window-drag>
      <div className={css.heading}>
        <button type="button" className={css.back} onClick={onHome} aria-label="返回主页">←</button>
        <div><span className={css.eyebrow}>PHOENIX · WORKSPACE</span><h1>AI 办公室</h1></div>
      </div>
      <div className={css.headerActions}>
        <span className={css.live}><i />{connectionError ? '状态未知' : `${working} 位工作中`} · {staff.length} 位员工</span>
        <button type="button" className={css.primary} onClick={() => openEditor('new')} disabled={!state || !!state.readOnly}>＋ 创建员工</button>
      </div>
    </header>

    <div className={css.scroll}>
      <section className={css.finder} aria-label="查找员工">
        <label>查找员工<input aria-label="搜索姓名或岗位" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索姓名或岗位" /></label>
        <label>岗位筛选<select aria-label="岗位筛选" value={job} onChange={event => setJob(event.target.value)}><option value="">全部岗位</option>{[...new Set(staff.map(bot => bot.role))].map(role => <option key={role} value={role}>{role || '未设置岗位'}</option>)}</select></label>
        <label>员工视角<select aria-label="员工视角" value={selectedBot && choices.includes(selectedBot) ? selected : ''} onChange={event => selectEmployee(event.target.value)}><option value="">选择员工 · 姓名与岗位</option>{choices.map(bot => <option key={bot.id} value={bot.id}>{bot.name} · {bot.role || '未设置岗位'}</option>)}</select></label>
        <div className={css.viewActions}>
          <button type="button" className={css.secondary} onClick={() => setFocused(!focused)} disabled={!selectedBot}>{focused ? '办公室总览' : '员工特写'}</button>
          <button type="button" className={css.secondary} onClick={() => setPlaying(!playing)}>{playing ? '暂停动画' : '播放动画'}</button>
        </div>
      </section>
      {search && choices.length === 0 && <p className={css.empty}>没有找到匹配的员工，试试姓名或其他岗位</p>}
      <div className={css.sceneToolbar}>
        <label>楼层 <select aria-label="办公室楼层" value={visibleFloor} onChange={(event) => { setFloor(Number(event.target.value)); setFocused(false) }}>{Array.from({ length: floorCount }, (_,i) => <option key={i} value={i}>{i+1} 层</option>)}</select></label>
        <label>群聊 <select aria-label="查看群聊" value={roomId} onChange={(event) => { setRoomId(event.target.value); setHall(false); setFocused(false) }}><option value="">个人工位</option>{state?.rooms?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        {activeRoom && <><button className={css.secondary} onClick={() => setHall(!hall)}>{hall ? '查看会议室' : '查看大厅席位'}</button><button className={css.secondary} disabled={!activeRoom.sessionId} onClick={() => { if (activeRoom.sessionId) onOpenEmployee(activeRoom.sessionId) }}>打开群聊 ↗</button></>}
      </div>
      {connectionError && <div className={css.error} role="alert">{connectionError} · 画面状态暂不可确认 <button onClick={() => { void refresh() }}>重试</button></div>}
      <div className={css.employeeBar}>
        {selectedBot ? <><div><strong>{selectedBot.name}</strong><span>{selectedBot.role || '未设置岗位'} · {connectionError ? '状态未知' : statusFor(selectedBot, state).label}</span></div><button className={css.secondary} onClick={() => openEditor(selectedBot)}>员工资料</button><button className={css.primary} disabled={!selectedBot.sessionId} onClick={() => { if (selectedBot.sessionId) onOpenEmployee(selectedBot.sessionId) }}>开始对话 ↗</button></> : <p>从上方选择员工，或点击办公室中的姓名牌查看资料与会话</p>}
      </div>
      <section className={css.scene} aria-label="可视化办公室">
        <OfficeScene people={visiblePeople} selected={selected} focused={focused} playing={playing} floor={visibleFloor} hall={hall} onOverview={() => setFocused(false)} onSelect={(id) => { selectEmployee(id); const bot = staff.find(item => item.id === id); if (bot) openEditor(bot) }} onCreate={() => { if (state && !state.readOnly) openEditor('new') }} />
      </section>
      <p className={css.hint}>姓名与岗位来自员工资料。工位按岗位分区，动作是状态示意；喝水仅在待命时出现。大厅席位用于查看群成员，不代表任务已交付。</p>
      {state === null && !connectionError && <p className={css.loading}>正在连接办公室…</p>}
      {staff.length === 0 && state && <p className={css.empty}>办公室还没有员工。点击人事部或上方“创建员工”开始。</p>}
    </div>

    {editing && <div className={css.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) setEditing(null)
    }}>
      <section className={css.dialog} role="dialog" aria-modal="true" aria-label={editing === 'new' ? '创建员工' : '编辑员工'}>
        <div className={css.dialogHead}><div><span className={css.eyebrow}>TEAM MEMBER</span><h2>{editing === 'new' ? '创建员工' : '员工资料'}</h2></div><button type="button" className={css.close} onClick={() => setEditing(null)} disabled={busy} aria-label="关闭">×</button></div>
        <label>姓名<input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="例如：小羽" autoFocus /></label>
        <label>岗位职称<input value={role} onChange={event => setRole(event.target.value)} maxLength={24} placeholder="例如：研究助理" /></label>
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
