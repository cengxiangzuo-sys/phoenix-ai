/** Display updates and local window dragging for the companion renderer. */
import { contextBridge, ipcRenderer } from 'electron'
import { PET_DRAG, PET_STATE } from './phoenix-pet-protocol.ts'

if (process.isMainFrame && location.protocol === 'file:' && location.pathname.endsWith('/renderer/phoenix-desktop-pet.html')) {
  contextBridge.exposeInMainWorld('phoenixCompanion', {
    drag(phase: 'start' | 'update' | 'finish' | 'cancel', delta?: { x: number; y: number }) {
      ipcRenderer.send(PET_DRAG, phase, delta)
    },
    subscribe(listener: (state: unknown) => void) {
      ipcRenderer.on(PET_STATE, (_event, state: unknown) => { listener(state) })
    },
  })
}
