import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { packagedApplicationPaths } from '../scripts/packaged-application-paths.ts'

describe('packaged application paths', () => {
  it('uses the independent Phoenix process name on Windows', () => {
    expect(packagedApplicationPaths('artifacts', 'win-x64', 'phoenix')).toEqual({
      application: join('artifacts', 'win-unpacked'),
      resources: join('artifacts', 'win-unpacked', 'resources'),
      executable: join('artifacts', 'win-unpacked', 'Phoenix AI.exe'),
    })
  })

  it('uses the Phoenix bundle and executable names on Apple Silicon', () => {
    expect(packagedApplicationPaths('artifacts', 'mac-arm64', 'phoenix')).toEqual({
      application: join('artifacts', 'mac-arm64', 'Phoenix AI.app', 'Contents'),
      resources: join('artifacts', 'mac-arm64', 'Phoenix AI.app', 'Contents', 'Resources'),
      executable: join('artifacts', 'mac-arm64', 'Phoenix AI.app', 'Contents', 'MacOS', 'Phoenix AI'),
    })
  })

  it('preserves the upstream Harness identity', () => {
    expect(packagedApplicationPaths('artifacts', 'win-x64', undefined).executable)
      .toBe(join('artifacts', 'win-unpacked', 'DeepSeek Harness.exe'))
    expect(packagedApplicationPaths('artifacts', 'mac-x64', undefined).application)
      .toBe(join('artifacts', 'mac', 'DeepSeek Harness.app', 'Contents'))
  })
})
