/** Own the optional Phoenix companion window outside the main workspace. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, Menu, screen, type MenuItemConstructorOptions } from 'electron'
import type { AccountDetails } from '@deepseek-ai/dsh-deepseek-account/types'
import { z } from 'zod'
import { PET_STATE } from './phoenix-pet-protocol.ts'

const WIDTH = 124
const HEIGHT = 140
const PANEL_WIDTH = 314
const PANEL_HEIGHT = 398
const INSET = 24
const animationSchema = z.enum(['auto', 'wave', 'nap', 'still'])
const preferencesSchema = z.object({ enabled: z.boolean(), animation: animationSchema })
const workSchema = z.array(z.object({ id: z.string().min(1).max(160), title: z.string().max(180) })).max(5)

type PetBalance = AccountDetails['balance'] | 'loading' | 'offline' | null
type WorkRows = z.infer<typeof workSchema>

interface CompanionOptions {
  readonly openPhoenix: () => void
  readonly openSession: (id: string) => void
  readonly readBalance: () => Promise<PetBalance>
  readonly onEnabled: (enabled: boolean) => void
}

/** One floating companion and its local preferences. */
export class PhoenixDesktopPet {
  private window: BrowserWindow | undefined
  private loading: Promise<void> | undefined
  private work: WorkRows = []
  private expanded = false
  private balance: PetBalance = null
  private balanceRequest = 0
  private readonly path = join(app.getPath('userData'), 'desktop', 'phoenix-pet.json')
  private preferences: z.infer<typeof preferencesSchema> = { enabled: false, animation: 'auto' }

  /** @param options - Existing workspace navigation and authenticated read-only account operations. */
  constructor(private readonly options: CompanionOptions) {
    try {
      this.preferences = preferencesSchema.parse(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Phoenix desktop pet: using default settings')
    }
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 })
    writeFileSync(this.path, JSON.stringify(this.preferences) + '\n', { mode: 0o600 })
  }

  /**
   * Restore the desktop-local opt-in if the previous launch saved it.
   * @param locale - Current desktop locale.
   * @returns Settlement of the optional launch.
   */
  async restore(locale: string): Promise<void> {
    if (this.preferences.enabled) await this.setEnabled(true, locale)
  }

  /**
   * Reuse the application's native menus as a second entry to the setting.
   * @param locale - Current desktop locale.
   * @returns The Phoenix-only application menu item.
   */
  menuItem(locale: string): MenuItemConstructorOptions {
    return {
      label: locale === 'zh-CN' ? '显示桌宠' : 'Show desktop pet',
      click: () => { void this.setEnabled(true, locale).catch(() => { console.warn('Phoenix desktop pet could not open') }) },
    }
  }

  /**
   * Show or dismiss the companion and save the result.
   * @param enabled - Requested visibility.
   * @param locale - Current desktop locale.
   * @returns Actual visibility, including cancellation while opening.
   */
  async setEnabled(enabled: boolean, locale: string): Promise<boolean> {
    if (enabled) {
      if (this.loading === undefined && this.window === undefined) {
        this.loading = this.show(locale).finally(() => { this.loading = undefined })
      }
      await this.loading
    } else {
      this.window?.close()
    }
    const visible = this.isVisible()
    this.preferences = { ...this.preferences, enabled: visible }
    this.options.onEnabled(visible)
    this.save()
    return visible
  }

  /**
   * Keep the animation and session links tied to running work from the main workspace.
   * @param value - Session IDs and titles supplied by the owned workspace renderer.
   */
  reportWork(value: unknown): void {
    this.work = workSchema.parse(value)
    this.publish()
  }

  private publish(): void {
    this.window?.webContents.send(PET_STATE, {
      animation: this.preferences.animation, expanded: this.expanded,
      work: this.work, balance: this.expanded ? this.balance : null,
    })
  }

  /** Clear the last wallet after the desktop account is signed out. */
  clearBalance(): void {
    if (!this.expanded) return
    this.balanceRequest++
    this.balance = null
    this.publish()
  }

  private toggleDetails(window: BrowserWindow): void {
    const old = window.getBounds()
    const { workArea } = screen.getDisplayMatching(old)
    this.expanded = !this.expanded
    const width = this.expanded ? PANEL_WIDTH : WIDTH
    const height = this.expanded ? PANEL_HEIGHT : HEIGHT
    window.setBounds({
      x: Math.max(workArea.x, Math.min(old.x + old.width, workArea.x + workArea.width) - width),
      y: Math.max(workArea.y, Math.min(old.y + old.height, workArea.y + workArea.height) - height),
      width, height,
    })
    const request = ++this.balanceRequest
    this.balance = this.expanded ? 'loading' : null
    this.publish()
    if (!this.expanded) return
    void this.options.readBalance().catch((): PetBalance => ({ status: 'failed' })).then((balance) => {
      if (this.balanceRequest !== request || this.window !== window) return
      this.balance = balance
      this.publish()
    })
  }

  private async show(locale: string): Promise<void> {
    const chinese = locale === 'zh-CN'
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const path = join(app.getAppPath(), 'renderer', 'phoenix-desktop-pet.html')
    const page = pathToFileURL(path).href
    const window = new BrowserWindow({
      width: WIDTH, height: HEIGHT,
      x: Math.max(workArea.x, workArea.x + workArea.width - WIDTH - INSET),
      y: Math.max(workArea.y, workArea.y + workArea.height - HEIGHT - INSET),
      title: chinese ? 'Phoenix 小火人' : 'Phoenix desktop pet',
      transparent: true, frame: false, show: false, alwaysOnTop: true, skipTaskbar: true,
      resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
      webPreferences: {
        preload: join(app.getAppPath(), 'lib', 'preload-phoenix-pet.cjs'),
        nodeIntegration: false, contextIsolation: true, sandbox: true, devTools: false,
        navigateOnDragDrop: false,
      },
    })
    this.window = window
    window.once('closed', () => {
      if (this.window !== window) return
      this.window = undefined
      this.expanded = false
      this.balance = null
      this.balanceRequest++
    })
    const hide = (): void => { void this.setEnabled(false, locale).catch(() => { console.warn('Phoenix desktop pet: setting could not be saved') }) }
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => {
      event.preventDefault()
      if (event.url === `${page}?action=open`) this.options.openPhoenix()
      if (event.url === `${page}?action=hide`) hide()
      if (event.url === `${page}?action=details`) this.toggleDetails(window)
      const id = new URL(event.url).searchParams.get('id')
      if (id !== null && event.url === `${page}?action=session&id=${encodeURIComponent(id)}`
        && this.work.some(row => row.id === id)) this.options.openSession(id)
    })
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown' || input.key !== 'Escape') return
      event.preventDefault()
      if (this.expanded) this.toggleDetails(window)
      else hide()
    })
    window.webContents.on('context-menu', (event) => {
      event.preventDefault()
      const labels = chinese
        ? { auto: '跟随工作', wave: '轻轻挥手', nap: '打盹', still: '静止' }
        : { auto: 'Follow work', wave: 'Wave', nap: 'Nap', still: 'Still' }
      Menu.buildFromTemplate([
        ...animationSchema.options.map((animation): MenuItemConstructorOptions => ({
          label: labels[animation], type: 'radio', checked: this.preferences.animation === animation,
          click: () => {
            this.preferences = { ...this.preferences, animation }
            this.publish()
            try { this.save() } catch { console.warn('Phoenix desktop pet: animation setting could not be saved') }
          },
        })),
        { type: 'separator' },
        { label: chinese ? '隐藏桌宠' : 'Hide desktop pet', click: hide },
      ]).popup({ window })
    })
    try {
      await window.loadFile(path, { query: { locale } })
    } catch (error) {
      if (window.isDestroyed()) return
      window.destroy()
      throw error
    }
    if (!window.isDestroyed()) {
      window.showInactive()
      this.publish()
    }
  }

  /**
   * Distinguish the companion from the workspace during Dock activation.
   * @returns Whether the companion currently has a visible window.
   */
  isVisible(): boolean {
    return this.window?.isVisible() === true
  }

  /** Remove the companion when the application quits, preserving the opt-in. */
  dispose(): void {
    this.window?.destroy()
  }
}
