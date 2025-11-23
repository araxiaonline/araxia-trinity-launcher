// Tunnel configuration
export interface TunnelConfig {
  localPort: number
  remotePort: number
  name: string
}

// Server type
export type ServerType = 'auth' | 'world'

// Server configuration
export interface ServerConfig {
  name: string
  host: string
  serverType: ServerType
  tunnels: TunnelConfig[]
}

// Application configuration
export interface AppConfig {
  version?: number  // Config version for migrations
  servers: ServerConfig[]
  autoConnect?: boolean
}

// Tunnel status
export type TunnelStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface TunnelStatusUpdate {
  serverId: string
  tunnelIndex: number
  status: TunnelStatus
  error?: string
}

export interface ServerStatus {
  serverId: string
  status: TunnelStatus
  tunnels: TunnelStatusUpdate[]
  lastError?: string
}
