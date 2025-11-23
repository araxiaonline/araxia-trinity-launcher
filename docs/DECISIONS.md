# Design Decisions

## Technology Choices

### Electron
- **Decision**: Use Electron for cross-platform desktop application
- **Rationale**: 
  - Allows building Windows, macOS, and Linux apps from single codebase
  - Native access to system APIs (file system, network)
  - Mature ecosystem with good tooling
  - Can run Node.js for SSH tunneling

### React
- **Decision**: Use React for UI framework
- **Rationale**:
  - Component-based architecture for maintainability
  - Large ecosystem of libraries
  - Good developer experience with hot reloading
  - Familiar to most web developers

### TCP Port Forwarding
- **Decision**: Use Node.js `net` module for direct TCP tunneling
- **Rationale**:
  - No SSH or authentication overhead
  - Simple, direct port forwarding
  - Built-in Node.js module (no external dependencies)
  - Suitable for exposed remote ports
  - Lower latency than SSH tunneling

### YAML Configuration
- **Decision**: Use YAML for configuration file format
- **Rationale**:
  - Human-readable and easy to edit
  - Supports nested structures for multiple servers
  - Industry standard for configuration
  - Can be edited in any text editor

### Docker for Development
- **Decision**: Use Docker for all build and development tooling
- **Rationale**:
  - No local Node.js installation required
  - Consistent environment across machines
  - Easy to manage dependencies
  - Reproducible builds

### TailwindCSS
- **Decision**: Use TailwindCSS for styling
- **Rationale**:
  - Utility-first approach for rapid development
  - Smaller bundle size than traditional CSS frameworks
  - Dark mode support (needed for the app)
  - Good integration with React

### Lucide Icons
- **Decision**: Use Lucide React for icons
- **Rationale**:
  - Lightweight SVG icon library
  - Good icon set for status indicators
  - Tree-shakeable (only used icons included)

## Architecture Decisions

### IPC Communication
- **Decision**: Use Electron IPC for main ↔ renderer communication
- **Rationale**:
  - Secure context isolation between processes
  - Prevents XSS attacks from compromising SSH credentials
  - Standard Electron pattern
  - Preload script validates all messages

### Exponential Backoff Retry
- **Decision**: Implement exponential backoff for connection retries
- **Rationale**:
  - Prevents overwhelming server with connection attempts
  - Graceful degradation on network issues
  - Configurable max retry limit (10 attempts)
  - Delay range: 1s → 2s → 4s → 8s → 16s → 60s (capped)

### Configuration Location
- **Decision**: Store config in user home directory (`~/araxiatrinity.yml`)
- **Rationale**:
  - Standard location for user configurations
  - Works across Windows, macOS, Linux
  - Separate from application code
  - Can be version controlled separately

### SSH Key Authentication
- **Decision**: Use private key authentication (no password)
- **Rationale**:
  - More secure than password authentication
  - Can be automated without storing passwords
  - Standard for server administration
  - Supports key passphrases if needed

## Security Decisions

### Context Isolation
- **Decision**: Enable Electron context isolation
- **Rationale**:
  - Prevents renderer process from accessing Node.js APIs directly
  - SSH credentials only accessible through preload script
  - Reduces attack surface

### Preload Script Validation
- **Decision**: Validate all IPC messages in preload script
- **Rationale**:
  - Single point of validation for all IPC calls
  - Prevents malicious renderer code from accessing sensitive APIs
  - Type-safe message passing

### Private Key Handling
- **Decision**: Never log or store private keys in memory longer than needed
- **Rationale**:
  - Minimizes exposure of sensitive credentials
  - Keys read from disk only when connecting
  - Cleared after SSH session established

## UI/UX Decisions

### Real-time Status Updates
- **Decision**: Use IPC events for real-time tunnel status updates
- **Rationale**:
  - Immediate feedback to user
  - No polling overhead
  - Responsive user experience

### Server Selection Panel
- **Decision**: Sidebar with server list and status indicators
- **Rationale**:
  - Easy to switch between servers
  - Visual status at a glance
  - Familiar UI pattern

### Inline Config Editor
- **Decision**: YAML editor in modal/panel rather than external editor
- **Rationale**:
  - No need to open separate application
  - Validation feedback within app
  - Easier workflow for users

## Future Considerations

### Potential Enhancements
1. **Multiple Profiles**: Support different configurations per user
2. **Connection History**: Log successful connections and errors
3. **Tunnel Bandwidth Monitoring**: Show data transfer rates
4. **Auto-connect**: Option to automatically connect on app startup
5. **Notifications**: System notifications for connection status changes
6. **SSH Agent Support**: Use system SSH agent instead of key files
7. **Web UI**: Alternative web-based interface
8. **Remote Monitoring**: Dashboard for server health

### Known Limitations
1. **Single SSH Connection**: One connection per server (could be optimized)
2. **No Tunnel Multiplexing**: Each tunnel uses separate connection
3. **No Compression**: SSH compression not enabled (could improve bandwidth)
4. **No Key Caching**: Key loaded from disk each time (could cache in memory)

## Testing Strategy

### Unit Tests
- Configuration validation
- Exponential backoff calculation
- IPC message handling

### Integration Tests
- SSH connection flow
- Tunnel establishment
- Config file loading/saving

### E2E Tests
- Full application workflow
- UI interactions
- Error scenarios

## Deployment Strategy

### Development
- Docker Compose for local development
- Hot module reloading for fast iteration

### Production
- Docker build for consistent environment
- Electron Builder for packaging
- Signed releases for security

### Distribution
- GitHub Releases for binary distribution
- Auto-update capability (future)
