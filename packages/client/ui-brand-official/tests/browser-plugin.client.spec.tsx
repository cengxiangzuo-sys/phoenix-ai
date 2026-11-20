// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { OfficialBrandMark, OfficialBrandName } from '../src/client/Brand.tsx'
import { PHOENIX_THEME_TOKENS } from '../src/client/PhoenixTheme.ts'
import { apply as hostApply } from '../src/index.ts'
import { OfficeReturn } from '../src/client/OfficeReturn.tsx'
import { installPhoenixSurfaceBranding, isSelectedEmployeeSession, returnToPhoenixOffice } from '../src/client/NativeBotSurface.tsx'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  localStorage.clear()
  sessionStorage.clear()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
  'conversation.hero.frame',
] as const

const HERO_HOLE = 'conversation.hero.brand.mark'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const declareHoles = () => slots.register({
    name: 'root',
    children: Object.fromEntries([...HOLES, HERO_HOLE].map(name => [name, {
      kind: name === 'conversation.hero.frame' ? 'hoc' : 'single',
      scope: 'root',
    }])),
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, declareHoles, disposeHoles }
}

describe('official browser-brand plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares only the slot service it uses', () => {
    expect(inject).toEqual(['slots'])
  })

  it('keeps local sidebar branding and provides the same blank-home feedback', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'local')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(0)
    expect(subject.slots.entries('conversation.hero.frame')).toHaveLength(1)
  })

  it('selects Phoenix branding without mounting the official whale', async () => {
    vi.stubEnv('DSH_CLIENT_BRAND', 'phoenix')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(1)
    expect(subject.slots.entries('conversation.hero.frame')).toHaveLength(0)
  })

  it('applies Phoenix colors and defaults only an untouched system preference to dark', async () => {
    vi.stubEnv('DSH_CLIENT_BRAND', 'phoenix')
    localStorage.clear()
    const subject = await bench()
    const overrideTokens = vi.fn(() => () => {})
    const setTheme = vi.fn()
    subject.ctx.provide('theme', { overrideTokens, setTheme, getTheme: () => ({ preference: 'system' }) } as never)
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(overrideTokens).toHaveBeenCalledWith('phoenix-brand', PHOENIX_THEME_TOKENS)
    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(document.body.hasAttribute('data-phoenix-brand')).toBe(true)
    await fiber.dispose()
    expect(document.body.hasAttribute('data-phoenix-brand')).toBe(false)

    const next = await bench()
    const nextSetTheme = vi.fn()
    next.ctx.provide('theme', { overrideTokens, setTheme: nextSetTheme, getTheme: () => ({ preference: 'system' }) } as never)
    await next.ctx.plugin({ inject: [...inject], apply }).await()
    expect(nextSetTheme).not.toHaveBeenCalled()
  })

  it('fills declarations before or after apply and removes every occupant on teardown', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const before = await bench()
    const fiber = before.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    before.disposeHoles?.()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)
    before.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    await fiber.dispose()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(1)
  })

  it('leaves the conversation hero on its declaring fallback even in official builds', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries(HERO_HOLE)).toHaveLength(0)
  })

  it('registers the whale as a self-contained frame layer without replacing the hero mark', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    try {
      await fiber.await()
      const [entry] = subject.slots.entries('conversation.hero.frame')
      expect(entry?.options.id).toBe('pixel-whale')
      expect(entry?.inject).toBeUndefined()
      expect(subject.slots.entries(HERO_HOLE)).toHaveLength(0)
    } finally {
      await fiber.dispose()
    }
  })

  it('renders the official name independently from both requested mark sizes', () => {
    const name = render(<OfficialBrandName />)
    expect(name.container.querySelector('svg')?.getAttribute('viewBox')).toBe('26 0 156 24')
    name.unmount()

    const mark = render(<OfficialBrandMark size={34} />)
    expect(mark.container.querySelector('svg')?.getAttribute('width')).toBe('34')
    mark.rerender(<OfficialBrandMark size={24} />)
    expect(mark.container.querySelector('svg')?.getAttribute('width')).toBe('24')
  })

  it('does not expose the office return control in ordinary Phoenix conversations', () => {
    localStorage.setItem('ds-bot:surface', 'agent')
    const ordinary = render(<OfficeReturn onClick={vi.fn()} />)
    expect(ordinary.queryByRole('button', { name: '返回 AI 办公室' })).toBeNull()
    ordinary.unmount()

    localStorage.setItem('ds-bot:surface', 'bot')
    const employee = render(<OfficeReturn onClick={vi.fn()} />)
    expect(employee.getByRole('button', { name: '返回 AI 办公室' })).toBeDefined()
  })

  it('identifies an employee Session accidentally restored in the ordinary workspace', () => {
    localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'employee-1' }))
    localStorage.setItem('ds-bot:seen', JSON.stringify({ 'employee-1': 1 }))
    expect(isSelectedEmployeeSession()).toBe(true)

    localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'ordinary-1' }))
    expect(isSelectedEmployeeSession()).toBe(false)
  })

  it('uses the employee theme color and follows later color selections', async () => {
    document.body.innerHTML = '<span class="bt-mark"><svg><g class="bt-b"><path fill="var(--bt-ink-orange)"/></g></svg></span>'
    const dispose = installPhoenixSurfaceBranding()
    const mark = document.querySelector<HTMLElement>('.bt-mark')
    const path = document.querySelector('path')
    expect(mark?.dataset.phoenixEmployee).toBe('')
    expect(mark?.style.getPropertyValue('--phoenix-employee-color')).toBe('var(--bt-ink-orange)')

    path?.setAttribute('fill', 'var(--bt-ink-violet)')
    await vi.waitFor(() => expect(mark?.style.getPropertyValue('--phoenix-employee-color')).toBe('var(--bt-ink-violet)'))
    dispose()
  })

  it('cancels a pending employee restore before showing the office', () => {
    sessionStorage.setItem('phoenix.native-bot.target.v1', 'employee-1')
    const selectPanel = vi.fn()
    returnToPhoenixOffice(selectPanel)
    expect(sessionStorage.getItem('phoenix.native-bot.target.v1')).toBeNull()
    expect(selectPanel).toHaveBeenCalledWith('phoenix-office')
  })
})
