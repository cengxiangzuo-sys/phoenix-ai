import css from './OfficeReturn.module.css'
import { isNativeBotSurface } from './NativeBotSurface.tsx'

/** Conversation header entry back to the Phoenix office. */
export function OfficeReturn({ onClick }: { onClick: () => void }) {
  if (!isNativeBotSurface()) return null
  return <button type="button" className={css.back} onClick={onClick} aria-label="返回 AI 办公室">← <span>AI 办公室</span></button>
}
