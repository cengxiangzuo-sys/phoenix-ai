/** Read-only bridge for the local companion renderer. */
import { contextBridge, ipcRenderer } from 'electron'
import { PET_STATE } from './phoenix-pet-protocol.ts'

if (process.isMainFrame && location.protocol === 'file:' && location.pathname.endsWith('/renderer/phoenix-desktop-pet.html')) {
  contextBridge.exposeInMainWorld('phoenixCompanion', {
    subscribe(listener: (state: unknown) => void) {
      ipcRenderer.on(PET_STATE, (_event, state: unknown) => { listener(state) })
    },
  })
}
