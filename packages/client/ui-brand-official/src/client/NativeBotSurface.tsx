import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import flame from './assets/phoenix-flame.svg'
import css from './NativeBotSurface.module.css'

const SURFACE_KEY = 'ds-bot:surface'
const TARGET_KEY = 'phoenix.native-bot.target.v1'
const OFFICE_KEY = 'phoenix.native-bot.office.v1'

export function isNativeBotSurface(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(SURFACE_KEY) === 'bot'
}

/** Make the visual office and the employee runtime one surface. */
export function enterNativeBotSurface(): void {
  if (isNativeBotSurface()) return
  try {
    sessionStorage.setItem(OFFICE_KEY, '1')
    sessionStorage.removeItem(TARGET_KEY)
    localStorage.setItem(SURFACE_KEY, 'bot')
  } finally {
    window.location.reload()
  }
}

/** Leave the employee runtime when returning to the ordinary Phoenix home. */
export function leaveNativeBotSurface(): void {
  if (!isNativeBotSurface()) return
  try {
    sessionStorage.removeItem(OFFICE_KEY)
    sessionStorage.removeItem(TARGET_KEY)
    localStorage.setItem(SURFACE_KEY, 'agent')
  } finally {
    window.location.reload()
  }
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

function markEmployeeAvatar(root: Element): void {
  const marks: HTMLElement[] = []
  if (root instanceof HTMLElement && root.matches('.bt-mark')) marks.push(root)
  const parent = root.closest?.('.bt-mark')
  if (parent instanceof HTMLElement && !marks.includes(parent)) marks.push(parent)
  for (const mark of marks) {
    if (!mark.querySelector(':scope > svg, :scope > .bt-mark-img')) continue
    const colors = [...mark.querySelectorAll('[fill]')].map(node => node.getAttribute('fill') ?? '')
    const color = colors.find(value => /^#[0-9a-f]{3,8}$/i.test(value) && !/^#(?:fff(?:fff)?|000(?:000)?)$/i.test(value))
    mark.dataset.phoenixEmployee = ''
    if (color) mark.style.setProperty('--phoenix-employee-color', color)
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
    attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'],
  })
  return () => observer.disconnect()
}

/** Enter the complete native team surface through the Phoenix office. */
export function openNativeBotSurface(sessionId?: string): void {
  try {
    if (sessionId) sessionStorage.setItem(TARGET_KEY, sessionId)
    else sessionStorage.removeItem(TARGET_KEY)
    localStorage.setItem(SURFACE_KEY, 'bot')
  } finally {
    window.location.reload()
  }
}

/** Native team surface footer entry back to the Phoenix office. */
export function NativeOfficeReturn({ wide, onClick }: SidebarFooterActionOwnerProps & { onClick: () => void }) {
  if (!isNativeBotSurface()) return null
  return <button type="button" className={css.return} onClick={onClick} aria-label="返回 AI 办公室">
    <img className={css.mark} src={flame} alt="" />
    {wide && <span className={css.label}>返回 AI 办公室</span>}
  </button>
}

/** Restore the requested native chat after the one-time surface reload. */
export function installNativeBotSurface(ctx: ClientContext): void {
  ctx.effect(installPhoenixSurfaceBranding, 'phoenix-office: brand native team surface')

  ctx.inject(['layout', 'sessions', 'uiWorkspace'], (scope) => {
    scope.slots.inject('sidebar.footer.action', () => scope.slots.register({
      name: 'sidebar.footer.action', id: 'phoenix-office-return', order: -1_000,
      inject: () => ({ onClick: () => scope.layout.selectPanel('phoenix-office' as MainPanelId) }),
    }, NativeOfficeReturn))
    scope.effect(() => {
      if (sessionStorage.getItem(OFFICE_KEY) !== '1') return () => {}
      sessionStorage.removeItem(OFFICE_KEY)
      const frame = window.requestAnimationFrame(() => scope.layout.selectPanel('phoenix-office' as MainPanelId))
      return () => { window.cancelAnimationFrame(frame) }
    }, 'phoenix-office: restore office after native team')

    scope.effect(() => {
      const target = sessionStorage.getItem(TARGET_KEY)
      if (!target || localStorage.getItem(SURFACE_KEY) !== 'bot') return () => {}
      const sessionId = target as SessionId
      let timer: number | undefined
      let unsubscribe = () => {}
      const stage = () => {
        const list = scope.sessions.list.getSnapshot()
        if (list.byId[sessionId] !== undefined) {
          unsubscribe()
          // The team plugin restores its previous chat after the Session list is ready.
          // Wait for that restore, then select the requested employee exactly once.
          timer = window.setTimeout(() => {
            scope.layout.selectPanel(null)
            scope.uiWorkspace.openSession(sessionId)
            sessionStorage.removeItem(TARGET_KEY)
          }, 800)
          return true
        }
        if (list.phase === 'ready') sessionStorage.removeItem(TARGET_KEY)
        return false
      }
      if (!stage()) unsubscribe = scope.sessions.list.subscribe(stage)
      return () => {
        unsubscribe()
        if (timer !== undefined) window.clearTimeout(timer)
      }
    }, 'phoenix-office: open native team chat')
  })
}
