const VIEW_KEY = 'phoenix.office.view.v1'
const FRAME_KEY = 'phoenix.office.frame.v1'

type OfficeView = {
  selected: string
  floor: number
  focused: boolean
  playing: boolean
  roomId: string
  hall: boolean
}

function read(key: string): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null')
  } catch (_error) {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (_error) {
    // Navigation still works if the window does not allow presentation storage.
  }
}

export function readOfficeView(): OfficeView {
  const stored = read(VIEW_KEY) as Partial<OfficeView> | null
  return {
    selected: typeof stored?.selected === 'string' ? stored.selected : '',
    floor: Number.isSafeInteger(stored?.floor) ? Math.max(0, stored?.floor ?? 0) : 0,
    focused: stored?.focused === true,
    playing: typeof stored?.playing === 'boolean'
      ? stored.playing : !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    roomId: typeof stored?.roomId === 'string' ? stored.roomId : '',
    hall: stored?.hall === true,
  }
}

export function saveOfficeView(view: OfficeView): void {
  write(VIEW_KEY, view)
}

export function readOfficeFrame(): unknown {
  return read(FRAME_KEY)
}

export function saveOfficeFrame(frame: unknown): void {
  write(FRAME_KEY, frame)
}
