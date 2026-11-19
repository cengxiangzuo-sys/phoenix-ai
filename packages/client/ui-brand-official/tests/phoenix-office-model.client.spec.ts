import { describe, expect, it } from 'vitest'
import { officePeople, type OfficeState } from '../src/client/office/model.ts'

const state: OfficeState = {
  bots: [{ id: 'lead', name: '小橙', role: '总指挥' }, { id: 'dev', name: '小码', role: '开发工程师' }, { id: 'writer', name: '小文', role: '内容创作' }],
  mainBotIds: [], models: [], defaultModel: null,
  rooms: [{ id: 'team', name: '项目', members: ['lead', 'dev', 'writer'] }],
  work: { bots: { dev: { tool: 'shell' }, writer: { roomId: 'team' } }, rooms: { team: [{ botId: 'writer', speaking: true }] } },
}
describe('Office projection', () => {
  it('retains exact names and job titles and locates the commander without changing data', () => {
    const before = JSON.stringify(state)
    const people = officePeople(state, false, '')
    expect(people.map(p => [p.name, p.role, p.zone, p.main])).toEqual([['小橙', '总指挥', 3, true], ['小码', '开发工程师', 2, false], ['小文', '内容创作', 1, false]])
    expect(JSON.stringify(state)).toBe(before)
  })
  it('keeps personal work at its own desk while marking the actual group speaker', () => {
    const people = officePeople(state, false, 'team')
    expect(people.map(p => [p.status, p.meeting, p.speaking])).toEqual([['idle', true, false], ['working', false, false], ['working', true, true]])
    expect(officePeople(state, true, '').every(p => p.status === 'unknown')).toBe(true)
  })
  it('allocates another floor instead of losing employees when a department fills', () => {
    const people = officePeople({ ...state, bots: Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: '同名', role: '设计师' })) }, false, '')
    expect(people).toHaveLength(10)
    expect(people.map(p => p.floor)).toEqual([0,0,0,0,1,1,1,1,2,2])
    expect(new Set(people.map(p => `${p.floor}:${p.station}`)).size).toBe(10)
  })
  it('places an employee in only the active speaking room when two groups overlap', () => {
    const simultaneous: OfficeState = { ...state,
      rooms: [
        { id: 'alpha', name: '策划会', members: ['lead', 'writer'] },
        { id: 'beta', name: '资料会', members: ['lead', 'writer'] },
      ],
      work: { bots: { writer: { roomId: 'alpha' } }, rooms: {
        alpha: [{ botId: 'writer', speaking: false }],
        beta: [{ botId: 'writer', speaking: true }],
      } },
    }
    const inAlpha = officePeople(simultaneous, false, 'alpha').find(person => person.id === 'writer')!
    const inBeta = officePeople(simultaneous, false, 'beta').find(person => person.id === 'writer')!
    expect(inAlpha.activeRoomId).toBe('beta')
    expect(inAlpha.status).toBe('working')
    expect(inAlpha.meeting).toBe(false)
    expect(inBeta.meeting).toBe(true)
    expect(inBeta.speaking).toBe(true)
  })
})
