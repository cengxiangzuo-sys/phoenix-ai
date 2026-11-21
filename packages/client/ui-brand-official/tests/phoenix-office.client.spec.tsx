// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { PhoenixOffice } from '../src/client/PhoenixOffice.tsx'
import { phoenixTerm } from '../src/client/NativeBotSurface.tsx'
import { zh } from '../src/client/office/locales.ts'

afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals() })

const t: TranslateNS<'phoenix.office'> = (key, params) => {
  const template = Object.hasOwn(zh, key) ? zh[key as keyof typeof zh] : key
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ''))
}

function installRoster(roster: Record<string, unknown>, calls: string[]): void {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    const request = JSON.parse(String(options.body)) as { endpoint: string }
    calls.push(request.endpoint)
    return { ok: true, json: async () => ({ ok: true, value: roster }) }
  }))
}

describe('Phoenix office native team integration', () => {
  it('opens the same native employee form from the toolbar and human resources without writing to the roster', async () => {
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
    const onCreateEmployee = vi.fn()
    const view = render(<PhoenixOffice t={t} onHome={() => {}} onOpenNative={onOpenNative} onCreateEmployee={onCreateEmployee} />)

    await waitFor(() => expect(view.getAllByText('小羽 · 总指挥').length).toBeGreaterThan(0))
    expect(view.getByRole('heading', { name: 'AI 办公室' }).closest('header')?.hasAttribute('data-window-drag')).toBe(true)
    fireEvent.click(view.getByRole('button', { name: '新建员工' }))
    expect(onCreateEmployee).toHaveBeenCalledOnce()
    const frame = view.getByTitle('AI 办公室三维场景') as HTMLIFrameElement
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: { channel: 'phoenix-office', action: 'create' } }))
    expect(onCreateEmployee).toHaveBeenCalledTimes(2)
    expect(onOpenNative).not.toHaveBeenCalled()
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
    const view = render(<PhoenixOffice t={t} onHome={() => {}} onOpenNative={onOpenNative} onCreateEmployee={vi.fn()} />)

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
    const view = render(<PhoenixOffice t={t} onHome={() => {}} onOpenNative={onOpenNative} onCreateEmployee={vi.fn()} />)

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

  it('restores the selected meeting after reopening and sends the scene its last frame once the roster is ready', async () => {
    installRoster({
      bots: [{ id: 'worker', sessionId: 'employee-session', name: '测试员工', role: '研究助理' }],
      mainBotIds: [], models: [], defaultModel: null,
      rooms: [{ id: 'meeting', name: '演示会议', members: ['worker'], sessionId: 'group-session' }],
    }, [])
    const office = () => <PhoenixOffice t={t} onHome={() => {}} onOpenNative={vi.fn()} onCreateEmployee={vi.fn()} />
    const first = render(office())
    await first.findByRole('option', { name: '演示会议' })
    fireEvent.change(first.getByLabelText('查看群聊'), { target: { value: 'meeting' } })
    const previousFrame = first.getByTitle('AI 办公室三维场景') as HTMLIFrameElement
    const checkpoint = { key: '[0,"meeting",false]', elapsed: 12,
      camera: { yaw: .9, pitch: .7, zoom: 1.5 }, people: [] }
    fireEvent(window, new MessageEvent('message', { source: previousFrame.contentWindow, origin: 'null',
      data: { channel: 'phoenix-office', action: 'checkpoint', frame: checkpoint } }))
    first.unmount()

    const reopened = render(office())
    await reopened.findByRole('option', { name: '演示会议' })
    expect((reopened.getByLabelText('查看群聊') as HTMLSelectElement).value).toBe('meeting')
    const frame = reopened.getByTitle('AI 办公室三维场景') as HTMLIFrameElement
    const publish = vi.spyOn(frame.contentWindow!, 'postMessage')
    fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, origin: 'null',
      data: { channel: 'phoenix-office', action: 'ready' } }))
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint, key: checkpoint.key, people: [expect.objectContaining({ id: 'worker', meeting: true })],
    }), '*')
  })

  it('removes upstream product names from visible native-surface wording', () => {
    expect(phoenixTerm('DS Bot settings')).toBe('Phoenix AI settings')
    expect(phoenixTerm('Back to DS-Bot in DSH Desktop')).toBe('Back to Phoenix AI in Phoenix AI')
    expect(phoenixTerm('DeepSeek Harness')).toBe('Phoenix AI')
    expect(phoenixTerm('Bot 列表 · 主 Bot · 新建 Bot')).toBe('员工列表 · 总指挥 · 新建员工')
    expect(phoenixTerm('DS Bot 0.3.8 可以更新')).toBe('协作引擎 0.3.8 可以更新')
    expect(phoenixTerm('协调各 Bot 的工作，处理新建 Bot 的事情')).toBe('协调各员工的工作，处理新建员工的事情')
  })

  it('protects the chief and removes a selected employee only after confirmed native deletion', async () => {
    const chief = { id: 'chief', sessionId: 'chief-session', name: '小羽', role: '总指挥' }
    const retired = { id: 'retired', sessionId: 'retired-session', name: '已作废-测试', role: '测试' }
    const roster = { bots: [chief, retired], mainBotIds: [chief.id], models: [], defaultModel: null }
    const updated = { ...roster, bots: [chief] }
    const writes: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      const request = JSON.parse(String(options.body)) as { endpoint: string; payload: unknown }
      if (request.endpoint === 'delete-bot') {
        writes.push(request.payload)
        if (writes.length === 1) return { ok: true, json: async () => ({ ok: false, error: { message: '团队暂时只读' } }) }
        return { ok: true, json: async () => ({ ok: true, value: updated }) }
      }
      return { ok: true, json: async () => ({ ok: true, value: writes.length < 2 ? roster : updated }) }
    }))
    const view = render(<PhoenixOffice t={t} onHome={() => {}} onOpenNative={vi.fn()} onCreateEmployee={vi.fn()} />)
    await view.findByRole('option', { name: '已作废-测试 · 测试' })
    fireEvent.change(view.getByLabelText('员工视角'), { target: { value: chief.id } })
    expect(view.queryByRole('button', { name: '删除员工' })).toBeNull()
    expect(view.getByText('总指挥不能直接删除。请先在员工管理中将总指挥交给其他员工。')).toBeTruthy()

    fireEvent.change(view.getByLabelText('员工视角'), { target: { value: retired.id } })
    fireEvent.click(view.getByRole('button', { name: '删除员工' }))
    const dialog = view.getByRole('dialog', { name: '删除「已作废-测试」？' })
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(writes).toEqual([])

    fireEvent.click(view.getByRole('button', { name: '删除员工' }))
    const confirmation = within(view.getByRole('dialog', { name: '删除「已作废-测试」？' }))
    fireEvent.click(confirmation.getByRole('button', { name: '删除员工' }))
    expect((await confirmation.findByRole('alert')).textContent).toBe('删除失败：团队暂时只读')
    expect(view.getByRole('option', { name: '已作废-测试 · 测试' })).toBeTruthy()

    fireEvent.click(confirmation.getByRole('button', { name: '删除员工' }))
    await waitFor(() => expect(view.queryByRole('option', { name: '已作废-测试 · 测试' })).toBeNull())
    expect(view.queryByRole('dialog')).toBeNull()
    expect(writes).toEqual([{ id: retired.id }, { id: retired.id }])
  })
})
