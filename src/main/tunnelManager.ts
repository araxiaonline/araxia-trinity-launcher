import net from 'net'
import { ServerConfig, TunnelStatus, ServerStatus } from '../shared/types'

interface ActiveTunnel {
  localPort: number
  remoteHost: string
  remotePort: number
  server: net.Server
}

interface ActiveConnection {
  serverId: string
  status: TunnelStatus
  retryCount: number
  retryTimer?: NodeJS.Timeout
  tunnels: Map<number, ActiveTunnel>
}

export class TunnelManager {
  private activeConnections: Map<string, ActiveConnection> = new Map()
  private statusCallbacks: ((status: ServerStatus) => void)[] = []
  private maxRetries = 10
  private baseRetryDelay = 1000 // 1 second

  /**
   * Subscribe to status updates
   */
  onStatusUpdate(callback: (status: ServerStatus) => void): void {
    this.statusCallbacks.push(callback)
  }

  /**
   * Calculate exponential backoff delay
   */
  private getRetryDelay(retryCount: number): number {
    const delay = this.baseRetryDelay * Math.pow(2, retryCount)
    return Math.min(delay, 60000) // Cap at 60 seconds
  }

  /**
   * Emit status update to all subscribers
   */
  private emitStatus(status: ServerStatus): void {
    this.statusCallbacks.forEach(cb => cb(status))
  }

  /**
   * Connect to a server and establish TCP tunnels
   */
  async connect(server: ServerConfig, serverId: string): Promise<void> {
    try {
      // Check if already connected
      if (this.activeConnections.has(serverId)) {
        throw new Error(`Already connected to ${serverId}`)
      }

      const tunnels = new Map<number, ActiveTunnel>()
      let successCount = 0

      // Update status to connecting
      this.emitStatus({
        serverId,
        status: 'connecting',
        tunnels: server.tunnels.map((_, idx) => ({
          serverId,
          tunnelIndex: idx,
          status: 'connecting',
        })),
      })

      // Establish TCP tunnels
      for (let i = 0; i < server.tunnels.length; i++) {
        const tunnel = server.tunnels[i]

        try {
          const server_instance = await this.createTcpTunnel(
            tunnel.localPort,
            server.host,
            tunnel.remotePort,
            tunnel.name
          )

          tunnels.set(i, {
            localPort: tunnel.localPort,
            remoteHost: server.host,
            remotePort: tunnel.remotePort,
            server: server_instance,
          })

          successCount++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`Failed to establish tunnel ${i} (${tunnel.name}): ${errorMsg}`)
        }
      }

      // Store active connection
      this.activeConnections.set(serverId, {
        serverId,
        status: successCount === server.tunnels.length ? 'connected' : 'error',
        retryCount: 0,
        tunnels,
      })

      // Emit status update
      this.emitStatus({
        serverId,
        status: successCount === server.tunnels.length ? 'connected' : 'error',
        tunnels: Array.from(tunnels.entries()).map(([idx]) => ({
          serverId,
          tunnelIndex: idx,
          status: 'connected',
        })),
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.emitStatus({
        serverId,
        status: 'error',
        tunnels: [],
        lastError: errorMsg,
      })
      this.scheduleReconnect(server, serverId, 0)
    }
  }

  /**
   * Create a TCP tunnel that forwards local port to remote host:port
   */
  private createTcpTunnel(
    localPort: number,
    remoteHost: string,
    remotePort: number,
    tunnelName: string
  ): Promise<net.Server> {
    return new Promise((resolve, reject) => {
      // First, test if we can connect to the remote host
      const testConnection = net.createConnection(remotePort, remoteHost, () => {
        console.log(`Successfully validated remote connection: ${remoteHost}:${remotePort}`)
        testConnection.end()
        
        // Now create the actual tunnel server
        const server = net.createServer((socket) => {
          // Create connection to remote server
          const remote = net.createConnection(remotePort, remoteHost, () => {
            socket.pipe(remote)
            remote.pipe(socket)
          })

          remote.on('error', (err) => {
            console.error(`Remote connection error for ${tunnelName}: ${err.message}`)
            socket.destroy()
          })

          socket.on('error', (err) => {
            console.error(`Local socket error for ${tunnelName}: ${err.message}`)
            remote.destroy()
          })
        })

        server.on('error', (err) => {
          reject(err)
        })

        server.listen(localPort, '127.0.0.1', () => {
          console.log(`TCP tunnel listening on 127.0.0.1:${localPort} -> ${remoteHost}:${remotePort}`)
          resolve(server)
        })
      })

      testConnection.on('error', (err) => {
        console.error(`Failed to connect to remote ${remoteHost}:${remotePort}: ${err.message}`)
        reject(new Error(`Cannot reach ${remoteHost}:${remotePort} - ${err.message}`))
      })

      // Set a timeout for the test connection
      testConnection.setTimeout(5000, () => {
        testConnection.destroy()
        reject(new Error(`Connection timeout to ${remoteHost}:${remotePort}`))
      })
    })
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(server: ServerConfig, serverId: string, retryCount: number): void {
    if (retryCount >= this.maxRetries) {
      this.emitStatus({
        serverId,
        status: 'error',
        tunnels: [],
        lastError: `Max retries (${this.maxRetries}) exceeded`,
      })
      return
    }

    const delay = this.getRetryDelay(retryCount)
    const timer = setTimeout(() => {
      this.connect(server, serverId).catch(() => {
        this.scheduleReconnect(server, serverId, retryCount + 1)
      })
    }, delay)

    // Store timer for cleanup
    const connection = this.activeConnections.get(serverId)
    if (connection) {
      connection.retryTimer = timer
      connection.retryCount = retryCount
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.activeConnections.get(serverId)
    if (!connection) return

    if (connection.retryTimer) {
      clearTimeout(connection.retryTimer)
    }

    // Close all tunnel servers
    for (const tunnel of connection.tunnels.values()) {
      tunnel.server.close()
    }

    this.activeConnections.delete(serverId)

    this.emitStatus({
      serverId,
      status: 'disconnected',
      tunnels: [],
    })
  }

  /**
   * Get status of all tunnels for a server
   */
  getServerStatus(serverId: string): ServerStatus {
    const connection = this.activeConnections.get(serverId)
    if (!connection) {
      return {
        serverId,
        status: 'disconnected',
        tunnels: [],
      }
    }

    const tunnelStatuses = Array.from(connection.tunnels.entries()).map(([idx]) => ({
      serverId,
      tunnelIndex: idx,
      status: 'connected' as const,
    }))

    return {
      serverId,
      status: connection.status,
      tunnels: tunnelStatuses,
    }
  }
}
