/** Seed an ordinary npm plugin before Phoenix starts its Desktop Host. */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { readProfileManifest } from '@deepseek-ai/dsh-app-boot'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { runProfilePnpm } from '@deepseek-ai/dsh-plugin-manager/operations'
import { desktopNodeEnvironment } from './node-environment.ts'

export const PHOENIX_REMOTE_PACKAGE = 'ds-harness-remote'
export const PHOENIX_REMOTE_VERSION = '0.6.5'
export const PHOENIX_OFFICE_PACKAGE = 'ds-bot'
export const PHOENIX_REMOTE_REGISTRY = 'https://registry.npmjs.org/'

interface PluginSeed {
  readonly packageName: string
  readonly version: string
  readonly marker: string
  readonly migrateFrom?: string
}

/** The plugin versions and receipt names shipped in Phoenix builds. */
export const PHOENIX_PLUGIN_SEEDS: readonly PluginSeed[] = [
  { packageName: PHOENIX_REMOTE_PACKAGE, version: PHOENIX_REMOTE_VERSION,
    marker: 'phoenix-remote-seeded', migrateFrom: '0.6.4' },
  { packageName: PHOENIX_OFFICE_PACKAGE, version: '0.3.6', marker: 'phoenix-office-seeded' },
]
/** Bundled store shared by the office and pairing plugins' offline installs. */
export const PHOENIX_PLUGINS_SEED = `phoenix-plugins-${PHOENIX_PLUGIN_SEEDS.map(plugin => plugin.version).join('-')}`

interface PluginSeedOptions {
  readonly profile: string
  readonly runtime: { readonly node: string; readonly pnpm: string; readonly nodeBin: string; readonly dsh: string }
  readonly seed: string
}

const execute = promisify(execFile)

/** Import the pinned pnpm store index without replacing records that other profiles use. */
async function importSeedStore(source: string, destination: string): Promise<void> {
  await cp(join(source, 'files'), join(destination, 'files'), { recursive: true, force: false })
  const seed = pathToFileURL(join(source, 'index.db'))
  seed.searchParams.set('immutable', '1')
  const index = new DatabaseSync(join(destination, 'index.db'))
  try {
    index.exec('PRAGMA busy_timeout = 5000')
    index.prepare('ATTACH DATABASE ? AS phoenix').run(seed.href)
    index.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS main.package_index (
        key TEXT PRIMARY KEY, data BLOB NOT NULL
      ) WITHOUT ROWID;
      INSERT OR IGNORE INTO main.package_index (key, data)
        SELECT key, data FROM phoenix.package_index;
      COMMIT;
    `)
  } finally {
    index.close()
  }
}

/**
 * Install a shipped plugin for a new profile or migrate its previous seed.
 * Keep versions selected by the plugin manager and preserve an explicit removal.
 * @param options - The Desktop profile, bundled package manager, and offline seed directory.
 * @param plugin - Pinned package and receipt for the feature being seeded.
 */
export async function seedPhoenixPlugin({ profile, runtime, seed }: PluginSeedOptions, plugin: PluginSeed): Promise<void> {
  const marker = join(profile, '.plugin-manager', plugin.marker)
  await withFileLock(join(profile, 'package.json'), async () => {
    const previous = existsSync(marker) ? (await readFile(marker, 'utf8')).trim() : undefined
    if (previous === plugin.version) return
    const manifest = readProfileManifest('dsh', profile)
    const dependency = manifest.dependencies?.[plugin.packageName]
    const firstInstall = previous === undefined && dependency === undefined
    const migrateBundled = previous !== undefined && previous === plugin.migrateFrom && dependency === previous
    if (firstInstall || migrateBundled) {
      const cache = await mkdtemp(join(tmpdir(), 'phoenix-plugin-cache-'))
      const env = desktopNodeEnvironment(runtime.node, runtime.nodeBin, process.env)
      try {
        const { stdout } = await execute(runtime.node, ['--expose-internals', runtime.pnpm, 'store', 'path'], {
          cwd: profile, env, timeout: 10_000,
        })
        const storePath = stdout.trim()
        if (!isAbsolute(storePath)) throw new Error(`${plugin.packageName}: pnpm did not report an absolute store path`)
        const seedStore = join(seed, 'store')
        const storeVersion = basename(storePath)
        if (!(await readdir(seedStore)).includes(storeVersion)) throw new Error(`${plugin.packageName}: incompatible bundled pnpm store`)
        await importSeedStore(join(seedStore, storeVersion), storePath)
        await cp(join(seed, 'cache'), cache, { recursive: true, force: false })
        const result = await runProfilePnpm({
          profile: 'desktop', dir: profile, cwd: profile,
          installAnchor: join(runtime.dsh, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
        }, [
          // Existing lockfile packages keep their recorded resolutions during the offline migration.
          'add', '--offline', '--trust-lockfile', '--ignore-scripts', '--save-exact',
          `--cache-dir=${cache}`, `--store-dir=${dirname(storePath)}`,
          `--registry=${PHOENIX_REMOTE_REGISTRY}`, `${plugin.packageName}@${plugin.version}`,
        ], {
          command: runtime.node, args: ['--expose-internals', runtime.pnpm],
          env: {
            ELECTRON_RUN_AS_NODE: '1', DSH_DESKTOP_NODE_EXECUTABLE: runtime.node, PATH: env.PATH ?? '',
            NPM_CONFIG_OFFLINE: 'true', NPM_CONFIG_CACHE_DIR: cache,
          },
          execution: 'service', outputBytes: 4096, idleTimeoutMs: 20_000, lookupTimeoutMs: 1_000,
        })
        if (result.exitCode !== 0) throw new Error(`${plugin.packageName}: bundled installation failed, see ${result.logPath}`)
        const installed = readProfileManifest('dsh', join(profile, 'node_modules', plugin.packageName))
        if (installed.version !== plugin.version) throw new Error(`${plugin.packageName}: installed version differs from the bundled version`)
      } finally {
        await rm(cache, { recursive: true, force: true })
      }
    }
    await mkdir(join(profile, '.plugin-manager'), { recursive: true })
    await writeFileAtomic(marker, `${plugin.version}\n`, { mode: 0o600 })
  })
}
