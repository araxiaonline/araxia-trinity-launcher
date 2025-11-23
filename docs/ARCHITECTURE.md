# Architecture & Design Decisions

## Project Structure
```
araxia-trinity-launcher/
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron main process
│   │   ├── tunnelManager.ts      # SSH tunnel management
│   │   └── configManager.ts      # Configuration handling
│   ├── renderer/
│   │   ├── App.tsx               # Main React component
│   │   ├── components/           # React components
│   │   │   ├── TunnelStatus.tsx
│   │   │   ├── ConfigEditor.tsx
│   │   │   └── ServerSelector.tsx
│   │   └── styles/               # TailwindCSS styles
│   └── shared/
│       ├── types.ts              # Shared TypeScript types
│       └── ipc.ts                # IPC message definitions
├── Dockerfile                    # Build environment
├── docker-compose.yml            # Docker orchestration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── araxiatrinity.yml             # Example config
└── docs/
    ├── PLAN.md
    ├── ARCHITECTURE.md
    ├── DECISIONS.md
    └── PROGRESS.md
```

## Component Responsibilities

### Electron Main Process (`src/main/index.ts`)
- Window management
- IPC message handling
- Lifecycle management
- Delegate tunneling to TunnelManager

### Tunnel Manager (`src/main/tunnelManager.ts`)
- Establish SSH connections
- Create port forwarding tunnels
- Monitor tunnel health
- Implement reconnection logic with backoff
- Emit status updates to renderer

### Config Manager (`src/main/configManager.ts`)
- Load/parse `araxiatrinity.yml`
- Validate configuration
- Watch for file changes
- Provide config to TunnelManager

### React UI (`src/renderer/App.tsx`)
- Display server list
- Show tunnel status (connected/disconnected/connecting)
- Display error messages
- Allow config editing
- Real-time status updates via IPC

## Data Flow

```
User selects server in UI
    ↓
Renderer sends IPC message to Main
    ↓
ConfigManager loads server config
    ↓
TunnelManager creates SSH connection
    ↓
TunnelManager establishes port forwards
    ↓
TunnelManager emits status updates
    ↓
Main sends status via IPC to Renderer
    ↓
UI updates with tunnel status
```

## SSH Tunneling Strategy

### Connection Flow
1. Load server config from `araxiatrinity.yml`
2. Establish SSH connection with private key auth
3. For each tunnel:
   - Create local listening socket on localhost:PORT
   - Forward to remote server:REMOTE_PORT
4. Monitor connection health
5. On disconnect: retry with exponential backoff (1s, 2s, 4s, 8s, 16s, max 60s)

### Error Handling
- Connection refused → show error, retry
- Auth failure → show error, don't retry
- Network timeout → retry with backoff
- Tunnel failure → attempt to re-establish

## IPC Message Types

### Main → Renderer
- `tunnel:status-update` - Tunnel connection status changed
- `tunnel:error` - Tunnel error occurred
- `config:loaded` - Configuration loaded successfully

### Renderer → Main
- `tunnel:connect` - Connect to server
- `tunnel:disconnect` - Disconnect from server
- `config:get` - Request current config
- `config:save` - Save new config

## Security Considerations
- Private keys stored in user's home directory (not in config file)
- SSH key path in config is relative to user home
- No credentials logged or stored in app
- Config file should have restricted permissions (0600)
