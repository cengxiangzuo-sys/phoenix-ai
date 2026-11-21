// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useMemo, useRef } from 'react'
import { apply as applyRenderer, SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { apply, inject } from '../src/client/index.ts'
import { OfficialBrandMark, OfficialBrandName } from '../src/client/Brand.tsx'
import { PHOENIX_THEME_TOKENS } from '../src/client/PhoenixTheme.ts'
import { OfficeReturn } from '../src/client/OfficeReturn.tsx'
import { enterNativeBotSurface, guardNativeOfficeLanding, installPhoenixSurfaceBranding, isSelectedEmployeeSession, leaveNativeBotSurface, openNativeBotCreation, openNativeBotSession, returnToPhoenixOffice } from '../src/client/NativeBotSurface.tsx'
import { installNativeOfficeOverlays } from '../src/client/office/NativeOfficeOverlays.tsx'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-phoenix-employee-surface')
  document.documentElement.removeAttribute('data-platform')
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

function source<T>(snapshot: T) {
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (next: T) => {
      snapshot = next
      for (const listener of listeners) listener()
    },
  }
}

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

  it('places the macOS return button after the shell drag regions and opens the office', () => {
    localStorage.setItem('ds-bot:surface', 'bot')
    document.documentElement.dataset.platform = 'darwin'
    vi.stubGlobal('CSS', { supports: (property: string, value: string) => property === 'top' && value === 'anchor(top)' })
    const onClick = vi.fn()
    const employee = render(<header data-window-drag><OfficeReturn onClick={onClick} /></header>)
    const back = employee.getByRole('button', { name: '返回 AI 办公室' })
    expect(back.parentElement).toBe(document.body)
    expect(employee.container.querySelector('header')?.contains(back)).toBe(false)
    fireEvent.click(back)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('identifies an employee Session accidentally restored in the ordinary workspace', () => {
    localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'employee-1' }))
    localStorage.setItem('ds-bot:seen', JSON.stringify({ 'employee-1': 1 }))
    expect(isSelectedEmployeeSession()).toBe(true)

    localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'ordinary-1' }))
    expect(isSelectedEmployeeSession()).toBe(false)
  })

  it('uses the employee theme color and follows later color selections', async () => {
    localStorage.setItem('ds-bot:surface', 'bot')
    document.body.innerHTML = '<span class="bt-mark"><svg><g class="bt-b"><path fill="var(--bt-ink-orange)"/></g></svg></span>'
    const dispose = installPhoenixSurfaceBranding()
    const mark = document.querySelector<HTMLElement>('.bt-mark')
    const path = document.querySelector('path')
    expect(mark?.dataset.phoenixEmployee).toBe('')
    expect(mark?.style.getPropertyValue('--phoenix-employee-color')).toBe('var(--bt-ink-orange)')
    expect(document.documentElement.hasAttribute('data-phoenix-employee-surface')).toBe(true)

    path?.setAttribute('fill', 'var(--bt-ink-violet)')
    await vi.waitFor(() => expect(mark?.style.getPropertyValue('--phoenix-employee-color')).toBe('var(--bt-ink-violet)'))
    dispose()
    expect(document.documentElement.hasAttribute('data-phoenix-employee-surface')).toBe(false)
  })

  it('returns directly from an employee chat to the visual office', () => {
    const selectPanel = vi.fn()
    returnToPhoenixOffice(selectPanel)
    expect(selectPanel).toHaveBeenCalledExactlyOnceWith('phoenix-office')
  })

  it('switches office and home in the same document without asking the native switch to open the chief', () => {
    const calls: string[] = []
    type Surface = { mode: 'bot' | 'agent'; plain: boolean }
    let surface: Surface = { mode: 'agent', plain: true }
    const hooks = {
      surface: {
        getSnapshot: () => surface,
        set: (update: (state: Surface) => Surface) => { surface = update(surface); calls.push(surface.mode) },
      },
    }
    const actions = {
      setSurface: (next: Surface['mode']) => { surface = { ...surface, mode: next }; calls.push(next) },
      openSession: (id: string) => calls.push(id),
      openNewChat: (mode: 'create') => calls.push(mode),
      landOn: async () => {},
    }
    const slots = { entries: () => [{ options: { id: 'bot-return' }, component: () => null, inject: () => ({ actions, hooks }) }] }
    const uiWorkspace = {
      clearSelection: () => { calls.push('clear') },
      startSession: () => { calls.push('start') },
    }
    const layout = { selectPanel: () => { calls.push('home') } }
    const navigation = { slots, uiWorkspace, layout }

    enterNativeBotSurface(navigation)
    expect(surface).toEqual({ mode: 'bot', plain: true })
    openNativeBotCreation(navigation)
    openNativeBotSession(navigation, 'employee-1')
    expect(document.documentElement.hasAttribute('data-phoenix-employee-surface')).toBe(true)
    leaveNativeBotSurface(navigation)
    expect(document.documentElement.hasAttribute('data-phoenix-employee-surface')).toBe(false)
    expect(calls).toEqual(['bot', 'create', 'employee-1', 'agent', 'clear', 'home', 'start'])
  })

  it('suppresses native sidebar auto-navigation while the office is visible and restores it on teardown', async () => {
    const landOn = vi.fn(async (_id: string) => {})
    const actions = { landOn }
    let officeVisible = true
    const dispose = guardNativeOfficeLanding(actions, () => !officeVisible)
    await actions.landOn('chief')
    expect(landOn).not.toHaveBeenCalled()
    officeVisible = false
    await actions.landOn('chief')
    expect(landOn).toHaveBeenCalledOnce()
    dispose()
    expect(actions.landOn).toBe(landOn)
  })

  it('keeps the About star on the Phoenix repository when the native page updates', async () => {
    onTestFinished(installPhoenixSurfaceBranding())
    const about = document.createElement('div')
    about.className = 'bt-about-hero'
    const star = document.createElement('a')
    star.className = 'bt-star'
    const upstream = 'https://github.com/Fei2411/DS-Bot'
    star.href = upstream
    star.title = 'Star DS Bot on GitHub'
    about.append(star)
    document.body.append(about)
    await act(async () => {})
    expect(star.href).toBe('https://github.com/cengxiangzuo-sys/phoenix-ai')
    star.href = upstream
    star.setAttribute('aria-label', 'Star DS Bot on GitHub · 123 stars')
    await act(async () => {})
    expect(star.href).toBe('https://github.com/cengxiangzuo-sys/phoenix-ai')
    expect(star.getAttribute('aria-label')).toBe('Star Phoenix AI on GitHub')
  })

  it('keeps native creation and section menus mounted after an employee disappears', async () => {
    const ctx = new Context()
    const renderer = ctx.plugin({ apply: applyRenderer })
    await renderer.await()
    onTestFinished(() => { renderer.dispose() })
    const slots = ctx.slots
    const emptySelection = source({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })
    slots.installScope('session', { current: emptySelection, bindingSource: () => emptySelection })
    slots.register({ name: 'root', children: { 'shell.overlay': { kind: 'list', scope: 'root' } } },
      ({ renderSlot }) => <>{renderSlot('shell.overlay', {})}</>)
    onTestFinished(installNativeOfficeOverlays(slots))

    const ui = source<{ menu: { kind: string; id: string } | null; create?: boolean }>({ menu: { kind: 'bot', id: 'employee' } })
    const roster = source<{ byId: Record<string, object> }>({ byId: { employee: {} } })
    const work = source({ waiting: false })
    const injectOverlay = () => ({ hooks: { ui, roster, work } })
    function EmployeeMenu({ useWork, employee }: { useWork: InjectFace<ReturnType<typeof injectOverlay>>['useWork']; employee: boolean }) {
      // Reproduce the native 0.3.6 conditional hook in the menu that lingers after closing.
      const waiting = employee ? useWork(state => state.waiting) : false
      const label = useMemo(() => waiting ? 'Waiting' : 'Employee menu', [waiting])
      return employee && <span>{label}</span>
    }
    function NativeOverlay({ useUi, useRoster, useWork }: InjectFace<ReturnType<typeof injectOverlay>>) {
      const state = useUi(value => value)
      const employee = useRoster(value => Boolean(value.byId.employee))
      const lingeringMenu = useRef(state.menu)
      const menu = state.menu ?? lingeringMenu.current
      return <>
        {menu?.kind === 'bot' && <EmployeeMenu employee={employee} useWork={useWork} />}
        {menu?.kind === 'section' && <button>解散分组</button>}
        {state.create && <h2>新建员工</h2>}
      </>
    }

    const unregister = slots.register({ name: 'shell.overlay', id: 'bot', inject: injectOverlay }, NativeOverlay)
    await act(async () => {})
    const view = render(<>{slots.renderSlot('root', {})}</>)
    expect(view.getByText('Employee menu')).toBeTruthy()
    act(() => { roster.set({ byId: {} }) })
    expect(view.queryByText('Employee menu')).toBeNull()
    act(() => { ui.set({ menu: null, create: true }) })
    expect(view.getByRole('heading', { name: '新建员工' })).toBeTruthy()
    act(() => { ui.set({ menu: { kind: 'section', id: 'new-section' } }) })
    expect(view.getByRole('button', { name: '解散分组' })).toBeTruthy()
    await act(async () => { unregister() })
    expect(slots.entries('shell.overlay')).toHaveLength(0)
  })
})
