/** Official DeepSeek Harness occupants: the profile-gated sidebar brand slots and the home whale frame layer. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { PixelWhale } from './home-whale/PixelWhale.tsx'
import { OfficialBrandMark, OfficialBrandName } from './Brand.tsx'
import { PhoenixBrandMark, PhoenixBrandName } from './PhoenixBrand.tsx'
import { installPhoenixTheme } from './PhoenixTheme.ts'
import { PhoenixOffice, PhoenixOfficeIcon } from './PhoenixOffice.tsx'
import { OfficeReturn } from './OfficeReturn.tsx'
import { installNativeBotSurface, openNativeBotSurface } from './NativeBotSurface.tsx'

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
    ctx.inject(['layout', 'uiWorkspace'], (scope) => {
      scope.slots.inject('conversation.header.leading', () => scope.slots.register({
        name: 'conversation.header.leading',
        inject: () => ({ onClick: () => scope.layout.selectPanel('phoenix-office' as MainPanelId) }),
      }, OfficeReturn))
      scope.slots.inject('main', () => scope.slots.register({
        name: 'main', key: 'phoenix-office',
        inject: () => ({
          onHome: () => {
            scope.layout.selectPanel(null)
            scope.uiWorkspace.startSession()
          },
          onOpenNative: (sessionId?: string) => { openNativeBotSurface(sessionId) },
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
