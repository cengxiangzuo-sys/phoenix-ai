import { describe, expect, it } from 'vitest'
import { expectsCoordinationReply } from '../src/index.ts'
import { PhoenixCoordinationGate } from '../src/phoenix-coordination.ts'

describe('Phoenix coordination gate', () => {
  it('distinguishes write-only group announcements from reply-bearing dispatches', () => {
    expect(expectsCoordinationReply('message_bot', { to: 'employee' })).toBe(true)
    expect(expectsCoordinationReply('post_to_group', { group: 'team', message: '公告' })).toBe(false)
    expect(expectsCoordinationReply('post_to_group', { group: 'team', message: '公告', report_back: false })).toBe(false)
    expect(expectsCoordinationReply('post_to_group', { group: 'team', message: '@员工 请回复', report_back: true })).toBe(true)
  })

  it('permits only one outstanding employee dispatch per agent', () => {
    const gate = new PhoenixCoordinationGate()
    expect(gate.reserve('phoenix', 'group:project', 'call-1')).toBe(true)
    expect(gate.reserve('phoenix', 'group:project', 'call-2')).toBe(false)
    expect(gate.reserve('another', 'group:project', 'call-3')).toBe(true)
    expect(gate.reserve('phoenix', 'direct:researcher', 'call-4')).toBe(true)
  })

  it('keeps a successful dispatch locked until a new inbox message is claimed', () => {
    const gate = new PhoenixCoordinationGate()
    gate.reserve('phoenix', 'group:project', 'call-1')
    gate.settle('phoenix', 'group:project', 'call-1', true)
    expect(gate.reserve('phoenix', 'group:project', 'call-2')).toBe(false)
    gate.acknowledge('phoenix')
    expect(gate.reserve('phoenix', 'group:project', 'call-2')).toBe(true)
  })

  it('releases a failed dispatch for a safe retry and ignores stale settlement', () => {
    const gate = new PhoenixCoordinationGate()
    gate.reserve('phoenix', 'group:project', 'call-1')
    gate.settle('phoenix', 'group:project', 'stale-call', false)
    expect(gate.reserve('phoenix', 'group:project', 'call-2')).toBe(false)
    gate.settle('phoenix', 'group:project', 'call-1', false)
    expect(gate.reserve('phoenix', 'group:project', 'call-2')).toBe(true)
  })
})
