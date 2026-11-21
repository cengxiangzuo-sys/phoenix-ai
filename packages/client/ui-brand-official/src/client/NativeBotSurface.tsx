import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import flame from './assets/phoenix-flame.svg'
import css from './NativeBotSurface.module.css'

const SURFACE_KEY = 'ds-bot:surface'
const NATIVE_OFFICE_SLOT = 'sidebar.footer.action'
export const OFFICE_PANEL = 'phoenix-office' as MainPanelId
const CURRENT_SESSION_KEY = 'dsh.sessions.current'
const BOT_SEEN_KEY = 'ds-bot:seen'

export function isNativeBotSurface(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(SURFACE_KEY) === 'bot'
}

/** Whether ordinary Harness navigation restored one of the employee runtime's Sessions. */
export function isSelectedEmployeeSession(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const current = JSON.parse(localStorage.getItem(CURRENT_SESSION_KEY) ?? '{}') as { sessionId?: unknown }
    const seen = JSON.parse(localStorage.getItem(BOT_SEEN_KEY) ?? '{}') as Record<string, unknown>
    return typeof current.sessionId === 'string' && Object.hasOwn(seen, current.sessionId)
  } catch {
    return false
  }
}

type OfficeNavigation = {
  slots: Pick<ClientContext['slots'], 'entries'>
  uiWorkspace: Pick<ClientContext['uiWorkspace'], 'clearSelection' | 'startSession'>
  layout: Pick<ClientContext['layout'], 'selectPanel'>
}
type NativeOfficeActions = {
  setSurface(mode: 'agent' | 'bot'): void
  openSession(sessionId: string): void
  landOn(id: string, previous?: { botId: string; sessionId: string }): Promise<void>
}
type NativeOfficeMode = {
  getSnapshot(): { mode: 'agent' | 'bot' }
  set(update: (previous: { mode: 'agent' | 'bot' }) => { mode: 'agent' | 'bot' }): void
}

function hasNativeOfficeActions(value: unknown): value is NativeOfficeActions {
  return typeof value === 'object' && value !== null
    && 'setSurface' in value && typeof value.setSurface === 'function'
    && 'openSession' in value && typeof value.openSession === 'function'
    && 'landOn' in value && typeof value.landOn === 'function'
}

/** The employee plugin keeps its footer entry registered in both modes. */
function nativeOfficeEntry(slots: OfficeNavigation['slots']) {
  const entry = slots.entries(NATIVE_OFFICE_SLOT).find(item => item.options.id === 'bot-return')
  return entry?.inject?.()
}

function nativeOfficeMode(slots: OfficeNavigation['slots']): NativeOfficeMode | undefined {
  const hooks = nativeOfficeEntry(slots)?.hooks
  if (typeof hooks !== 'object' || hooks === null || !('surface' in hooks)) return undefined
  const surface = hooks.surface
  if (typeof surface !== 'object' || surface === null || !('getSnapshot' in surface)
    || typeof surface.getSnapshot !== 'function' || !('set' in surface) || typeof surface.set !== 'function') return undefined
  return surface as NativeOfficeMode
}

function nativeOfficeActions(slots: OfficeNavigation['slots']): NativeOfficeActions | undefined {
  const actions = nativeOfficeEntry(slots)?.actions
  return hasNativeOfficeActions(actions) ? actions : undefined
}

/** The native sidebar's automatic landing must not replace the selected office panel. */
export function guardNativeOfficeLanding(actions: Pick<NativeOfficeActions, 'landOn'>, canLand: () => boolean): () => void {
  const original = actions.landOn
  const guarded: NativeOfficeActions['landOn'] = async (id, previous) => {
    if (canLand()) await original.call(actions, id, previous)
  }
  actions.landOn = guarded
  return () => {
    if (actions.landOn === guarded) actions.landOn = original
  }
}

/** Enable the native team sidebar without opening the chief's conversation over the office. */
export function enterNativeBotSurface({ slots }: Pick<OfficeNavigation, 'slots'>): void {
  const surface = nativeOfficeMode(slots)
  if (!surface || surface.getSnapshot().mode === 'bot') return
  // The native mode action also navigates to the chief. The visual office
  // only changes the shell mode, keeping the currently selected panel and draft.
  localStorage.setItem(SURFACE_KEY, 'bot')
  document.documentElement.setAttribute('data-phoenix-employee-surface', '')
  surface.set(previous => ({ ...previous, mode: 'bot' }))
}

/** Show the normal blank homepage before preparing its Workspace composer. */
export function leaveNativeBotSurface({ slots, uiWorkspace, layout }: OfficeNavigation): void {
  document.documentElement.removeAttribute('data-phoenix-employee-surface')
  nativeOfficeActions(slots)?.setSurface('agent')
  uiWorkspace.clearSelection()
  layout.selectPanel(null)
  uiWorkspace.startSession()
}

/** Use the employee runtime's own Session navigation and roster lookup. */
export function openNativeBotSession(navigation: OfficeNavigation, sessionId: string): void {
  enterNativeBotSurface(navigation)
  nativeOfficeActions(navigation.slots)?.openSession(sessionId)
}

const PHOENIX_TERMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/DS[- ]Bot ([\d.]+) 可以更新/gi, '协作引擎 $1 可以更新'],
  [/DS[- ]Bot ([\d.]+) is available/gi, '协作引擎 $1 可以更新'],
  [/DeepSeek Harness/gi, 'Phoenix AI'],
  [/DS[- ]Bot/gi, 'Phoenix AI'],
  [/DSH Desktop/gi, 'Phoenix AI'],
  [/\bDSH\b/g, 'Phoenix AI'],
  [/主 Bot/gi, '总指挥'],
  [/Bot 团队/gi, 'AI 员工团队'],
  [/各 Bot 的/gi, '各员工的'],
  [/新建 Bot 的/gi, '新建员工的'],
  [/各 Bot/gi, '各员工'],
  [/新建 Bot/gi, '新建员工'],
  [/Bot 列表/gi, '员工列表'],
  [/\bBots?\b/gi, 'AI 员工'],
]

export function phoenixTerm(value: string): string {
  return PHOENIX_TERMS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

function employeePaint(mark: HTMLElement): string | undefined {
  const bodyPaint = mark.querySelector(':scope > svg .bt-b [fill]')?.getAttribute('fill')
  if (bodyPaint && !/^#(?:fff(?:fff)?|000(?:000)?)$/i.test(bodyPaint)) {
    if (!bodyPaint.startsWith('url(')) return bodyPaint
    const stops = [...mark.querySelectorAll(':scope > svg stop[stop-color]')]
      .map(node => node.getAttribute('stop-color'))
      .filter((value): value is string => value !== null)
    if (stops.length > 0) return `linear-gradient(135deg,${stops.join(',')})`
  }
  const colors = [...mark.querySelectorAll(':scope > svg [fill]')].map(node => node.getAttribute('fill') ?? '')
  return colors.find(value => /^#[0-9a-f]{3,8}$/i.test(value) && !/^#(?:fff(?:fff)?|000(?:000)?)$/i.test(value))
}

function markEmployeeAvatar(root: Element): void {
  const marks: HTMLElement[] = []
  if (root instanceof HTMLElement && root.matches('.bt-mark')) marks.push(root)
  const parent = root.closest?.('.bt-mark')
  if (parent instanceof HTMLElement && !marks.includes(parent)) marks.push(parent)
  for (const mark of marks) {
    if (!mark.querySelector(':scope > svg, :scope > .bt-mark-img')) continue
    const color = employeePaint(mark)
    mark.dataset.phoenixEmployee = ''
    if (color && mark.style.getPropertyValue('--phoenix-employee-color') !== color) {
      mark.style.setProperty('--phoenix-employee-color', color)
    }
  }
}

function brandNode(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const value = root.nodeValue
    if (value) {
      const branded = phoenixTerm(value)
      if (branded !== value) root.nodeValue = branded
    }
    return
  }
  if (!(root instanceof Element)) return
  if (root.matches('script, style')) return
  markEmployeeAvatar(root)
  for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
    const value = root.getAttribute(name)
    if (value) {
      const branded = phoenixTerm(value)
      if (branded !== value) root.setAttribute(name, branded)
    }
  }
  for (const child of root.childNodes) brandNode(child)
}

/** Keep the reused team surface visibly inside the Phoenix product identity. */
export function installPhoenixSurfaceBranding(): () => void {
  document.documentElement.toggleAttribute('data-phoenix-employee-surface', isNativeBotSurface())
  brandNode(document.documentElement)
  document.title = phoenixTerm(document.title)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') brandNode(record.target)
      else if (record.type === 'attributes') brandNode(record.target)
      else for (const node of record.addedNodes) brandNode(node)
    }
  })
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'title', 'placeholder', 'alt', 'fill', 'stop-color'],
  })
  return () => {
    observer.disconnect()
    document.documentElement.removeAttribute('data-phoenix-employee-surface')
  }
}

/** Return from a native employee or group conversation to the visual office. */
export function returnToPhoenixOffice(selectPanel: (panel: MainPanelId) => void): void {
  selectPanel(OFFICE_PANEL)
}

/** Native team surface footer entry back to the Phoenix office. */
export function NativeOfficeReturn({ wide, onClick }: SidebarFooterActionOwnerProps & { onClick: () => void }) {
  if (!isNativeBotSurface()) return null
  return <button type="button" className={css.return} onClick={onClick} aria-label="返回 AI 办公室">
    <img className={css.mark} src={flame} alt="" />
    {wide && <span className={css.label}>返回 AI 办公室</span>}
  </button>
}

/** Brand the employee view and protect ordinary navigation after a cold start. */
export function installNativeBotSurface(ctx: ClientContext): void {
  ctx.effect(installPhoenixSurfaceBranding, 'phoenix-office: brand native team surface')

  ctx.inject(['layout', 'uiWorkspace'], (scope) => {
    scope.slots.inject('sidebar.footer.action', () => scope.slots.register({
      name: 'sidebar.footer.action', id: 'phoenix-office-return', order: -1_000,
      inject: () => ({ onClick: () => returnToPhoenixOffice(panel => scope.layout.selectPanel(panel)) }),
    }, NativeOfficeReturn))
    scope.effect(() => {
      if (isNativeBotSurface() || !isSelectedEmployeeSession()) return () => {}
      // Do not expose an employee Session as an ordinary Harness conversation
      // after leaving the office or restoring a previous desktop selection.
      const timer = window.setTimeout(() => {
        if (isNativeBotSurface() || scope.layout.panelInfo.getSnapshot().activePanelId !== null
          || !isSelectedEmployeeSession()) return
        scope.uiWorkspace.clearSelection()
        scope.uiWorkspace.startSession()
      }, 1_000)
      return () => { window.clearTimeout(timer) }
    }, 'phoenix-office: restore normal home after office')

    scope.effect(() => {
      const officeSelected = () => scope.layout.panelInfo.getSnapshot().activePanelId === OFFICE_PANEL
      let actions: NativeOfficeActions | undefined
      let restore = () => {}
      const reconcile = () => {
        const next = nativeOfficeActions(scope.slots)
        if (next !== actions) {
          restore()
          actions = next
          restore = next ? guardNativeOfficeLanding(next, () => !officeSelected() && isNativeBotSurface()) : () => {}
        }
        if (officeSelected()) enterNativeBotSurface(scope)
      }
      const unsubscribe = scope.slots.subscribe(NATIVE_OFFICE_SLOT, reconcile)
      reconcile()
      return () => { unsubscribe(); restore() }
    }, 'phoenix-office: keep native landing out of the visual office')
  })
}
