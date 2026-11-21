import { createPortal } from 'react-dom'
import css from './OfficeReturn.module.css'
import { isNativeBotSurface } from './NativeBotSurface.tsx'

/** Conversation header entry back to the Phoenix office. */
export function OfficeReturn({ onClick }: { onClick: () => void }) {
  if (!isNativeBotSurface()) return null
  const macTitlebar = document.documentElement.dataset.platform === 'darwin'
    && window.CSS?.supports('top', 'anchor(top)')
  const button = <button type="button" className={macTitlebar ? `${css.back} ${css.floating}` : css.back}
    onClick={onClick} aria-label="返回 AI 办公室">← <span>AI 办公室</span></button>
  if (!macTitlebar) return button
  // Electron applies drag rectangles in document order. Body-level controls
  // subtract their own clickable area after every drag strip inside the shell.
  return <>
    <span className={css.anchor} aria-hidden="true" />
    {createPortal(button, document.body)}
  </>
}
