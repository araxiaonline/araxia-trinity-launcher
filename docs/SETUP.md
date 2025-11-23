# Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- SSH private key for your Trinity Core server (typically `~/.ssh/id_rsa`)
- Configuration file `araxiatrinity.yml` in your home directory

## Quick Start

### 1. Configure Your Server

Create `~/araxiatrinity.yml` with your server details:

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

### 2. Build with Docker

```bash
docker-compose build
```

### 3. Run the Application

```bash
docker-compose up
```

The application will start in development mode with hot reloading.

## Configuration File Format

The `araxiatrinity.yml` file uses YAML format:

- **servers**: Array of server configurations
  - **name**: Display name for the server
  - **host**: Remote server hostname or IP address
  - **tunnels**: Array of port forwarding tunnels
    - **localPort**: Local port to listen on (1119, 8081, 8085)
    - **remotePort**: Remote port on the server
    - **name**: Display name for the tunnel

## How It Works

The launcher creates TCP tunnels that:
1. Listen on `localhost:localPort`
2. Forward all traffic directly to `host:remotePort`
3. No SSH or authentication required - direct TCP connection

This is useful when:
- Your remote ports are already exposed on the network
- You don't want to manage SSH keys or accounts
- You need simple, direct port forwarding

## Using the Application

1. **Select a Server**: Click on a server in the left panel to view its tunnels
2. **Connect**: Click the "Connect" button to establish TCP tunnels
3. **Monitor Status**: Watch the tunnel status indicators:
   - 🟢 Green: Connected
   - 🟡 Yellow: Connecting
   - 🔴 Red: Error
   - ⚫ Gray: Disconnected
4. **Edit Config**: Click "Edit Config" to modify server settings
5. **Disconnect**: Click "Disconnect" to close all tunnels for a server

## Troubleshooting

### Connection Refused
- Verify SSH server is running on the remote host
- Check firewall rules allow SSH (port 22)
- Confirm username and host are correct

### Authentication Failed
- Verify SSH key exists at the specified path
- Ensure public key is authorized on the server
- Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`

### Port Already in Use
- Check if another application is using the local port
- Use `lsof -i :PORT` to find what's using the port

### Config Not Loading
- Verify `araxiatrinity.yml` exists in your home directory
- Check YAML syntax is valid
- Ensure file has proper permissions

## Docker Development

### Build Image
```bash
docker-compose build
```

### Run Development Server
```bash
docker-compose up
```

### View Logs
```bash
docker-compose logs -f
```

### Stop Services
```bash
docker-compose down
```

### Access Shell in Container
```bash
docker-compose exec builder sh
```

## Building for Production

```bash
docker-compose run builder npm run build
```

This will create:
- `dist/` - Vite build output
- `dist-electron/` - Electron main process build
- Packaged application in `out/`

## Environment Variables

Create `.env.local` for development overrides:

```
VITE_DEV_SERVER_URL=http://localhost:5173
```

See `.env.example` for all available options.
