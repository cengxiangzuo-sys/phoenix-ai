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
