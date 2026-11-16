// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { PhoenixOffice } from '../src/client/PhoenixOffice.tsx'

afterEach(() => vi.unstubAllGlobals())

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
    await waitFor(() => expect(view.getAllByText('小羽').length).toBeGreaterThan(0))
    fireEvent.click(view.getByRole('button', { name: /创建员工/ }))
    const dialog = view.getByRole('dialog')
    fireEvent.change(dialog.querySelector('input[placeholder="例如：小羽"]')!, { target: { value: '小火' } })
    fireEvent.change(dialog.querySelector('input[placeholder="例如：研究助理"]')!, { target: { value: '设计师' } })
    fireEvent.click(dialog.querySelector('button[class*="primary"]')!)
    await waitFor(() => expect(view.getAllByText('小火').length).toBeGreaterThan(0))
    expect(calls.find(call => call.endpoint === 'create-bot')?.payload).toMatchObject({ name: '小火', role: '设计师', model: 'fixture/local' })
  })
})
