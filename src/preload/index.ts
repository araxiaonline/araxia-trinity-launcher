import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'

// Expose IPC to renderer process
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => func(...args))
    },
    off: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func)
    },
  },
  IPC_CHANNELS,
})
