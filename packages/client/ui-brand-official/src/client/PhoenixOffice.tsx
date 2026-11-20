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
  if (state?.work?.bots?.[bot.id] || Object.values(state?.work?.rooms ?? {}).some(members => members.some(member => member.botId === bot.id))) return { label: '工作中', busy: true }
  return { label: '待命', busy: false }
}

/** Phoenix's visual office. Complete employee and group management stays in one native data surface. */
export function PhoenixOffice({ onHome, onOpenNative }: { onHome: () => void; onOpenNative: (sessionId?: string) => void }) {
  const [state, setState] = useState<OfficeState | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
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

  const staff = state?.bots ?? []
  const nativeHome = staff.find(bot => state?.mainBotIds.includes(bot.id))?.sessionId ?? staff.find(bot => bot.sessionId)?.sessionId
  const people = useMemo(() => officePeople(state, !!connectionError, roomId), [state, connectionError, roomId])
  const selectedBot = staff.find(bot => bot.id === selected)
  const floorCount = Math.max(1, ...people.map(person => person.floor + 1))
  const visibleFloor = Math.min(floor, floorCount - 1)
  const visiblePeople = useMemo(() => people.filter(person => person.floor === visibleFloor
    && (!person.activeRoomId || person.activeRoomId === roomId)), [people, visibleFloor, roomId])
  const choices = staff.filter(bot => (!job || bot.role === job) && `${bot.name} ${bot.role}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const selectEmployee = (id: string) => {
    const person = people.find(item => item.id === id)
    if (!person) return
    setSelected(id)
    setFloor(person.floor)
    setFocused(true)
  }
  const activeRoom = state?.rooms?.find(room => room.id === roomId)
  const elsewhere = people.filter(person => person.activeRoomId && person.activeRoomId !== roomId).length
  const working = staff.filter(bot => statusFor(bot, state).busy).length

  return <main className={css.page}>
    <header className={css.header} data-window-drag>
      <div className={css.heading}>
        <button type="button" className={css.back} onClick={onHome} aria-label="返回主页">←</button>
        <div><span className={css.eyebrow}>PHOENIX · WORKSPACE</span><h1>AI 办公室</h1></div>
      </div>
      <div className={css.headerActions}>
        <span className={css.live}><i />{connectionError ? '状态未知' : `${working} 位工作中`} · {staff.length} 位员工</span>
        <button type="button" className={css.primary} onClick={() => onOpenNative(nativeHome)} disabled={!state}>人事部 · 员工管理 ↗</button>
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
        <label>楼层 <select aria-label="办公室楼层" value={visibleFloor} onChange={(event) => { setFloor(Number(event.target.value)); setFocused(false) }}>{Array.from({ length: floorCount }, (_, index) => <option key={index} value={index}>{index + 1} 层</option>)}</select></label>
        <label>群聊 <select aria-label="查看群聊" value={roomId} onChange={(event) => { setRoomId(event.target.value); setHall(false); setFocused(false) }}><option value="">个人工位</option>{state?.rooms?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        <button type="button" className={css.secondary} onClick={() => onOpenNative(nativeHome)} disabled={!state}>群聊与协作管理 ↗</button>
        {activeRoom && <><button className={css.secondary} onClick={() => setHall(!hall)}>{hall ? '查看会议室' : '查看大厅席位'}</button><button className={css.secondary} onClick={() => onOpenNative(activeRoom.sessionId ?? nativeHome)}>打开群聊 ↗</button></>}
        {elsewhere > 0 && <span className={css.live}>{elsewhere} 位员工在其他会议室</span>}
      </div>
      {connectionError && <div className={css.error} role="alert">{connectionError} · 画面状态暂不可确认 <button onClick={() => { void refresh() }}>重试</button></div>}
      <div className={css.employeeBar}>
        {selectedBot ? <><div><strong>{selectedBot.name}</strong><span>{selectedBot.role || '未设置岗位'} · {connectionError ? '状态未知' : statusFor(selectedBot, state).label}</span></div><button className={css.primary} disabled={!selectedBot.sessionId} onClick={() => onOpenNative(selectedBot.sessionId)}>员工资料与会话 ↗</button></> : <p>从上方选择员工，或点击办公室中的姓名牌查看资料与会话</p>}
      </div>
      <section className={css.scene} aria-label="可视化办公室">
        <OfficeScene
          people={visiblePeople}
          selected={selected}
          focused={focused}
          playing={playing}
          floor={visibleFloor}
          hall={hall}
          onOverview={() => setFocused(false)}
          onSelect={(id) => {
            selectEmployee(id)
            const bot = staff.find(item => item.id === id)
            if (bot?.sessionId) onOpenNative(bot.sessionId)
          }}
          onCreate={() => onOpenNative(nativeHome)}
        />
      </section>
      <p className={css.hint}>姓名与岗位来自 Phoenix 员工资料。工位按岗位分区，动作是实时状态示意；员工、群聊、模型、文件夹和协作设置使用同一份原生数据。</p>
      {state === null && !connectionError && <p className={css.loading}>正在连接办公室…</p>}
      {staff.length === 0 && state && <p className={css.empty}>办公室还没有员工。点击人事部开始建立 Phoenix 团队。</p>}
    </div>
  </main>
}
