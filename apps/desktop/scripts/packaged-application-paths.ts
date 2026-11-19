/** Resolve the packaged application layout without assuming the upstream product identity. */
import { join } from 'node:path'
import type { DesktopAutoUpdateTarget } from './desktop-auto-update-environment.mjs'

export interface PackagedApplicationPaths {
  readonly application: string
  readonly resources: string
  readonly executable: string
}

/**
 * Locate the unpacked application produced by electron-builder for a desktop target.
 * Phoenix and upstream Harness builds deliberately use distinct product and process names.
 */
export function packagedApplicationPaths(
  artifacts: string,
  target: DesktopAutoUpdateTarget,
  brand: string | undefined,
): PackagedApplicationPaths {
  const productName = brand === 'phoenix' ? 'Phoenix AI' : 'DeepSeek Harness'
  if (target === 'win-x64') {
    const application = join(artifacts, 'win-unpacked')
    return {
      application,
      resources: join(application, 'resources'),
      executable: join(application, `${productName}.exe`),
    }
  }
  const application = join(
    artifacts,
    target === 'mac-arm64' ? 'mac-arm64' : 'mac',
    `${productName}.app`,
    'Contents',
  )
  return {
    application,
    resources: join(application, 'Resources'),
    executable: join(application, 'MacOS', productName),
  }
}
