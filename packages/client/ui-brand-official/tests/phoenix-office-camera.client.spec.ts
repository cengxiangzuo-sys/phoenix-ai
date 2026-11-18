// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cameraControlsSource } from '../src/client/office/camera-controls.ts'

type Camera = { yaw: number; pitch: number; zoom: number; dragged: boolean }
function setup() {
  const canvas = document.createElement('canvas')
  const reset = document.createElement('button')
  canvas.setPointerCapture = vi.fn()
  canvas.hasPointerCapture = () => true
  canvas.releasePointerCapture = vi.fn()
  // Execute the exact offline script shipped inside the sandboxed scene.
  const install = new Function(`${cameraControlsSource}; return installOfficeCameraControls`)() as (canvas: HTMLCanvasElement, reset: HTMLButtonElement, onTap: () => void) => Camera
  const onTap = vi.fn()
  const camera = install(canvas, reset, onTap)
  const pointer = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0 })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    canvas.dispatchEvent(event)
  }
  return { canvas, reset, camera, pointer, onTap }
}

describe('Office camera gestures', () => {
  it('rotates on drag, suppresses employee clicks after dragging and releases cancelled gestures', () => {
    const { camera, pointer } = setup()
    const initial = { ...camera }
    pointer('pointerdown', 20, 20)
    pointer('pointermove', 22, 20)
    expect(camera.dragged).toBe(false)
    pointer('pointermove', 100, 60)
    expect(camera.yaw).not.toBe(initial.yaw)
    expect(camera.pitch).toBeGreaterThan(initial.pitch)
    expect(camera.dragged).toBe(true)
    pointer('pointercancel', 100, 60)
    const cancelled = camera.yaw
    pointer('pointermove', 200, 60)
    expect(camera.yaw).toBe(cancelled)
    pointer('pointerdown', 30, 30)
    expect(camera.dragged).toBe(false)
  })
  it('zooms with pixel and line wheels, prevents page scrolling, clamps and resets the view', () => {
    const { canvas, camera, reset } = setup()
    const initial = { ...camera }
    const wheel = new WheelEvent('wheel', { deltaY: -3, deltaMode: 1, cancelable: true })
    canvas.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(camera.zoom).toBeGreaterThan(initial.zoom)
    for (let i = 0; i < 40; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -900 }))
    expect(camera.zoom).toBe(3)
    for (let i = 0; i < 40; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 900 }))
    expect(camera.zoom).toBe(.55)
    reset.click()
    expect(camera.zoom).toBe(initial.zoom)
    expect(camera.yaw).toBe(initial.yaw)
    expect(camera.pitch).toBe(initial.pitch)
  })
})

it('selects on release without relying on browser click after pointer capture, tolerating small jitter', () => {
  const { pointer, onTap } = setup()
  pointer('pointerdown', 30, 30)
  for (let i = 0; i < 12; i++) pointer('pointermove', 30 + i % 2, 30)
  pointer('pointerup', 31, 30)
  expect(onTap).toHaveBeenCalledTimes(1)
  pointer('pointerdown', 30, 30)
  pointer('pointermove', 70, 30)
  pointer('pointerup', 70, 30)
  expect(onTap).toHaveBeenCalledTimes(1)
  pointer('pointerdown', 30, 30)
  pointer('pointercancel', 30, 30)
  expect(onTap).toHaveBeenCalledTimes(1)
  pointer('pointerdown', 30, 30)
  pointer('pointerup', 30, 30)
  expect(onTap).toHaveBeenCalledTimes(2)
})
