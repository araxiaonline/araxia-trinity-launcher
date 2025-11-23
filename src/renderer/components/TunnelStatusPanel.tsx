import { ServerConfig, ServerStatus } from '@/shared/types'
import { Zap, AlertCircle, Loader } from 'lucide-react'

interface Props {
  server: ServerConfig
  status?: ServerStatus
  onConnect: () => void
  onDisconnect: () => void
}

export default function TunnelStatusPanel({
  server,
  status,
  onConnect,
  onDisconnect,
}: Props) {
  const isConnected = status?.status === 'connected'
  const isConnecting = status?.status === 'connecting'
  const isError = status?.status === 'error'

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{server.name}</h2>
          <p className="text-gray-400">{server.host}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConnect}
            disabled={isConnected || isConnecting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            Connect
          </button>
          <button
            onClick={onDisconnect}
            disabled={!isConnected && !isConnecting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-6 p-4 bg-gray-700 rounded">
        <div className="flex items-center gap-2">
          {isConnecting && (
            <>
              <Loader className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-yellow-400 font-semibold">Connecting...</span>
            </>
          )}
          {isConnected && (
            <>
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-semibold">Connected</span>
            </>
          )}
          {isError && (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold">Error</span>
            </>
          )}
          {!status && (
            <span className="text-gray-400 font-semibold">Disconnected</span>
          )}
        </div>
        {status?.lastError && (
          <div className="mt-2 text-sm text-red-300">{status.lastError}</div>
        )}
      </div>

      {/* Tunnels */}
      <div>
        <h3 className="text-lg font-bold mb-4">Tunnels</h3>
        <div className="space-y-3">
          {server.tunnels.map((tunnel, idx) => {
            const tunnelStatus = status?.tunnels.find(t => t.tunnelIndex === idx)
            const isConnected = tunnelStatus?.status === 'connected'
            const isConnecting = tunnelStatus?.status === 'connecting'
            const isError = tunnelStatus?.status === 'error'

            return (
              <div key={idx} className="bg-gray-700 rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{tunnel.name}</div>
                    <div className="text-sm text-gray-400">
                      localhost:{tunnel.localPort} → {server.host}:{tunnel.remotePort}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnecting && (
                      <>
                        <Loader className="w-4 h-4 text-yellow-400 animate-spin" />
                        <span className="text-sm text-yellow-400">Connecting</span>
                      </>
                    )}
                    {isConnected && (
                      <>
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Connected</span>
                      </>
                    )}
                    {isError && (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Error</span>
                      </>
                    )}
                    {!tunnelStatus && (
                      <span className="text-sm text-gray-400">Disconnected</span>
                    )}
                  </div>
                </div>
                {tunnelStatus?.error && (
                  <div className="mt-2 text-sm text-red-300">{tunnelStatus.error}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
