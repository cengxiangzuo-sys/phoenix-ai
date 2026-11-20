// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { PhoenixOffice } from '../src/client/PhoenixOffice.tsx'
import { phoenixTerm } from '../src/client/NativeBotSurface.tsx'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function installRoster(roster: Record<string, unknown>, calls: string[]): void {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    const request = JSON.parse(String(options.body)) as { endpoint: string }
    calls.push(request.endpoint)
    return { ok: true, json: async () => ({ ok: true, value: roster }) }
  }))
}

describe('Phoenix office native team integration', () => {
  it('opens employee management in the main employee native session without duplicating writes', async () => {
    const roster = {
      bots: [
        { id: 'main', sessionId: 'main-session', name: '小羽', role: '总指挥' },
        { id: 'research', sessionId: 'research-session', name: '小火', role: '研究助理' },
      ],
      mainBotIds: ['main'], rooms: [], models: [], defaultModel: null, work: { bots: {} }, readOnly: null,
    }
    const calls: string[] = []
    installRoster(roster, calls)
    const onOpenNative = vi.fn()
    const view = render(<PhoenixOffice onHome={() => {}} onOpenNative={onOpenNative} />)

    await waitFor(() => expect(view.getAllByText('小羽 · 总指挥').length).toBeGreaterThan(0))
    expect(view.getByRole('heading', { name: 'AI 办公室' }).closest('header')?.hasAttribute('data-window-drag')).toBe(true)
    fireEvent.click(view.getByRole('button', { name: '员工列表与创建 ↗' }))
    expect(onOpenNative).toHaveBeenCalledWith('main-session')
    expect(calls).toEqual(['state'])
  })

  it('finds an employee, opens its complete profile conversation and keeps floor navigation', async () => {
    const roster = {
      bots: Array.from({ length: 6 }, (_, index) => ({ id: `bot-${index}`, sessionId: `session-${index}`, name: `员工${index}`, role: '研究助理' })),
      mainBotIds: [], rooms: [], models: [], defaultModel: null, work: { bots: {} },
    }
    const calls: string[] = []
    installRoster(roster, calls)
    const onOpenNative = vi.fn()
    const view = render(<PhoenixOffice onHome={() => {}} onOpenNative={onOpenNative} />)

    await waitFor(() => expect(view.getByRole('option', { name: '员工5 · 研究助理' })).toBeTruthy())
    fireEvent.change(view.getByLabelText('搜索姓名或岗位'), { target: { value: '员工5' } })
    expect(view.queryByRole('option', { name: '员工0 · 研究助理' })).toBeNull()
    fireEvent.change(view.getByLabelText('员工视角'), { target: { value: 'bot-5' } })
    expect((view.getByLabelText('办公室楼层') as HTMLSelectElement).value).toBe('1')
    fireEvent.click(view.getByRole('button', { name: '开始对话 →' }))
    expect(onOpenNative).toHaveBeenCalledWith('session-5')

    const frame = view.getByTitle('AI 办公室三维场景') as HTMLIFrameElement
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: { channel: 'phoenix-office', action: 'select', id: 'bot-5' } }))
    expect(onOpenNative).toHaveBeenLastCalledWith('session-5')
    expect(calls).toEqual(['state'])
  })

  it('opens each native group session and never issues a duplicate chat request', async () => {
    const roster = {
      bots: [{ id: 'main', sessionId: 'main-session', name: '小羽', role: '总指挥' }],
      mainBotIds: ['main'],
      rooms: [
        { id: 'room-a', sessionId: 'room-a-session', name: '策划会', members: ['main'] },
        { id: 'room-b', sessionId: 'room-b-session', name: '资料会', members: ['main'] },
      ],
      models: [], defaultModel: null, work: { bots: {}, rooms: {} },
    }
    const calls: string[] = []
    installRoster(roster, calls)
    const onOpenNative = vi.fn()
    const view = render(<PhoenixOffice onHome={() => {}} onOpenNative={onOpenNative} />)

    await waitFor(() => expect(view.getByRole('option', { name: '策划会' })).toBeTruthy())
    fireEvent.change(view.getByLabelText('查看群聊'), { target: { value: 'room-a' } })
    fireEvent.click(view.getByRole('button', { name: '打开群聊 ↗' }))
    expect(onOpenNative).toHaveBeenLastCalledWith('room-a-session')
    fireEvent.change(view.getByLabelText('查看群聊'), { target: { value: 'room-b' } })
    fireEvent.click(view.getByRole('button', { name: '打开群聊 ↗' }))
    expect(onOpenNative).toHaveBeenLastCalledWith('room-b-session')
    fireEvent.click(view.getByRole('button', { name: '群聊与协作管理 ↗' }))
    expect(onOpenNative).toHaveBeenLastCalledWith('main-session')
    expect(calls).toEqual(['state'])
  })

  it('removes upstream product names from visible native-surface wording', () => {
    expect(phoenixTerm('DS Bot settings')).toBe('Phoenix AI settings')
    expect(phoenixTerm('Back to DS-Bot in DSH Desktop')).toBe('Back to Phoenix AI in Phoenix AI')
    expect(phoenixTerm('DeepSeek Harness')).toBe('Phoenix AI')
    expect(phoenixTerm('Bot 列表 · 主 Bot · 新建 Bot')).toBe('员工列表 · 总指挥 · 新建员工')
    expect(phoenixTerm('DS Bot 0.3.8 可以更新')).toBe('协作引擎 0.3.8 可以更新')
    expect(phoenixTerm('协调各 Bot 的工作，处理新建 Bot 的事情')).toBe('协调各员工的工作，处理新建员工的事情')
  })
})
