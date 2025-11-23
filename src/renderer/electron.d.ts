import { IPC_CHANNELS } from '@/shared/ipc'

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, func: (...args: any[]) => void) => void
        off: (channel: string, func: (...args: any[]) => void) => void
      }
      IPC_CHANNELS: typeof IPC_CHANNELS
    }
  }
}

export {}
