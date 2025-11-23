# Building Araxia Trinity Launcher

## Prerequisites
- Node.js 20+ installed on your system
- Windows OS (for building the .exe)

## Build Instructions

### Option 1: Using PowerShell Script (Recommended)
```powershell
.\build.ps1
```

**Note:** The script will automatically request Administrator privileges if needed. This is required for electron-builder to create symbolic links during the build process.

### Option 2: Manual Build
```powershell
# Install dependencies (first time only)
npm install

# Set production environment and build
$env:NODE_ENV = "production"
npm run build
```

## Output
The build process will create:
- `dist/Araxia Trinity Launcher.exe` - The portable executable

## Testing the Build

1. **Copy files to WoW folder:**
   - Copy `dist/Araxia Trinity Launcher.exe` to your World of Warcraft folder
   - Copy `araxiatrinity.yml` to the same folder
   - Ensure your `Arctium Game Launcher.exe` is in the same folder

2. **Configure servers:**
   - Edit `araxiatrinity.yml` to set your server details:
     ```yaml
     servers:
       - name: "BattleNet Server"
         host: "your.server.com"
         tunnels:
           - localPort: 1119
             remotePort: 1119
             name: "BattleNet Auth"
           - localPort: 8081
             remotePort: 8081
             name: "BattleNet Realm"
       - name: "WorldServer"
         host: "your.server.com"
         tunnels:
           - localPort: 8085
             remotePort: 8085
             name: "WorldServer"
     ```

3. **Run the launcher:**
   - Double-click `Araxia Trinity Launcher.exe`
   - Click "Connect All" to establish tunnels
   - Click "Launch Game" to start the game

## Troubleshooting

### Build fails with TypeScript errors
- Make sure all dependencies are installed: `npm install`
- Check that you're using Node.js 20+: `node --version`

### Executable doesn't find config file
- Ensure `araxiatrinity.yml` is in the same directory as the .exe

### Launch Game button is disabled
- Verify that a file starting with "Arctium Game Launcher" and ending with ".exe" exists in the same directory

## Development vs Production

- **Development**: Run `docker-compose up` for hot-reload development in browser
- **Production**: Run `.\build.ps1` to create the standalone .exe
