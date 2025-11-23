// IPC Channel names
export const IPC_CHANNELS = {
  // Tunnel commands
  TUNNEL_CONNECT: 'tunnel:connect',
  TUNNEL_DISCONNECT: 'tunnel:disconnect',
  
  // Status updates
  TUNNEL_STATUS_UPDATE: 'tunnel:status-update',
  TUNNEL_ERROR: 'tunnel:error',
  
  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SAVE: 'config:save',
  CONFIG_LOADED: 'config:loaded',
  
  // Server
  SERVER_STATUS: 'server:status',
}

// Type definitions for IPC messages
export interface IPCMessage<T = any> {
  channel: string
  data: T
}
