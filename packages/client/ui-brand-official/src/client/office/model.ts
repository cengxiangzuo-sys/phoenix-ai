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
  readOnly?: string | null
  rooms?: Array<{ id: string
    name: string
    members: string[]
    sessionId?: string }>
  work?: { bots?: Record<string, { tool?: string
    roomId?: string }>
  rooms?: Record<string, Array<{ botId?: string
    speaking?: boolean }>> }
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
  activeRoomId?: string
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
    const speaking = !!state.work?.rooms?.[roomId]?.some(item => item.botId === bot.id && item.speaking)
    return { id: bot.id, name: bot.name, role: bot.role || '未设置岗位', ...style, main,
      floor: main ? 0 : Math.floor(index / 4), station: style.zone * 4 + index % 4,
      status, meeting, speaking, ...(activeRoomId ? { activeRoomId } : {}) }
  })
}
