# Araxia Trinity Launcher

A custom desktop application for managing SSH port forwarding to a Trinity Core private World of Warcraft server. Built with Electron, React, and TypeScript.

## Features

- 🔒 **Secure SSH Tunneling**: Establish encrypted port forwarding to your Trinity Core server
- 🔄 **Automatic Reconnection**: Exponential backoff retry logic (1s → 60s) for resilient connections
- 📊 **Real-time Status**: Live tunnel status indicators with connection state visualization
- ⚙️ **Easy Configuration**: YAML-based configuration file for multiple server profiles
- 🎨 **Modern UI**: Clean, dark-themed React interface with TailwindCSS
- 🐳 **Docker Ready**: No local dependencies needed - all tooling runs in Docker

## Quick Start

### Prerequisites
- Docker and Docker Compose
- SSH private key for your Trinity Core server
- Configuration file (`araxiatrinity.yml`)

### Setup

1. **Create configuration file** in your home directory:
```bash
cat > ~/araxiatrinity.yml << 'EOF'
version: 2
autoConnect: true
servers:
  - name: "BattleNet Server"
    host: "your.server.com"
    serverType: "auth"
    tunnels:
      - localPort: 1119
        remotePort: 1119
        name: "BattleNet Auth"
      - localPort: 8081
        remotePort: 8081
        name: "BattleNet Realm"
  - name: "WorldServer 1"
    host: "your.server.com"
    serverType: "world"
    tunnels:
      - localPort: 8085
        remotePort: 8085
        name: "WorldServer"
EOF
```

2. **Build Docker image**:
```bash
docker-compose build
```

3. **Run the application**:
```bash
docker-compose up
```

The launcher will start in development mode with hot reloading.

## Usage

1. **Select a Server**: Click on a server in the left sidebar
2. **Connect**: Click the "Connect" button to establish SSH tunnels
3. **Monitor**: Watch tunnel status indicators for connection state
4. **Edit Config**: Click "Edit Config" to modify server settings
5. **Disconnect**: Click "Disconnect" to close tunnels

## Configuration

The `araxiatrinity.yml` file defines your server connections:

```yaml
version: 2
autoConnect: true
servers:
  - name: "BattleNet Server"
    host: "server.example.com"
    serverType: "auth"
    tunnels:
      - localPort: 1119
        remotePort: 1119
        name: "BattleNet Auth"
      - localPort: 8081
        remotePort: 8081
        name: "BattleNet Realm"
  - name: "WorldServer 1"
    host: "server.example.com"
    serverType: "world"
    tunnels:
      - localPort: 8085
        remotePort: 8085
        name: "WorldServer"
  # Add multiple world servers with different local ports
  - name: "WorldServer 2"
    host: "server.example.com"
    serverType: "world"
    tunnels:
      - localPort: 8086
        remotePort: 8085
        name: "WorldServer"
```

**Server Types:**
- `auth` - BattleNet authentication server (typically only one)
- `world` - World servers (can have multiple with different local ports)

**Configuration Versioning:**
The launcher automatically migrates old configuration files to the latest version. If you have a config without `serverType` fields, the launcher will:
1. Detect the server type based on name and port numbers
2. Add the `serverType` field automatically
3. Save the updated configuration
4. Log the migration process to the console

Current config version: **2**

See [SETUP.md](docs/SETUP.md) for detailed configuration instructions.

## Architecture

- **Electron Main Process**: Manages SSH connections and IPC
- **React UI**: Real-time tunnel status and configuration
- **SSH Tunneling**: Port forwarding via ssh2 library
- **Configuration**: YAML-based, stored in user home directory

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Documentation

- [SETUP.md](docs/SETUP.md) - Installation and configuration guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture
- [DECISIONS.md](docs/DECISIONS.md) - Design decisions and rationale
- [PLAN.md](docs/PLAN.md) - Development roadmap
- [PROGRESS.md](docs/PROGRESS.md) - Development progress tracking

## Development

### Build
```bash
docker-compose run builder npm run build
```

### Development Server
```bash
docker-compose up
```

### Access Container Shell
```bash
docker-compose exec builder sh
```

## Technology Stack

- **Electron** 28 - Desktop application framework
- **React** 18 - UI framework
- **TypeScript** 5 - Type-safe JavaScript
- **Vite** 5 - Build tool and dev server
- **TailwindCSS** 3 - Utility-first CSS
- **ssh2** 1.14 - SSH client library
- **js-yaml** 4.1 - YAML parser
- **Lucide React** - Icon library

## Security

- ✅ Context isolation between main and renderer processes
- ✅ Preload script validates all IPC messages
- ✅ SSH credentials never logged or stored in memory
- ✅ Private key authentication (no passwords)
- ✅ Secure IPC message passing

## Troubleshooting

### Connection Issues
- Verify SSH server is running on remote host
- Check firewall allows SSH (port 22)
- Confirm SSH key has correct permissions: `chmod 600 ~/.ssh/id_rsa`

### Port Already in Use
- Check what's using the port: `lsof -i :PORT`
- Change local port in configuration

### Config Not Loading
- Verify `araxiatrinity.yml` exists in home directory
- Check YAML syntax is valid
- Ensure file permissions allow reading

See [SETUP.md](docs/SETUP.md#troubleshooting) for more troubleshooting steps.

## License

MIT

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## Support

For issues and questions, please open an issue on GitHub.
