import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { ConfigManager } from './configManager'
import { TunnelManager } from './tunnelManager'
import { IPC_CHANNELS } from '../shared/ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
const configManager = new ConfigManager()
const tunnelManager = new TunnelManager()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC Handlers

// Load configuration
ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
  try {
    const config = await configManager.load()
    return { success: true, data: config }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Save configuration
ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, async (_, config) => {
  try {
    await configManager.save(config)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Connect to server
ipcMain.handle(IPC_CHANNELS.TUNNEL_CONNECT, async (_, serverId: string) => {
  try {
    const config = configManager.getConfig()
    if (!config) {
      throw new Error('Configuration not loaded')
    }

    const server = config.servers.find(s => s.name === serverId)
    if (!server) {
      throw new Error(`Server not found: ${serverId}`)
    }

    const validation = configManager.validateServer(server)
    if (!validation.valid) {
      throw new Error(`Invalid server config: ${validation.errors.join(', ')}`)
    }

    await tunnelManager.connect(server, serverId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Disconnect from server
ipcMain.handle(IPC_CHANNELS.TUNNEL_DISCONNECT, async (_, serverId: string) => {
  try {
    await tunnelManager.disconnect(serverId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Subscribe to status updates
tunnelManager.onStatusUpdate((status) => {
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.TUNNEL_STATUS_UPDATE, status)
  }
})

// Find game launcher
ipcMain.handle('find-game-launcher', async () => {
  try {
    // Get the directory where the config file is located
    // This is the WoW game directory where the user placed everything
    const configPath = configManager['configPath'] // Access the private field
    const configDir = path.dirname(configPath)
    
    console.log('Config file location:', configPath)
    console.log('Searching for Arctium launcher in:', configDir)
    
    if (!fs.existsSync(configDir)) {
      return {
        success: false,
        path: null,
        error: `Config directory not found: ${configDir}`
      }
    }
    
    const files = fs.readdirSync(configDir)
    console.log('Files in config directory:', files)
    
    // Find all files that start with "Arctium Game Launcher" and end with ".exe"
    const launcherFiles = files.filter(file => 
      file.startsWith('Arctium Game Launcher') && file.endsWith('.exe')
    )
    
    console.log('Matching launcher files:', launcherFiles)
    
    if (launcherFiles.length === 0) {
      return { 
        success: false, 
        path: null, 
        error: `No Arctium Game Launcher found in ${configDir}` 
      }
    }
    
    if (launcherFiles.length > 1) {
      return { 
        success: false, 
        path: null, 
        error: `Multiple launchers found: ${launcherFiles.join(', ')}. Please keep only one.` 
      }
    }
    
    // Exactly one launcher found
    const launcherPath = path.join(configDir, launcherFiles[0])
    console.log('Found launcher:', launcherPath)
    return { success: true, path: launcherPath }
  } catch (error) {
    console.error('Error finding launcher:', error)
    return {
      success: false,
      path: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Track running game launcher process
let gameLauncherProcess: ReturnType<typeof spawn> | null = null

// Launch game
ipcMain.handle('launch-game', async (_, launcherPath: string) => {
  try {
    // Check if already running
    if (gameLauncherProcess && !gameLauncherProcess.killed) {
      return { 
        success: false, 
        error: 'Game launcher is already running' 
      }
    }
    
    if (!fs.existsSync(launcherPath)) {
      throw new Error('Game launcher not found')
    }
    
    // Launch the game with piped stdio to capture output
    gameLauncherProcess = spawn(launcherPath, [], {
      detached: false, // Keep attached so we can monitor it
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
    })
    
    console.log('Game launcher started with PID:', gameLauncherProcess.pid)
    
    // Stream stdout to renderer console
    if (gameLauncherProcess.stdout) {
      gameLauncherProcess.stdout.on('data', (data) => {
        const output = data.toString()
        console.log('[Arctium Launcher]', output)
        if (mainWindow) {
          mainWindow.webContents.send('game-launcher-output', { 
            type: 'stdout', 
            data: output 
          })
        }
      })
    }
    
    // Stream stderr to renderer console
    if (gameLauncherProcess.stderr) {
      gameLauncherProcess.stderr.on('data', (data) => {
        const output = data.toString()
        console.error('[Arctium Launcher Error]', output)
        if (mainWindow) {
          mainWindow.webContents.send('game-launcher-output', { 
            type: 'stderr', 
            data: output 
          })
        }
      })
    }
    
    // Notify renderer that launcher is running
    if (mainWindow) {
      mainWindow.webContents.send('game-launcher-status', { running: true })
    }
    
    // Monitor process exit
    gameLauncherProcess.on('exit', (code) => {
      console.log('Game launcher exited with code:', code)
      gameLauncherProcess = null
      
      // Notify renderer that launcher stopped
      if (mainWindow) {
        mainWindow.webContents.send('game-launcher-status', { running: false })
      }
    })
    
    gameLauncherProcess.on('error', (err) => {
      console.error('Game launcher error:', err)
      gameLauncherProcess = null
      
      // Notify renderer that launcher stopped
      if (mainWindow) {
        mainWindow.webContents.send('game-launcher-status', { running: false })
      }
    })
    
    return { success: true }
  } catch (error) {
    gameLauncherProcess = null
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})

// Check if game launcher is running
ipcMain.handle('is-game-launcher-running', async () => {
  return { 
    running: gameLauncherProcess !== null && !gameLauncherProcess.killed 
  }
})

// Check WoW Config.wtf for correct portal setting
ipcMain.handle('check-wow-config', async () => {
  try {
    // Get the directory where the config file is located (WoW game directory)
    const configPath = configManager['configPath']
    const gameDir = path.dirname(configPath)
    const wowConfigPath = path.join(gameDir, '_retail_', 'WTF', 'Config.wtf')
    
    console.log('Checking WoW config at:', wowConfigPath)
    
    // Check if Config.wtf exists
    if (!fs.existsSync(wowConfigPath)) {
      return {
        success: true,
        warning: `Config.wtf not found at ${wowConfigPath}. This is normal if you haven't run WoW yet.`
      }
    }
    
    // Read the config file
    const configContent = fs.readFileSync(wowConfigPath, 'utf-8')
    const lines = configContent.split('\n')
    
    // Look for SET portal line
    const portalLine = lines.find(line => line.trim().startsWith('SET portal'))
    
    if (!portalLine) {
      return {
        success: false,
        error: 'Config.wtf does not contain a "SET portal" line. Please add: SET portal "127.0.0.1"'
      }
    }
    
    // Check if it's set to 127.0.0.1
    const portalMatch = portalLine.match(/SET portal\s+"([^"]+)"/)
    if (!portalMatch) {
      return {
        success: false,
        error: `Invalid portal setting format in Config.wtf. Expected: SET portal "127.0.0.1"`
      }
    }
    
    const portalValue = portalMatch[1]
    if (portalValue !== '127.0.0.1') {
      return {
        success: false,
        error: `Config.wtf has incorrect portal setting: "${portalValue}". It must be set to "127.0.0.1" for the launcher to work.`
      }
    }
    
    // All good!
    return {
      success: true,
      message: 'Config.wtf portal setting is correct (127.0.0.1)'
    }
  } catch (error) {
    console.error('Error checking WoW config:', error)
    return {
      success: false,
      error: `Failed to check Config.wtf: ${error instanceof Error ? error.message : String(error)}`
    }
  }
})
