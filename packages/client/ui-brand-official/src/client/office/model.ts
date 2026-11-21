/** Native employee records consumed by the office presentation. */
export type OfficeBot = {
  id: string
  sessionId?: string
  name: string
  role: string
  instructions?: string
  model?: string
  workDir?: string
  waiting?: boolean
  blocked?: unknown
  preview?: string
}
/** Existing employee service response
  no second roster or credential store. */
export type OfficeState = {
  bots: OfficeBot[]
  mainBotIds: string[]
  models: Array<{ ref: string
    name?: string
    label?: string
    needsKey?: boolean }>
  defaultModel: string | null
  permissions?: { options: Array<{ value: string; name: string }>; defaultPreset?: string } | null
  readOnly?: string | null
  rooms?: Array<{ id: string
    name: string
    members: string[]
    admin?: string | null
    mode?: 'admin' | 'everyone'
    notice?: string
    permission?: string
    sessionId?: string }>
  work?: { bots?: Record<string, { tool?: string
    roomId?: string
    switching?: boolean
    folder?: boolean }>
  rooms?: Record<string, Array<{ botId?: string
    speaking?: boolean
    tool?: string
    switching?: boolean
    folder?: boolean }>> }
}
/** Display assignment only
  never changes capabilities, durable roles, or model routing. */
export type OfficePerson = {
  id: string
  name: string
  role: string
  zone: number
  station: number
  floor: number
  main: boolean
  type: string
  status: 'blocked' | 'waiting' | 'working' | 'idle' | 'unknown'
  meeting: boolean
  speaking: boolean
  visualType: string
  activity: string
  activeRoomId?: string
}

function workActivity(tool: string | undefined, switching?: boolean, folder?: boolean): { visualType: string; activity: string } {
  if (switching) return { visualType: 'read', activity: folder ? '正在切换资料文件夹' : '正在切换任务' }
  if (!tool) return { visualType: 'think', activity: '正在思考与回复' }
  if (/browser|web|search|fetch/i.test(tool)) return { visualType: 'browser', activity: '正在浏览与检索' }
  if (/video|movie|render/i.test(tool)) return { visualType: 'video', activity: '正在处理视频' }
  if (/image|draw|canvas/i.test(tool)) return { visualType: 'draw', activity: '正在处理图像' }
  if (/read|file|folder|document|memory/i.test(tool)) return { visualType: 'read', activity: '正在查阅资料' }
  if (/write|edit|patch/i.test(tool)) return { visualType: 'type', activity: '正在编写内容' }
  if (/test|check|review|verify/i.test(tool)) return { visualType: 'check', activity: '正在检查结果' }
  if (/message|group|bot|subagent|handoff/i.test(tool)) return { visualType: 'call', activity: '正在协调员工' }
  if (/shell|terminal|bash|powershell|python|code/i.test(tool)) return { visualType: 'code', activity: '正在编写或运行代码' }
  return { visualType: 'think', activity: '正在执行任务' }
}

function roleStyle(role: string): { zone: 0 | 1 | 2 | 3
  type: string } {
  if (/总指挥|总监|统筹|commander|director/i.test(role)) return { zone: 3, type: 'plan' }
  if (/研究|分析|策略|调研|research|analyst|strategy/i.test(role)) return { zone: 0, type: 'read' }
  if (/设计|绘|视觉|design|artist/i.test(role)) return { zone: 1, type: 'draw' }
  if (/文案|写作|内容|writer|content/i.test(role)) return { zone: 1, type: 'type' }
  if (/测试|质量|审核|quality|test|review/i.test(role)) return { zone: 2, type: 'check' }
  if (/开发|工程|编程|代码|developer|engineer|code/i.test(role)) return { zone: 2, type: 'code' }
  return { zone: 3, type: 'call' }
}

/**
 * Derive scene data without modifying native records.
 * @param state Native response.
 * @param stale Last refresh failed.
 * @param roomId Group currently viewed.
 * @returns Employees with paginated stations and authoritative task states.
 */
export function officePeople(state: OfficeState | null, stale: boolean, roomId: string): OfficePerson[] {
  if (!state) return []
  const counts: [number, number, number, number] = [0, 0, 0, 0]
  let commander = false
  const room = state.rooms?.find(room => room.id === roomId)
  return state.bots.map((bot) => {
    const style = roleStyle(bot.role)
    const main = !commander && (style.type === 'plan' || state.mainBotIds.includes(bot.id))
    if (main) commander = true
    const index = main ? 0 : counts[style.zone]++
    const work = state.work?.bots?.[bot.id]
    const activeRoomId = Object.entries(state.work?.rooms ?? {})
      .filter(([, members]) => members.some(member => member.botId === bot.id))
      .sort(([leftId, left], [rightId, right]) => {
        const speaking = (members: typeof left) => Number(members.some(member => member.botId === bot.id && member.speaking))
        return speaking(right) - speaking(left) || leftId.localeCompare(rightId)
      })[0]?.[0] ?? work?.roomId
    const status = stale ? 'unknown' : bot.blocked ? 'blocked' : bot.waiting ? 'waiting' : work || activeRoomId ? 'working' : 'idle'
    // One employee has one physical location even when several rooms include them.
    const meeting = !!room?.members.includes(bot.id) && (activeRoomId === roomId || activeRoomId === undefined && !work)
    const roomWork = state.work?.rooms?.[roomId]?.find(item => item.botId === bot.id)
    const speaking = !!roomWork?.speaking
    const activity = stale ? { visualType: style.type, activity: '状态暂不可确认' }
      : bot.blocked ? { visualType: 'check', activity: '需要处理' }
        : bot.waiting ? { visualType: 'think', activity: '等待模型回复' }
          : meeting ? speaking ? { visualType: 'call', activity: '正在会议中发言' }
            : roomWork ? workActivity(roomWork.tool, roomWork.switching, roomWork.folder)
              : { visualType: 'call', activity: '在会议室待命' }
            : work ? workActivity(work.tool, work.switching, work.folder)
              : { visualType: style.type, activity: '待命' }
    return { id: bot.id, name: bot.name, role: bot.role || '未设置岗位', ...style, main,
      floor: main ? 0 : Math.floor(index / 4), station: style.zone * 4 + index % 4,
      status, meeting, speaking, ...activity, ...(activeRoomId ? { activeRoomId } : {}) }
  })
}

/** Show all seated group members even when their regular desks are on another floor. */
export function visibleOfficePeople(people: OfficePerson[], floor: number, roomId: string): OfficePerson[] {
  const available = people.filter(person => !person.activeRoomId || person.activeRoomId === roomId)
  const meeting = roomId ? available.filter(person => person.meeting).slice(0, 16) : []
  const floorStaff = available.filter(person => person.floor === floor && !meeting.includes(person))
  return [...meeting, ...floorStaff].slice(0, 17)
}
