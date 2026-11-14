import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import flame from './assets/phoenix-flame.svg'
import css from './PhoenixBrand.module.css'

/** Phoenix's independent sidebar identity; native navigation stays in its owner. */
export function PhoenixBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <img className={css.mark} src={flame} width={size} height={size} alt="" />
}

export function PhoenixBrandName() {
  return <span className={css.name}>Phoenix <span>AI</span></span>
}
