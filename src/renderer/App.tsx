import { useState, useEffect } from 'react'
import { AppConfig, ServerStatus } from '@/shared/types'
import ConfigEditor from './components/ConfigEditor'
import './App.css'

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [serverStatus, setServerStatus] = useState<Map<string, ServerStatus>>(new Map())
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameLauncherPath, setGameLauncherPath] = useState<string | null>(null)
  const [gameLauncherRunning, setGameLauncherRunning] = useState(false)
  const [launcherOutput, setLauncherOutput] = useState<Array<{ type: 'stdout' | 'stderr', text: string }>>([])
  const [outputEndRef, setOutputEndRef] = useState<HTMLDivElement | null>(null)

  // Load configuration on mount
  useEffect(() => {
    loadConfig()
    checkForGameLauncher()
    checkGameLauncherStatus()
    checkWowConfig()
  }, [])

  // Auto-connect when config loads if autoConnect is enabled
  useEffect(() => {
    if (config && config.autoConnect && !loading) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleConnectAll()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [config, loading])

  // Subscribe to game launcher status updates
  useEffect(() => {
    const handleLauncherStatus = (status: { running: boolean }) => {
      setGameLauncherRunning(status.running)
    }

    window.electron?.ipcRenderer.on('game-launcher-status', handleLauncherStatus)

    return () => {
      window.electron?.ipcRenderer.off('game-launcher-status', handleLauncherStatus)
    }
  }, [])

  // Subscribe to game launcher output
  useEffect(() => {
    const handleLauncherOutput = (output: { type: 'stdout' | 'stderr', data: string }) => {
      // Stream launcher output to browser console
      if (output.type === 'stdout') {
        console.log('%c[Arctium Launcher]%c ' + output.data.trim(), 
          'color: #4CAF50; font-weight: bold', 
          'color: inherit')
      } else {
        console.error('%c[Arctium Launcher Error]%c ' + output.data.trim(), 
          'color: #F44336; font-weight: bold', 
          'color: inherit')
      }

      // Add to output display
      setLauncherOutput(prev => {
        const newOutput = [...prev, { type: output.type, text: output.data }]
        console.log('Output array length:', newOutput.length)
        return newOutput
      })
    }

    window.electron?.ipcRenderer.on('game-launcher-output', handleLauncherOutput)

    return () => {
      window.electron?.ipcRenderer.off('game-launcher-output', handleLauncherOutput)
    }
  }, [])

  // Auto-scroll output window when new content arrives
  useEffect(() => {
    if (outputEndRef) {
      outputEndRef.scrollIntoView({ behavior: 'smooth' })
    }
  }, [launcherOutput, outputEndRef])

  // Check for Arctium Game Launcher executable
  const checkForGameLauncher = async () => {
    if (!window.electron) {
      // In dev mode, simulate finding the launcher
      setGameLauncherPath('Arctium Game Launcher.exe')
      return
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('find-game-launcher')
      if (result?.success && result?.path) {
        setGameLauncherPath(result.path)
        setError(null)
      } else if (result?.error) {
        setGameLauncherPath(null)
        setError(`Launcher Error: ${result.error}`)
      }
    } catch (err) {
      console.error('Failed to check for game launcher:', err)
      setError('Failed to check for game launcher')
    }
  }

  // Check if game launcher is currently running
  const checkGameLauncherStatus = async () => {
    if (!window.electron) return

    try {
      const result = await window.electron.ipcRenderer.invoke('is-game-launcher-running')
      if (result?.running !== undefined) {
        setGameLauncherRunning(result.running)
      }
    } catch (err) {
      console.error('Failed to check game launcher status:', err)
    }
  }

  // Check WoW Config.wtf for correct portal setting
  const checkWowConfig = async () => {
    if (!window.electron) return

    try {
      const result = await window.electron.ipcRenderer.invoke('check-wow-config')
      
      if (result?.warning) {
        console.warn('WoW Config warning:', result.warning)
        // Don't show warning for missing file - it's normal on first run
      } else if (result?.error) {
        setError(`WoW Configuration Error: ${result.error}`)
      } else if (result?.message) {
        console.log('WoW Config check:', result.message)
      }
    } catch (err) {
      console.error('Failed to check WoW config:', err)
    }
  }

  // Subscribe to status updates
  useEffect(() => {
    const handleStatusUpdate = (status: ServerStatus) => {
      setServerStatus(prev => new Map(prev).set(status.serverId, status))
    }

    window.electron?.ipcRenderer.on(
      window.electron?.IPC_CHANNELS.TUNNEL_STATUS_UPDATE,
      handleStatusUpdate
    )

    return () => {
      window.electron?.ipcRenderer.off(
        window.electron?.IPC_CHANNELS.TUNNEL_STATUS_UPDATE,
        handleStatusUpdate
      )
    }
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      
      // In dev mode (browser only), load mock config
      if (!window.electron) {
        const mockConfig: AppConfig = {
          servers: [
            {
              name: "BattleNet Server",
              host: "home.araxiaonline.cc",
              serverType: "auth",
              tunnels: [
                { localPort: 1119, remotePort: 1119, name: "BattleNet Auth" },
                { localPort: 8081, remotePort: 8081, name: "BattleNet Realm" }
              ]
            },
            {
              name: "WorldServer 1",
              host: "world.server.com",
              serverType: "world",
              tunnels: [
                { localPort: 8085, remotePort: 8085, name: "WorldServer" }
              ]
            },
            {
              name: "WorldServer 2",
              host: "world.server.com",
              serverType: "world",
              tunnels: [
                { localPort: 8086, remotePort: 8085, name: "WorldServer" }
              ]
            }
          ]
        }
        setConfig(mockConfig)
        setLoading(false)
        setError(null)
        return
      }
      
      const result = await window.electron.ipcRenderer.invoke(
        window.electron.IPC_CHANNELS.CONFIG_GET
      )

      if (result?.success) {
        setConfig(result.data)
        setError(null)
      } else {
        setError(result?.error || 'Failed to load configuration')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (serverId: string) => {
    try {
      const result = await window.electron?.ipcRenderer.invoke(
        window.electron?.IPC_CHANNELS.TUNNEL_CONNECT,
        serverId
      )

      if (!result?.success) {
        setError(result?.error || 'Failed to connect')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDisconnect = async (serverId: string) => {
    try {
      const result = await window.electron?.ipcRenderer.invoke(
        window.electron?.IPC_CHANNELS.TUNNEL_DISCONNECT,
        serverId
      )

      if (!result?.success) {
        setError(result?.error || 'Failed to disconnect')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      const result = await window.electron?.ipcRenderer.invoke(
        window.electron?.IPC_CHANNELS.CONFIG_SAVE,
        newConfig
      )

      if (result?.success) {
        setConfig(newConfig)
        setShowConfigEditor(false)
        setError(null)
      } else {
        setError(result?.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleLaunchGame = async () => {
    if (!gameLauncherPath) return

    if (!window.electron) {
      // In dev mode, just show a message
      console.log('Would launch game:', gameLauncherPath)
      return
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('launch-game', gameLauncherPath)
      if (!result?.success) {
        setError(result?.error || 'Failed to launch game')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch game')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading configuration...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            {error || 'Failed to load configuration'}
          </div>
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const handleConnectAll = () => {
    config.servers.forEach(server => handleConnect(server.name))
  }

  const handleDisconnectAll = () => {
    config.servers.forEach(server => handleDisconnect(server.name))
  }

  const handleToggleAutoConnect = async () => {
    if (!config) return

    const updatedConfig = {
      ...config,
      autoConnect: !config.autoConnect
    }

    setConfig(updatedConfig)

    // Save to file
    if (window.electron) {
      try {
        const result = await window.electron.ipcRenderer.invoke(
          window.electron.IPC_CHANNELS.CONFIG_SAVE,
          updatedConfig
        )
        if (!result?.success) {
          setError(result?.error || 'Failed to save auto-connect setting')
        }
      } catch (err) {
        setError('Failed to save auto-connect setting')
      }
    }
  }

  const anyConnected = Array.from(serverStatus.values()).some(s => s.status === 'connected')
  const anyConnecting = Array.from(serverStatus.values()).some(s => s.status === 'connecting')

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Araxia Trinity Launcher</h1>
        </div>
          
        {/* Compact Status Panel - Upper Right */}
        <div className="fixed top-6 right-6">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 min-w-[300px]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">Server Status</h2>
              <button
                onClick={() => setShowConfigEditor(!showConfigEditor)}
                className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                {showConfigEditor ? 'Close' : 'Config'}
              </button>
            </div>

            {/* Server list */}
            <div className="space-y-2 mb-3">
              {config.servers.map(server => {
                const status = serverStatus.get(server.name)
                const statusColor =
                  status?.status === 'connected'
                    ? 'text-green-400'
                    : status?.status === 'connecting'
                    ? 'text-yellow-400'
                    : status?.status === 'error'
                    ? 'text-red-400'
                    : 'text-gray-400'

                const serverTypeIcon = server.serverType === 'auth' ? '🔐' : '🌍'
                const serverTypeLabel = server.serverType === 'auth' ? 'Auth' : 'World'

                return (
                  <div key={server.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span title={serverTypeLabel}>{serverTypeIcon}</span>
                      <span className="font-medium">{server.name}</span>
                    </div>
                    <span className={statusColor}>
                      {status?.status || 'disconnected'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Auto-connect checkbox */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <input
                type="checkbox"
                id="autoConnect"
                checked={config.autoConnect ?? true}
                onChange={handleToggleAutoConnect}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="autoConnect" className="text-sm text-gray-300 cursor-pointer select-none">
                Auto-connect on startup
              </label>
            </div>

            {/* Connect/Disconnect buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleConnectAll}
                disabled={anyConnected || anyConnecting}
                className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              >
                Connect All
              </button>
              <button
                onClick={handleDisconnectAll}
                disabled={!anyConnected && !anyConnecting}
                className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              >
                Disconnect All
              </button>
            </div>

            {/* Launch Game Button */}
            <button
              onClick={handleLaunchGame}
              disabled={!gameLauncherPath || gameLauncherRunning}
              className="w-full px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
            >
              {!gameLauncherPath 
                ? 'Game Launcher Not Found' 
                : gameLauncherRunning 
                ? 'Game Launcher Running...' 
                : 'Launch Game'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/70 backdrop-blur-sm text-red-100 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Config Editor */}
        {showConfigEditor && (
          <ConfigEditor
            config={config}
            onSave={handleSaveConfig}
            onCancel={() => setShowConfigEditor(false)}
          />
        )}

        {/* Launcher Output Console - Lower Right */}
        {!showConfigEditor && gameLauncherRunning && (
          <div className="fixed bottom-6 right-6 bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 w-[600px] h-[300px] flex flex-col shadow-xl">
            <h3 className="text-sm font-bold mb-2 text-gray-300">Launcher Output</h3>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 bg-black/30 rounded p-2">
              {launcherOutput.length === 0 ? (
                <div className="text-gray-500">Waiting for output...</div>
              ) : (
                launcherOutput.map((line, index) => (
                  <div 
                    key={index}
                    className={line.type === 'stderr' ? 'text-red-400' : 'text-green-400'}
                  >
                    {line.text}
                  </div>
                ))
              )}
              <div ref={setOutputEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
