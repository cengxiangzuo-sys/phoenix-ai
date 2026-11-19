import { describe, expect, it } from 'vitest'
import sceneSource from '../src/client/office/scene-source'

describe('Office water break return route', () => {
  it('retraces every outbound corridor waypoint for both wings and the command office', () => {
    const functions = ['pathLength', 'exitRoute', 'beginBreak'].map((name) => {
      const start = sceneSource.indexOf(`function ${name}(`)
      return sceneSource.slice(start, sceneSource.indexOf('\n', start))
    }).join('\n')
    const begin = new Function(`let elapsed=0; ${functions}; return beginBreak`)()
    for (const home of [[-6, 4], [6, 4], [-6, -2], [6, -2], [-6, -7]]) {
      const employee = { home, g: { position: { x: home[0], z: home[1] } } } as {
        home: number[]
        g: { position: { x: number; z: number } }
        trip: { route: number[][] }
        break: { returnRoute: number[][] }
      }
      begin(employee)
      const outbound = employee.trip.route
      const returning = employee.break.returnRoute
      expect(returning).toEqual([...outbound].reverse())
      expect(returning[0]).toEqual([8.55, -6.25])
      expect(returning.at(-1)).toEqual(home)
      // Every leg follows a corridor axis; the old return skipped the rear cross aisle.
      for (let i = 1; i < returning.length; i++) {
        const current = returning[i]!
        const previous = returning[i - 1]!
        expect(current[0] === previous[0] || current[1] === previous[1]).toBe(true)
      }
    }
    expect(sceneSource).toContain('const r=p.break.returnRoute;')
  })
})
