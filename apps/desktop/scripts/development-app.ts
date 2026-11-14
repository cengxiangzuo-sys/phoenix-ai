/** macOS development bundle that loads the current workspace through Electron. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Workspace and runtime settings captured for Launch Services cold starts. */
export interface DevelopmentAppOptions {
  readonly electron: string
  readonly appRoot: string
  readonly directory: string
  readonly home: string
  readonly userData: string
  readonly mainPort: number
  readonly rendererPort: number
  readonly hostPort: number
  readonly openDevtools: string
}

function quote(value: string): string { return `'${value.replaceAll("'", "'\\''")}'` }

function prepareNativeLauncher(executable: string, script: string): void {
  const source = `#include <stdio.h>\n#include <stdlib.h>\n#include <unistd.h>\nint main(int argc, char **argv) {\n  char **args = calloc((size_t)argc + 2, sizeof(char *));\n  if (args == NULL) return 1;\n  args[0] = "/bin/sh";\n  args[1] = ${JSON.stringify(script)};\n  for (int i = 1; i < argc; i++) args[i + 1] = argv[i];\n  execv("/bin/sh", args);\n  perror("desktop development launcher");\n  return 1;\n}\n`
  execFileSync('/usr/bin/cc', ['-x', 'c', '-', '-o', executable], { input: source, stdio: ['pipe', 'pipe', 'pipe'] })
}

function preparePhoenixIcon(bundle: string, source: string): void {
  const iconset = join(bundle, 'Contents', 'Resources', 'Phoenix.iconset')
  execFileSync('/bin/mkdir', ['-p', iconset])
  try {
    const sizes: readonly (readonly [number, string])[] = [
      [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
      [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
      [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
      [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
      [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
    ]
    for (const [size, name] of sizes) {
      execFileSync('/usr/bin/sips', ['-z', String(size), String(size), source, '--out', join(iconset, name)], { stdio: 'pipe' })
    }
    execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', join(bundle, 'Contents', 'Resources', 'phoenix.icns')])
  } finally {
    rmSync(iconset, { recursive: true, force: true })
  }
}

/**
 * Prepare and register a disposable .app without changing the installed Electron package.
 * @param options - Current workspace, Electron binary, and private development locations.
 * @returns executable used by the supported desktop development launcher.
 */
export function prepareDevelopmentApp(options: DevelopmentAppOptions): string {
  const source = dirname(dirname(dirname(options.electron)))
  const phoenix = process.env.DSH_CLIENT_BRAND === 'phoenix'
  const iconSource = join(options.appRoot, 'resources', 'phoenix-icon.png')
  const bundle = join(options.directory, phoenix ? 'Phoenix AI Dev.app' : 'Harness Dev.app')
  const executableName = phoenix ? 'PhoenixAIDev' : 'HarnessDev'
  const executable = join(bundle, 'Contents', 'MacOS', executableName)
  const stamp = join(bundle, 'Contents', 'Resources', 'dsh-development.json')
  const launcher = developmentLauncher(options, bundle)
  const identity = JSON.stringify({ ...options, launcher, launcherKind: phoenix ? 'native-v1' : 'shell', plist: readFileSync(join(source, 'Contents', 'Info.plist'), 'utf8'),
    icon: phoenix ? createHash('sha256').update(readFileSync(iconSource)).digest('hex') : undefined })
  if (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== identity) {
    rmSync(bundle, { recursive: true, force: true })
    execFileSync('/usr/bin/ditto', [source, bundle])
    const plist = join(bundle, 'Contents', 'Info.plist')
    const values = {
      CFBundleIdentifier: `${phoenix ? 'ai.phoenix.desktop.dev' : 'com.deepseek.harness.dev'}.${createHash('sha256').update(options.appRoot).digest('hex').slice(0, 12)}`,
      CFBundleName: phoenix ? 'Phoenix AI Dev' : 'Harness Dev',
      CFBundleDisplayName: phoenix ? 'Phoenix AI Dev' : 'Harness Dev',
      CFBundleExecutable: executableName,
      ...(phoenix ? { CFBundleIconFile: 'phoenix.icns' } : {}),
      CFBundleURLTypes: [{ CFBundleURLName: phoenix ? 'Phoenix AI' : 'DeepSeek Harness', CFBundleURLSchemes: [phoenix ? 'phoenix-ai' : 'dsh'], CFBundleTypeRole: 'Viewer' }],
    }
    for (const [key, value] of Object.entries(values)) {
      execFileSync('/usr/bin/plutil', ['-replace', key, '-json', JSON.stringify(value), plist])
    }
    if (phoenix) {
      const script = `${executable}.sh`
      writeFileSync(script, launcher, { mode: 0o755 })
      prepareNativeLauncher(executable, script)
    } else {
      writeFileSync(executable, launcher, { mode: 0o755 })
    }
    if (phoenix) preparePhoenixIcon(bundle, iconSource)
    writeFileSync(stamp, identity, { mode: 0o600 })
    execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'pipe' })
  }
  execFileSync('/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister', ['-f', bundle])
  return executable
}

/**
 * Create the development executable used by both the CLI and Launch Services.
 * @param options - Persisted development locations and debugging settings.
 * @param bundle - Generated application bundle.
 * @returns shell program with literal arguments and environment values.
 */
export function developmentLauncher(options: DevelopmentAppOptions, bundle: string): string {
  const environment = {
    DSH_HOME: options.home,
    DSH_DESKTOP_DSH_DIR: join(options.directory, 'project'),
    ...(process.env.DSH_CLIENT_BRAND === 'phoenix'
      ? {
        DSH_DESKTOP_PRIMARY_RUNTIME_DIR: join(options.directory, 'runtime', 'primary-runtime'),
        DSH_DESKTOP_DIAGNOSTIC_FILE: join(options.directory, 'startup-error.txt'),
      }
      : {}),
    DSH_DESKTOP_DEV_APP: '1',
    DSH_DESKTOP_HOST_INSPECT_PORT: String(options.hostPort),
    DSH_DESKTOP_OPEN_DEVTOOLS: options.openDevtools,
    ELECTRON_ENABLE_LOGGING: '1',
  }
  const args = [
    join(bundle, 'Contents', 'MacOS', 'Electron'),
    `--inspect=127.0.0.1:${String(options.mainPort)}`,
    `--remote-debugging-port=${String(options.rendererPort)}`,
    `--user-data-dir=${options.userData}`,
    options.appRoot,
  ]
  return [
    '#!/bin/sh',
    ...Object.entries(environment).map(([key, value]) => `export ${key}=${quote(value)}`),
    `cd ${quote(options.appRoot)}`,
    `exec ${args.map(quote).join(' ')} "$@"`,
    '',
  ].join('\n')
}
