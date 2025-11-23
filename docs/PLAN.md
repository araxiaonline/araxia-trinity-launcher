# Araxia Trinity Launcher - Development Plan

## Project Overview
Custom launcher for Trinity Core private WoW server with SSH port forwarding capabilities. Forwards remote server ports (1119, 8081, 8085) to localhost for BattleNet and WorldServer connections.

## Architecture
- **Frontend**: React-based UI for configuration and status monitoring
- **Backend**: Electron main process for SSH tunneling and process management
- **Config**: YAML-based configuration (`araxiatrinity.yml`)
- **Deployment**: Docker for all build/tooling (no local dependencies)

## High-Level Plan

### Phase 1: Project Setup
- [ ] Initialize Electron + React project structure
- [ ] Set up Docker build environment
- [ ] Create configuration schema and loader
- [ ] Document architecture and decisions

### Phase 2: Core Tunneling
- [ ] Implement SSH tunnel management (node-ssh or ssh2)
- [ ] Add connection retry logic with exponential backoff
- [ ] Create tunnel status tracking
- [ ] Add error handling and logging

### Phase 3: UI Implementation
- [ ] Build React UI for configuration
- [ ] Display tunnel status (connected/disconnected/connecting)
- [ ] Add config file editor/validator
- [ ] Implement real-time status updates

### Phase 4: Configuration Management
- [ ] Create `araxiatrinity.yml` schema
- [ ] Implement config file loading/saving
- [ ] Add validation and error messages
- [ ] Support multiple server profiles

### Phase 5: Testing & Deployment
- [ ] Add unit tests for tunnel logic
- [ ] Create Docker build pipeline
- [ ] Package application
- [ ] Documentation completion

## Key Decisions
- Using Electron for cross-platform desktop app
- SSH tunneling via node-ssh library
- YAML for configuration (human-readable)
- Docker for all tooling (no local Node/build tools needed)
- React for modern, responsive UI

## Configuration Structure (araxiatrinity.yml)
```yaml
servers:
  - name: "Araxia Production"
    host: "your.server.com"
    username: "tunnel_user"
    privateKeyPath: "~/.ssh/id_rsa"
    tunnels:
      - localPort: 1119
        remotePort: 1119
        name: "BattleNet Auth"
      - localPort: 8081
        remotePort: 8081
        name: "BattleNet Realm"
      - localPort: 8085
        remotePort: 8085
        name: "WorldServer"
```

## Technology Stack
- Electron (desktop app framework)
- React (UI)
- node-ssh (SSH tunneling)
- YAML (configuration)
- Docker (build environment)
- TailwindCSS + shadcn/ui (styling)
