/** Official DeepSeek Harness occupants: the profile-gated sidebar brand slots and the home whale frame layer. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { PixelWhale } from './home-whale/PixelWhale.tsx'
import { OfficialBrandMark, OfficialBrandName } from './Brand.tsx'
import { PhoenixBrandMark, PhoenixBrandName } from './PhoenixBrand.tsx'
import { installPhoenixTheme } from './PhoenixTheme.ts'
import { PhoenixOffice, PhoenixOfficeIcon } from './PhoenixOffice.tsx'
import { OfficeReturn } from './OfficeReturn.tsx'
import { PhoenixPetSettings, type PhoenixPetBridge } from './PhoenixPetSettings.tsx'
import { en as officeEn, zh as officeZh } from './office/locales.ts'
import { enterNativeBotSurface, installNativeBotSurface, isKnownEmployeeSession, leaveNativeBotSurface, showOrdinaryConversationSurface, openNativeBotCreation, openNativeBotSession, returnToPhoenixOffice } from './NativeBotSurface.tsx'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/**
 * Fill official sidebar artwork and frame the blank home with the whale decoration.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  if (process.env.DSH_CLIENT_BRAND === 'phoenix') {
    installPhoenixTheme(ctx)
    installNativeBotSurface(ctx)
    ctx.slots.inject('sidebar.brand.mark', () =>
      ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -1_000 }, PhoenixBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -1_000 }, PhoenixBrandName)
      }))
    const pet = (globalThis as typeof globalThis & { dshDesktop?: { phoenixPet?: PhoenixPetBridge } }).dshDesktop?.phoenixPet
    if (pet !== undefined) {
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item', id: 'phoenix-desktop-pet', order: 45, locale: 'phoenix.office',
        inject: () => ({ bridge: pet }),
      }, PhoenixPetSettings))
      ctx.inject(['sessions', 'layout', 'uiWorkspace'], (scope) => {
        scope.effect(() => {
          const catalog = scope.sessions.list
          let previous = ''
          const publish = () => {
            const { byId, ids } = catalog.getSnapshot()
            const rows = ids.flatMap((id) => {
              const row = byId[id]
              return row?.running && row.origin !== 'subagent' ? [{ id, title: row.displayTitle.slice(0, 180) }] : []
            }).slice(0, 5)
            const current = JSON.stringify(rows)
            if (current === previous) return
            previous = current
            void pet.reportWork(rows).catch(() => { previous = '' })
          }
          const stop = catalog.subscribe(publish)
          const stopOpen = pet.onOpenSession((id) => {
            const row = Object.values(catalog.getSnapshot().byId).find(session => session.id === id)
            if (row === undefined) return
            if (isKnownEmployeeSession(row.id) || /[/\\]bot[/\\]workspace(?:[/\\]|$)/.test(row.cwd ?? '')) {
              openNativeBotSession(scope, row.id)
              return
            }
            showOrdinaryConversationSurface(scope.slots)
            scope.layout.selectPanel(null)
            scope.uiWorkspace.openSession(row.id)
          })
          publish()
          return () => { stop(); stopOpen() }
        }, 'phoenix desktop pet: active sessions')
      })
    }
    ctx.inject(['layout', 'uiWorkspace', 'locale'], (scope) => {
      const enterOffice = () => enterNativeBotSurface(scope)
      scope.effect(() => scope.locale.register('phoenix.office', { en: officeEn, zh: officeZh }), 'phoenix-office: dictionary')
      scope.slots.inject('conversation.header.leading', () => scope.slots.register({
        name: 'conversation.header.leading',
        inject: () => ({ onClick: () => returnToPhoenixOffice(panel => scope.layout.selectPanel(panel)) }),
      }, OfficeReturn))
      scope.slots.inject('main', () => scope.slots.register({
        name: 'main', key: 'phoenix-office', locale: 'phoenix.office',
        inject: () => ({
          onHome: () => leaveNativeBotSurface(scope),
          onEnterOffice: enterOffice,
          onCreateEmployee: () => openNativeBotCreation(scope),
          onOpenNative: (sessionId?: string) => {
            if (sessionId !== undefined) openNativeBotSession(scope, sessionId)
          },
        }),
      }, PhoenixOffice))
      scope.slots.inject('sidebar.panellist', () => scope.slots.register({
        name: 'sidebar.panellist', id: 'phoenix-office', order: 1,
        label: 'AI 办公室',
      }, PhoenixOfficeIcon))
    })
    ctx.inject(['workspaces'], (scope) => {
      const renameInternalWorkspace = () => {
        for (const workspace of scope.workspaces.list.getSnapshot().items) {
          if (workspace.title === 'DS Bot' && /\/bot\/workspace\/?$/.test(workspace.path)) {
            void scope.workspaces.rename(workspace.workspaceId as WorkspaceId, 'AI 办公室资料')
          }
        }
      }
      scope.effect(() => {
        const unsubscribe = scope.workspaces.list.subscribe(renameInternalWorkspace)
        renameInternalWorkspace()
        return unsubscribe
      }, 'phoenix-office: internal workspace name')
    })
    return
  }
  ctx.slots.inject('conversation.hero.frame', () => ctx.slots.register({
    name: 'conversation.hero.frame',
    id: 'pixel-whale',
  }, PixelWhale))
  if (process.env.DSH_CLIENT_BUILD_PROFILE !== 'official') return
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, OfficialBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name' }, OfficialBrandName)
    }))
}
