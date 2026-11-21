/** Phoenix desktop-only preference row in General Settings. */
import { useEffect, useState } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './PhoenixPetSettings.module.css'

/** Narrow native widget extension published by the owned Desktop preload. */
export interface PhoenixPetBridge {
  enabled(): Promise<boolean>
  setEnabled(enabled: boolean): Promise<boolean>
  reportWork(rows: readonly { id: string; title: string }[]): Promise<void>
  onEnabled(listener: (enabled: boolean) => void): () => void
  onOpenSession(listener: (id: string) => void): () => void
}

/**
 * Show and hide the same desktop companion controlled by its native menu.
 * @param props - Desktop bridge and localized labels.
 * @returns General Settings item for the desktop companion.
 */
export function PhoenixPetSettings({ bridge, t }: PropsLocale<'phoenix.office'> & { bridge: PhoenixPetBridge }) {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let mounted = true
    const unsubscribe = bridge.onEnabled((visible) => { if (mounted) setEnabled(visible) })
    void bridge.enabled().then((visible) => { if (mounted) setEnabled(visible) })
      .catch(() => { if (mounted) { setFailed(true); setEnabled(false) } })
    return () => { mounted = false; unsubscribe() }
  }, [bridge])
  return <div className={css.row}>
    <div>
      <div className={css.title}>{t('pet.title')}</div>
      <div className={css.description}>{t('pet.description')}</div>
      {failed && <div role="alert">{t('pet.failure')}</div>}
    </div>
    <Switch checked={enabled === true} disabled={enabled === undefined || busy} label={t('pet.title')}
      onChange={(next) => {
        setFailed(false)
        setBusy(true)
        void bridge.setEnabled(next).then(setEnabled).catch(() => { setFailed(true) }).finally(() => { setBusy(false) })
      }} />
  </div>
}
