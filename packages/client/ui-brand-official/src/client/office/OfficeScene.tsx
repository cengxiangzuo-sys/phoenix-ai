/** The sandboxed scene receives display records only and can request selection or creation. */
import { useEffect, useRef } from 'react'
import { officeDocument } from './document.ts'
import type { OfficePerson } from './model.ts'
import { readOfficeFrame, saveOfficeFrame } from './view-state.ts'

type Props = {
  people: OfficePerson[]
  selected: string
  focused: boolean
  playing: boolean
  floor: number
  hall: boolean
  roomId: string
  ready: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onOverview: () => void
}

/** Opaque-origin rendering frame, isolated from API credentials and persisted user data. */
export function OfficeScene(props: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const current = useRef(props)
  current.current = props
  const lastFloor = useRef(props.floor)
  const checkpointSent = useRef(false)
  const publish = () => {
    const value = current.current
    const target = frame.current?.contentWindow
    if (!value.ready || !target) return
    target.postMessage({ channel: 'phoenix-office-state',
      people: value.people, selected: value.selected, focused: value.focused,
      playing: value.playing, hall: value.hall, floorChanged: value.floor !== lastFloor.current,
      key: JSON.stringify([value.floor, value.roomId, value.hall]),
      checkpoint: checkpointSent.current ? null : readOfficeFrame(),
    }, '*')
    checkpointSent.current = true
    lastFloor.current = value.floor
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null') return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null || !('channel' in data) || data.channel !== 'phoenix-office' || !('action' in data)) return
      if (data.action === 'ready') {
        checkpointSent.current = false
        publish()
      }
      else if (data.action === 'checkpoint' && 'frame' in data) saveOfficeFrame(data.frame)
      else if (data.action === 'overview') current.current.onOverview()
      else if (data.action === 'create') current.current.onCreate()
      else if (data.action === 'select' && 'id' in data && typeof data.id === 'string' && current.current.people.some(p => p.id === data.id)) current.current.onSelect(data.id)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  useEffect(publish, [props.people, props.selected, props.focused, props.playing, props.floor, props.hall, props.roomId, props.ready])
  return <iframe ref={frame} title="AI 办公室三维场景" sandbox="allow-scripts" srcDoc={officeDocument} onLoad={publish} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
}
