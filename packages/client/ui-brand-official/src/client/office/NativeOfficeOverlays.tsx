import type { Context } from '@deepseek-ai/cordis'
import type { HostObservable, InjectFace, PropsHooks, PropsRuntime, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { ComponentType } from 'react'

const OVERLAY_SLOT = 'shell.overlay'
const NATIVE_OVERLAY_ID = 'bot'

type NativeMenu = { kind?: string; id: string }
type NativeHooks = {
  ui: HostObservable<{ menu?: NativeMenu | null }>
  roster: HostObservable<{ byId: Record<string, unknown> }>
}
type NativeProps = PropsRuntime<typeof OVERLAY_SLOT> & PropsHooks<NativeHooks>
type Injected = { nativeOverlay: ComponentType<NativeProps>; hooks: NativeHooks }

function NativeOfficeOverlays({ nativeOverlay: Overlay, ...props }: PropsRuntime<typeof OVERLAY_SLOT> & InjectFace<Injected>) {
  const menu = props.useUi(state => state.menu)
  const employeeId = menu?.kind === 'bot' ? menu.id : undefined
  const employeeExists = props.useRoster(state => employeeId !== undefined && Object.hasOwn(state.byId, employeeId))
  // The native menu conditionally calls a hook for existing employees. Its
  // exit animation must not reuse that menu after closing or losing the employee.
  const key = employeeId === undefined ? 'default' : `employee:${employeeId}:${employeeExists}`
  return <Overlay key={key} {...props} />
}

function hasNativeHooks(hooks: unknown): hooks is NativeHooks {
  const observable = (source: unknown) => typeof source === 'object' && source !== null
    && 'getSnapshot' in source && typeof source.getSnapshot === 'function'
    && 'subscribe' in source && typeof source.subscribe === 'function'
  return typeof hooks === 'object' && hooks !== null
    && 'ui' in hooks && observable(hooks.ui) && 'roster' in hooks && observable(hooks.roster)
}

/** Keep the native menu, search and creation overlay available after employee removal.
 * @param slots - Registry that owns the native overlay's registration lifetime.
 * @returns Disposer for the Phoenix overlay and its registry subscription.
 */
export function installNativeOfficeOverlays(slots: Pick<Context['slots'], 'entries' | 'register' | 'subscribe'>): () => void {
  let current: StoredEntry | undefined
  let dispose: (() => void) | undefined
  const reconcile = () => {
    const next = slots.entries(OVERLAY_SLOT).find(entry =>
      entry.options.id === NATIVE_OVERLAY_ID && entry.component !== NativeOfficeOverlays)
    if (next === current) return
    dispose?.()
    dispose = undefined
    current = next
    if (typeof next?.component !== 'function' || !next.inject) return
    const face = next.inject()
    if (!hasNativeHooks(face.hooks)) return
    const nativeOverlay = next.component as ComponentType<NativeProps>
    const hooks = face.hooks
    dispose = slots.register({
      name: OVERLAY_SLOT,
      id: NATIVE_OVERLAY_ID,
      order: next.options.order ?? 50,
      priority: (next.options.priority ?? 0) - 1,
      inject: () => ({ ...face, nativeOverlay, hooks }),
    }, NativeOfficeOverlays)
  }
  const unsubscribe = slots.subscribe(OVERLAY_SLOT, reconcile)
  reconcile()
  return () => { unsubscribe(); dispose?.() }
}
