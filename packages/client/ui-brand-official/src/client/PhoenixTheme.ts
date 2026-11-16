import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

const INITIAL_THEME_KEY = 'phoenix.ui.initial-theme.v1'

/** Phoenix colors applied through the native theme registry in both schemes. */
export const PHOENIX_THEME_TOKENS = {
  '--dsw-alias-bg-base': { light: '#fffaf4', dark: '#21130f' },
  '--dsw-alias-bg-layer-1': { light: '#fff7ee', dark: '#2b1913' },
  '--dsw-alias-bg-layer-2': { light: '#fff1e5', dark: '#342119' },
  '--dsw-alias-bg-layer-3': { light: '#ffe9d6', dark: '#3d281e' },
  '--dsw-alias-bg-module-platform': { light: '#fff2e6', dark: '#302019' },
  '--dsw-alias-bg-overlay': { light: '#fff7ef', dark: '#39251c' },
  '--dsw-alias-border-l2': { light: 'rgb(115 65 33 / 0.13)', dark: 'rgb(255 187 132 / 0.14)' },
  '--dsw-alias-border-l3': { light: 'rgb(115 65 33 / 0.17)', dark: 'rgb(255 187 132 / 0.19)' },
  '--dsw-alias-border-l4': { light: 'rgb(115 65 33 / 0.23)', dark: 'rgb(255 187 132 / 0.27)' },
  '--dsw-alias-brand-primary': { light: '#e96909', dark: '#ff8c28' },
  '--dsw-alias-brand-text': { light: '#d95c06', dark: '#ff9c42' },
  '--dsw-alias-button-primary-fill': { light: '#f57a08', dark: '#ff8a0b' },
  '--dsw-alias-button-primary-hover': { light: '#e36b06', dark: '#ffa129' },
  '--dsw-alias-button-primary-dimmed': { light: '#ffe7d0', dark: '#5b3925' },
  '--dsw-alias-button-elevated-fill': { light: '#fff9f2', dark: '#352119' },
  '--dsw-alias-button-floating-fill': { light: '#fffaf5', dark: '#3d281f' },
  '--dsw-alias-button-floating-hover': { light: '#fff0e2', dark: '#4a3024' },
  '--dsw-alias-button-info-fill': { light: '#f57a08', dark: '#ff8a0b' },
  '--dsw-alias-button-info-hover': { light: '#e36b06', dark: '#ffa129' },
  '--dsw-alias-interactive-bg-active': { light: 'rgb(243 120 12 / 0.17)', dark: 'rgb(255 146 52 / 0.2)' },
  '--dsw-alias-interactive-bg-hover': { light: 'rgb(243 120 12 / 0.09)', dark: 'rgb(255 146 52 / 0.1)' },
  '--dsw-alias-interactive-bg-hover-solid': { light: '#fff0e1', dark: '#3d291f' },
  '--dsw-alias-label-caption': { light: '#91786c', dark: '#a99489' },
  '--dsw-alias-label-primary': { light: '#302018', dark: '#fff8f2' },
  '--dsw-alias-label-primary-inverted': { light: '#fffaf5', dark: '#25140e' },
  '--dsw-alias-label-secondary': { light: '#6e574c', dark: '#ddc8bd' },
  '--dsw-alias-label-tertiary': { light: '#806b60', dark: '#baa69c' },
  '--dsw-alias-link': { light: '#c95508', dark: '#ff9d48' },
  '--dsw-alias-state-business-primary': { light: '#e56e0c', dark: '#ff9b36' },
  '--dsw-alias-state-business-tertiary': { light: '#fff0df', dark: '#59351e' },
  '--dsw-specific-bubble': { light: '#fff0e2', dark: '#3b251c' },
  '--dsw-specific-bubble-highlight': { light: '#ffe5ca', dark: '#59351f' },
  '--dsw-specific-input-major': { light: '#fffdf9', dark: '#342119' },
  '--dsw-specific-login-input': { light: '#fff7ef', dark: '#35231c' },
  '--dsw-specific-menu': { light: '#fff9f2', dark: '#38251d' },
  '--dsw-specific-selector': { light: '#fff0e1', dark: '#3b291f' },
  '--dsw-specific-sidebar-fill': { light: '#f7eee5', dark: '#1a100d' },
  '--dsw-specific-sidebar-nav-item-active': { light: '#ffe7ce', dark: '#452b1e' },
  '--dsw-specific-sidebar-nav-item-active-accent': { light: '#ffd8b1', dark: '#58331c' },
} satisfies ThemeTokenOverrides

/** Attach Phoenix's palette without changing other client build profiles. */
export function installPhoenixTheme(ctx: ClientContext): void {
  ctx.inject(['theme'], (scope) => {
    scope.effect(() => scope.theme.overrideTokens('phoenix-brand', PHOENIX_THEME_TOKENS), 'phoenix-brand: theme colors')
    scope.effect(() => {
      document.body.dataset.phoenixBrand = ''
      return () => { delete document.body.dataset.phoenixBrand }
    }, 'phoenix-brand: shell styling')
    if (typeof localStorage === 'undefined') return
    try {
      // Keep the office service in the native Harness shell.
      if (localStorage.getItem('ds-bot:surface') === null) localStorage.setItem('ds-bot:surface', 'agent')
      if (localStorage.getItem(INITIAL_THEME_KEY) !== null) return
      localStorage.setItem(INITIAL_THEME_KEY, '1')
      if (scope.theme.getTheme().preference === 'system') scope.theme.setTheme('dark')
    } catch (_error) {
      // Storage may be unavailable in an embedded browser; its current preference remains usable.
    }
  })
}
