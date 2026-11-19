// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { PhoenixOffice } from '../src/client/PhoenixOffice.tsx'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Phoenix office', () => {
  it('shows the durable employee roster and saves a new employee', async () => {
    const roster = { bots: [{ id: 'bot-1', name: '小羽', role: '研究助理', instructions: '查找资料' }], mainBotIds: [], models: [{ ref: 'fixture/local', label: '本地模型' }], defaultModel: 'fixture/local', work: { bots: {} }, readOnly: null }
    const calls: Array<{ endpoint: string; payload: Record<string, unknown> }> = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
      const input = JSON.parse(String(options.body)) as { endpoint: string; payload: Record<string, unknown> }
      calls.push(input)
      if (input.endpoint === 'create-bot') roster.bots.push({ id: 'bot-2', name: String(input.payload.name), role: String(input.payload.role), instructions: String(input.payload.instructions) })
      return { ok: true, json: async () => ({ ok: true, value: input.endpoint === 'state' ? roster : { id: 'bot-2' } }) }
    }))

    const view = render(<PhoenixOffice onHome={() => {}} onOpenEmployee={() => {}} />)
    await waitFor(() => expect(view.getAllByText('小羽 · 研究助理').length).toBeGreaterThan(0))
    fireEvent.click(view.getByRole('button', { name: /创建员工/ }))
    expect(view.getByRole('heading', { name: 'AI 办公室' }).closest('header')?.hasAttribute('data-window-drag')).toBe(true)
    const dialog = view.getByRole('dialog')
    fireEvent.change(dialog.querySelector('input[placeholder="例如：小羽"]')!, { target: { value: '小火' } })
    fireEvent.change(dialog.querySelector('input[placeholder="例如：研究助理"]')!, { target: { value: '设计师' } })
    fireEvent.click(dialog.querySelector('button[class*="primary"]')!)
    await waitFor(() => expect(view.getAllByText('小火 · 设计师').length).toBeGreaterThan(0))
    expect(calls.find(call => call.endpoint === 'create-bot')?.payload).toMatchObject({ name: '小火', role: '设计师', model: 'fixture/local' })
  })
})

it('finds by job title and changes employee views across floors without sending a task', async () => {
  const roster = { bots: Array.from({ length: 6 }, (_, i) => ({ id: `bot-${i}`, sessionId: `session-${i}`, name: `员工${i}`, role: '研究助理' })), mainBotIds: [], models: [], defaultModel: null, work: { bots: {} } }
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    calls.push(JSON.parse(String(options.body)).endpoint)
    return { ok: true, json: async () => ({ ok: true, value: roster }) }
  }))
  const onOpenEmployee = vi.fn()
  const view = render(<PhoenixOffice onHome={() => {}} onOpenEmployee={onOpenEmployee} />)
  await waitFor(() => expect(view.getByRole('option', { name: '员工5 · 研究助理' })).toBeTruthy())
  fireEvent.change(view.getByLabelText('搜索姓名或岗位'), { target: { value: '员工5' } })
  expect(view.queryByRole('option', { name: '员工0 · 研究助理' })).toBeNull()
  fireEvent.change(view.getByLabelText('员工视角'), { target: { value: 'bot-5' } })
  expect((view.getByLabelText('办公室楼层') as HTMLSelectElement).value).toBe('1')
  expect(view.getByRole('button', { name: '办公室总览' })).toBeTruthy()
  fireEvent.click(view.getByRole('button', { name: '办公室总览' }))
  expect(view.getByLabelText('员工视角')).toBeTruthy()
  fireEvent.click(view.getByRole('button', { name: '开始对话 ↗' }))
  expect(onOpenEmployee).toHaveBeenCalledWith('session-5')
  expect(calls).toEqual(['state'])
  const frame = view.getByTitle('AI 办公室三维场景') as HTMLIFrameElement
  fireEvent(window, new MessageEvent('message', { source: frame.contentWindow, origin: 'null', data: { channel: 'phoenix-office', action: 'select', id: 'bot-5' } }))
  expect(view.getByRole('dialog', { name: '编辑员工' })).toBeTruthy()
  expect((view.getByLabelText('姓名') as HTMLInputElement).value).toBe('员工5')
  expect(calls).toEqual(['state'])
})

it('creates a group without a paid greeting and saves an employee working folder', async () => {
  const roster = { bots: [{ id: 'bot-1', sessionId: 'session-1', name: '小羽', role: '研究助理' }], rooms: [] as Array<{ id: string; name: string; members: string[]; sessionId: string }>, mainBotIds: [], models: [], defaultModel: null, work: { bots: {} } }
  const calls: Array<{ endpoint: string; payload: Record<string, unknown> }> = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    const input = JSON.parse(String(options.body)) as { endpoint: string; payload: Record<string, unknown> }
    calls.push(input)
    if (input.endpoint === 'create-room') roster.rooms.push({ id: 'room-1', name: String(input.payload.name), members: input.payload.members as string[], sessionId: 'group-session' })
    return { ok: true, json: async () => ({ ok: true, value: input.endpoint === 'state' ? roster : input.endpoint === 'room-chat' ? { items: [], cursor: null, running: false } : input.endpoint === 'folders' ? { picker: 'native', folders: [] } : input.endpoint === 'folder-pick' ? '/Projects/Research' : { id: 'room-1' } }) }
  }))
  const view = render(<PhoenixOffice onHome={() => {}} onOpenEmployee={() => {}} />)
  await waitFor(() => expect((view.getByRole('button', { name: '＋ 创建群聊' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(view.getByRole('button', { name: '＋ 创建群聊' }))
  const group = view.getByRole('dialog', { name: '创建群聊' })
  fireEvent.change(group.querySelector('input[maxlength="40"]')!, { target: { value: '研究组' } })
  fireEvent.click(group.querySelector('input[type="checkbox"]')!)
  fireEvent.click(view.getByRole('button', { name: '创建并进入会议室' }))
  await waitFor(() => expect(view.getByRole('heading', { name: '研究组' })).toBeTruthy())
  fireEvent.click(view.getByRole('button', { name: '返回 AI 办公室' }))
  await waitFor(() => expect((view.getByLabelText('查看群聊') as HTMLSelectElement).value).toBe('room-1'))
  expect(calls.find(call => call.endpoint === 'create-room')?.payload).toEqual({ name: '研究组', members: ['bot-1'], greet: false })
  fireEvent.change(view.getByLabelText('员工视角'), { target: { value: 'bot-1' } })
  fireEvent.click(view.getByRole('button', { name: '员工资料' }))
  expect(view.getByRole('dialog', { name: '编辑员工' })).toBeTruthy()
  fireEvent.click(view.getByRole('button', { name: '选择文件夹…' }))
  await waitFor(() => expect((view.getByLabelText('工作资料文件夹') as HTMLInputElement).value).toBe('/Projects/Research'))
  fireEvent.click(view.getByRole('button', { name: '保存资料' }))
  await waitFor(() => expect(calls.find(call => call.endpoint === 'update-bot')?.payload.workDir).toBe('/Projects/Research'))
})

it('opens separate native room histories and can stop one room without sending a model request', async () => {
  const roster = { bots: [{ id: 'bot-1', name: '小羽', role: '研究助理' }], rooms: [
    { id: 'room-a', name: '策划会', members: ['bot-1'] },
    { id: 'room-b', name: '资料会', members: ['bot-1'] },
  ], mainBotIds: [], models: [], defaultModel: null, work: { bots: {} } }
  const calls: Array<{ endpoint: string; payload: Record<string, unknown> }> = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    const input = JSON.parse(String(options.body)) as { endpoint: string; payload: Record<string, unknown> }
    calls.push(input)
    const value = input.endpoint === 'state' ? roster : input.endpoint === 'room-chat'
      ? { items: [{ id: 'one', kind: 'bot', name: input.payload.roomId === 'room-a' ? '策划员工' : '资料员工', text: `来自${input.payload.roomId}` }], cursor: null, running: input.payload.roomId === 'room-a' }
      : true
    return { ok: true, json: async () => ({ ok: true, value }) }
  }))
  const view = render(<PhoenixOffice onHome={() => {}} onOpenEmployee={() => {}} />)
  await waitFor(() => expect(view.getByRole('option', { name: '策划会' })).toBeTruthy())
  fireEvent.change(view.getByLabelText('查看群聊'), { target: { value: 'room-a' } })
  fireEvent.click(view.getByRole('button', { name: '打开群聊 ↗' }))
  await waitFor(() => expect(view.getByText('来自room-a')).toBeTruthy())
  fireEvent.click(view.getByRole('button', { name: '停止群聊任务' }))
  await waitFor(() => expect(calls.some(call => call.endpoint === 'stop-room-work' && call.payload.roomId === 'room-a')).toBe(true))
  fireEvent.click(view.getByRole('button', { name: '返回 AI 办公室' }))
  fireEvent.change(view.getByLabelText('查看群聊'), { target: { value: 'room-b' } })
  fireEvent.click(view.getByRole('button', { name: '打开群聊 ↗' }))
  await waitFor(() => expect(view.getByText('来自room-b')).toBeTruthy())
  expect(view.queryByText('来自room-a')).toBeNull()
  expect(calls.some(call => call.endpoint === 'send')).toBe(false)
})
