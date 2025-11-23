import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { AppConfig, ServerConfig } from '../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Current config version
const CURRENT_CONFIG_VERSION = 2

export class ConfigManager {
  private configPath: string
  private config: AppConfig | null = null

  constructor(configPath?: string) {
    if (configPath) {
      this.configPath = configPath
    } else {
      // Try multiple locations for the config file
      const candidates = [
        // Production: same directory as executable (WoW folder)
        path.join(process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath), 'araxiatrinity.yml'),
        // Development: project root
        path.join(__dirname, '../../..', 'araxiatrinity.yml'),
      ]
      
      this.configPath = candidates.find(p => fs.existsSync(p)) || candidates[0]
    }
  }

  /**
   * Create a default configuration file
   */
  private createDefaultConfig(): AppConfig {
    return {
      version: CURRENT_CONFIG_VERSION,
      autoConnect: false, // Default to off for new configs
      servers: [
        {
          name: "BattleNet Server",
          host: "your.server.com",
          serverType: "auth",
          tunnels: [
            {
              localPort: 1119,
              remotePort: 1119,
              name: "BattleNet Auth"
            },
            {
              localPort: 8081,
              remotePort: 8081,
              name: "BattleNet Realm"
            }
          ]
        },
        {
          name: "WorldServer 1",
          host: "your.server.com",
          serverType: "world",
          tunnels: [
            {
              localPort: 8085,
              remotePort: 8085,
              name: "WorldServer"
            }
          ]
        }
      ]
    }
  }

  /**
   * Load configuration from YAML file
   */
  async load(): Promise<AppConfig> {
    try {
      // If config file doesn't exist, create a default one
      if (!fs.existsSync(this.configPath)) {
        console.log('Config file not found, creating default config at:', this.configPath)
        const defaultConfig = this.createDefaultConfig()
        await this.save(defaultConfig)
        this.config = defaultConfig
        return defaultConfig
      }

      const fileContent = fs.readFileSync(this.configPath, 'utf-8')
      let config = yaml.load(fileContent) as AppConfig

      if (!config.servers || !Array.isArray(config.servers)) {
        throw new Error('Invalid config: missing or invalid servers array')
      }

      // Migrate config if needed
      const migrated = await this.migrateConfig(config)
      if (migrated) {
        config = migrated
      }

      this.config = config
      return config
    } catch (error) {
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Save configuration to YAML file
   */
  async save(config: AppConfig): Promise<void> {
    try {
      const yaml_content = yaml.dump(config, { indent: 2 })
      fs.writeFileSync(this.configPath, yaml_content, 'utf-8')
      this.config = config
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig | null {
    return this.config
  }

  /**
   * Get server by name
   */
  getServer(name: string): ServerConfig | undefined {
    return this.config?.servers.find(s => s.name === name)
  }

  /**
   * Get all servers
   */
  getServers(): ServerConfig[] {
    return this.config?.servers || []
  }

  /**
   * Migrate configuration to current version
   */
  private async migrateConfig(config: AppConfig): Promise<AppConfig | null> {
    const currentVersion = config.version || 1
    
    if (currentVersion >= CURRENT_CONFIG_VERSION) {
      return null // No migration needed
    }

    console.log(`Migrating config from version ${currentVersion} to ${CURRENT_CONFIG_VERSION}`)
    let migratedConfig = { ...config }
    let needsSave = false

    // Migration from v1 to v2: Add serverType field
    if (currentVersion < 2) {
      console.log('Applying migration: Adding serverType to servers')
      migratedConfig.servers = migratedConfig.servers.map(server => {
        if (!(server as any).serverType) {
          // Auto-detect server type based on name or tunnels
          const serverType = this.detectServerType(server)
          console.log(`  - ${server.name}: detected as "${serverType}"`)
          return { ...server, serverType }
        }
        return server
      })
      needsSave = true
    }

    // Set autoConnect to true by default if not specified
    if (migratedConfig.autoConnect === undefined) {
      migratedConfig.autoConnect = true
      needsSave = true
    }

    // Update version
    migratedConfig.version = CURRENT_CONFIG_VERSION

    // Save migrated config
    if (needsSave) {
      console.log('Saving migrated config...')
      await this.save(migratedConfig)
      console.log('Config migration complete')
    }

    return migratedConfig
  }

  /**
   * Auto-detect server type based on server name and tunnels
   */
  private detectServerType(server: ServerConfig): 'auth' | 'world' {
    const name = server.name.toLowerCase()
    
    // Check for auth-related keywords in name
    if (name.includes('battlenet') || name.includes('auth') || name.includes('bnet')) {
      return 'auth'
    }
    
    // Check for world-related keywords in name
    if (name.includes('world') || name.includes('realm')) {
      return 'world'
    }
    
    // Check tunnel ports - auth typically uses 1119 and 8081
    const hasAuthPorts = server.tunnels.some(t => 
      t.localPort === 1119 || t.localPort === 8081 ||
      t.remotePort === 1119 || t.remotePort === 8081
    )
    
    if (hasAuthPorts) {
      return 'auth'
    }
    
    // Default to world if uncertain
    return 'world'
  }

  /**
   * Validate server configuration
   */
  validateServer(server: ServerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!server.name) errors.push('Server name is required')
    if (!server.host) errors.push('Server host is required')
    if (!server.serverType) errors.push('Server type is required (auth or world)')
    if (server.serverType && !['auth', 'world'].includes(server.serverType)) {
      errors.push('Server type must be either "auth" or "world"')
    }
    if (!server.tunnels || server.tunnels.length === 0) errors.push('At least one tunnel is required')

    server.tunnels?.forEach((tunnel, idx) => {
      if (!tunnel.localPort) errors.push(`Tunnel ${idx}: localPort is required`)
      if (!tunnel.remotePort) errors.push(`Tunnel ${idx}: remotePort is required`)
      if (!tunnel.name) errors.push(`Tunnel ${idx}: name is required`)
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
