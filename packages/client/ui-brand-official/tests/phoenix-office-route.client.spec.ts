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

describe('Office live work animation', () => {
  it('keeps rendering after a task changes its visible hand prop', () => {
    const start = sceneSource.indexOf('function frame(now)')
    const frameSource = sceneSource.slice(start, sceneSource.indexOf('\nconst ray=', start))
    const rotation = () => ({ x: 0, y: 0, z: 0, set: () => {} })
    const employee = {
      id: 'worker', type: 'read', visualType: 'read', status: 'working', meeting: false, speaking: false,
      nextBreak: Number.POSITIVE_INFINITY, trip: null, break: null,
      mug: { visible: false }, readProp: { visible: false }, boardProp: { visible: false },
      pen: { visible: false }, headset: { visible: false }, halo: { visible: false },
      g: { position: { y: 0 }, rotation: rotation() }, head: { rotation: rotation() },
      arms: [{ rotation: rotation() }, { rotation: rotation() }],
      legs: [{ rotation: rotation() }, { rotation: rotation() }],
    }
    const render = { count: 0 }
    const frame = new Function('employee', 'render', `
      let elapsed=0,last=0;const playing=true,document={hidden:false},clerks=[],employees=[employee],selected='';
      const cameraFit=()=>{},renderer={render:()=>{render.count++}},scene={},camera={};
      const animateWork=()=>{},beginBreak=()=>{},requestAnimationFrame=()=>{};
      ${frameSource}; return frame;
    `)(employee, render) as (now: number) => void
    expect(() => frame(1000)).not.toThrow()
    expect(employee.readProp.visible).toBe(true)
    employee.visualType = 'draw'
    expect(() => frame(1016)).not.toThrow()
    expect(employee.readProp.visible).toBe(false)
    expect(employee.pen.visible).toBe(true)
    expect(render.count).toBe(2)
  })
})

describe('Meeting room seating', () => {
  it('fits at least ten distinct seats inside the meeting room', () => {
    const start = sceneSource.indexOf('function slotFor(')
    const source = sceneSource.slice(start, sceneSource.indexOf('\nfunction seatFacing(', start))
    const slotFor = new Function(`${source}; return slotFor`)() as (mode: string, index: number, count: number) => [number, number]
    const seats = Array.from({ length: 10 }, (_, index) => slotFor('discussion', index, 10))
    expect(new Set(seats.map(seat => seat.join(','))).size).toBe(10)
    expect(seats.every(([x, z]) => Math.abs(x) < 3.25 && z > -10 && z < -5.45)).toBe(true)
    const gaps = seats.flatMap((seat, index) => seats.slice(index + 1)
      .map(other => Math.hypot(seat[0] - other[0], seat[1] - other[1])))
    expect(Math.min(...gaps)).toBeGreaterThan(0.69)
  })
})
