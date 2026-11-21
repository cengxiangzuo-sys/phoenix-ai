/** Prepare pnpm's offline seed for the Phoenix Desktop profile. */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PHOENIX_PLUGIN_SEEDS, PHOENIX_PLUGINS_SEED, PHOENIX_REMOTE_REGISTRY } from '../src/phoenix-remote.ts'

const execute = promisify(execFile)

/**
 * Cache the bundled plugins and their dependencies using Desktop's pinned pnpm.
 * @param runtime - Directory whose resources are available to the app.
 * @param pnpm - Path to the bundled pnpm entry.
 */
export async function preparePhoenixPluginSeeds(runtime: string, pnpm: string): Promise<void> {
  const destination = join(runtime, PHOENIX_PLUGINS_SEED)
  if (existsSync(destination)) return
  await mkdir(runtime, { recursive: true })
  const staging = await mkdtemp(join(runtime, '.phoenix-plugin-'))
  try {
    const seed = join(staging, 'seed')
    await writeFile(join(staging, 'package.json'), '{"name":"phoenix-plugin-seed","private":true}\n')
    await writeFile(join(staging, 'pnpm-workspace.yaml'), 'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n')
    await execute(process.execPath, [
      pnpm, 'add', '--ignore-scripts', '--save-exact',
      `--registry=${PHOENIX_REMOTE_REGISTRY}`, `--store-dir=${join(seed, 'store')}`,
      `--cache-dir=${join(seed, 'cache')}`, ...PHOENIX_PLUGIN_SEEDS.map(plugin => `${plugin.packageName}@${plugin.version}`),
    ], { cwd: staging, timeout: 120_000 })
    if (!existsSync(destination)) await rename(seed, destination)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}
