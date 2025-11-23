import { ServerConfig, ServerStatus } from '@/shared/types'

interface Props {
  servers: ServerConfig[]
  selectedServer: string | null
  onSelectServer: (serverId: string) => void
  serverStatus: Map<string, ServerStatus>
}

export default function ServerSelector({
  servers,
  selectedServer,
  onSelectServer,
  serverStatus,
}: Props) {
  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Servers</h2>
      <div className="space-y-2">
        {servers.map(server => {
          const status = serverStatus.get(server.name)
          const statusColor =
            status?.status === 'connected'
              ? 'text-green-400'
              : status?.status === 'connecting'
              ? 'text-yellow-400'
              : status?.status === 'error'
              ? 'text-red-400'
              : 'text-gray-400'

          return (
            <button
              key={server.name}
              onClick={() => onSelectServer(server.name)}
              className={`w-full text-left px-4 py-3 rounded transition ${
                selectedServer === server.name
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="font-semibold">{server.name}</div>
              <div className={`text-sm ${statusColor}`}>
                {status?.status || 'disconnected'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
