# Sandbox Architecture Documentation

## Overview

The Agentic Landing Page Builder uses a secure, multi-tenant sandbox architecture to provide isolated execution environments for user projects. Each user gets their own containerized environment with Vite + React TypeScript setup.

## Architecture Components

### 1. Docker Base Image (`Dockerfile.sandbox`)

- **Base**: Node.js 18 Alpine Linux
- **User**: Non-root user (uid 1000) for security
- **Environment**: Pre-configured Vite + React TypeScript project
- **Port**: Exposes 5173 for Vite dev server
- **Security**: Minimal attack surface with essential tools only

### 2. gVisor Kernel Isolation

- **Runtime**: `runsc` for enhanced container security
- **Isolation**: Kernel-level system call filtering
- **Protection**: Additional layer against container escape attacks
- **Configuration**: Optimized for development workloads

### 3. Sandbox Provisioning Service

**Features:**

- On-demand container creation and management
- Resource limit enforcement (CPU, RAM, execution time)
- Container lifecycle management (creation, cleanup, timeout)
- Multi-tenant isolation with user separation

**Resource Limits:**

- CPU: 0.25 cores (default)
- Memory: 256MB (default)
- Execution timeout: 5 minutes (default)
- Disk quota: 1GB (default)
- Process limit: 100 processes (default)

### 4. Shell Command Runner

**Security Features:**

- Command validation and allowlist
- Argument sanitization
- Dangerous pattern detection
- Timeout handling and resource monitoring

**Allowed Commands:**

- File operations: `ls`, `cat`, `mkdir`, `rm`, `cp`, `mv`, etc.
- Development tools: `npm`, `node`, `git`, `curl`, `vite`, `tsc`
- Text processing: `sed`, `awk`, `grep`, `sort`, etc.
- System info: `pwd`, `whoami`, `date`, `echo`

**Blocked Patterns:**

- Privilege escalation: `sudo`, `su`, `passwd`
- Network tools: `ssh`, `scp`, `netcat`, `telnet`
- System management: `systemctl`, `mount`, `iptables`
- Container escape attempts: `docker`, `crontab`

## API Endpoints

### Sandbox Management

```bash
# Create sandbox
POST /api/v1/sandbox
{
  "userId": "user123",
  "projectId": "project456",
  "useGVisor": true,
  "resourceLimits": {
    "cpuLimit": "0.5",
    "memoryLimit": "512m"
  }
}

# Execute command
POST /api/v1/sandbox/execute
{
  "sandboxId": "sandbox789",
  "command": "npm",
  "args": ["run", "dev"],
  "timeout": 30
}

# Get sandbox info
GET /api/v1/sandbox/{sandboxId}

# Destroy sandbox
DELETE /api/v1/sandbox/{sandboxId}

# Get user sandboxes
GET /api/v1/sandbox/user/{userId}

# Get resource usage
GET /api/v1/sandbox/{sandboxId}/stats

# List processes
GET /api/v1/sandbox/{sandboxId}/processes

# Kill process
POST /api/v1/sandbox/kill-process
{
  "sandboxId": "sandbox789",
  "pid": 1234
}

# Health check
GET /api/v1/sandbox/health
```

## Setup Instructions

### 1. Build Sandbox Image

```bash
# Build the base sandbox image
./scripts/build-sandbox.sh

# Verify image was created
docker images | grep agentic-sandbox-base
```

### 2. Install gVisor (Optional but Recommended)

```bash
# Install gVisor runtime
./gvisor/install-gvisor.sh

# Test gVisor installation
./gvisor/test-gvisor.sh
```

### 3. Install Dependencies

```bash
# Install dockerode and types
cd apps/backend
npm install dockerode @types/dockerode
```

### 4. Start Services

```bash
# Start the backend with sandbox support
npm run dev
```

## Security Considerations

### Container Security

1. **Non-root Execution**: All processes run as uid 1000
2. **Read-only Root**: Base filesystem is read-only where possible
3. **Resource Limits**: CPU, memory, and process limits enforced
4. **Network Isolation**: Containers use bridge networking with restrictions
5. **Tmpfs Mounts**: Temporary filesystems for sensitive directories

### gVisor Protection

1. **System Call Filtering**: Only safe system calls allowed
2. **Kernel Isolation**: Additional layer between container and host kernel
3. **Attack Surface Reduction**: Minimal kernel interface exposed
4. **Container Escape Protection**: Advanced protection against breakout attempts

### Command Validation

1. **Allowlist Approach**: Only explicitly allowed commands can run
2. **Pattern Matching**: Dangerous command patterns are blocked
3. **Argument Sanitization**: Command arguments are cleaned and validated
4. **Timeout Protection**: Commands are killed if they run too long

## Monitoring and Logging

### Resource Monitoring

- CPU usage percentage
- Memory usage and limits
- Network I/O statistics
- Process count and details

### Logging

- Container lifecycle events
- Command execution logs
- Security violations
- Resource usage alerts

### Health Checks

- Docker daemon connectivity
- Base image availability
- Active container count
- Resource utilization

## Troubleshooting

### Common Issues

1. **Docker Not Running**

   ```bash
   sudo systemctl start docker
   ```

2. **Base Image Missing**

   ```bash
   ./scripts/build-sandbox.sh
   ```

3. **gVisor Not Working**

   ```bash
   docker run --runtime=runsc hello-world
   ```

4. **Port Conflicts**
   - Sandbox automatically finds available ports
   - Check with `docker ps` for port mappings

### Debug Commands

```bash
# List all containers
docker ps -a --filter label=agentic.sandbox=true

# View container logs
docker logs <container-id>

# Inspect container
docker inspect <container-id>

# Check gVisor logs
sudo tail -f /tmp/runsc.log
```

## Performance Optimization

### Container Reuse

- Containers are kept alive for session duration
- Automatic cleanup after 30 minutes of inactivity
- Resource pooling for faster provisioning

### Image Optimization

- Multi-stage builds for smaller images
- Pre-installed dependencies in base image
- Optimized layer caching

### Resource Management

- Configurable resource limits per user
- Automatic scaling based on demand
- Efficient cleanup and garbage collection

## Future Enhancements

1. **Horizontal Scaling**: Support for multiple Docker hosts
2. **Persistent Storage**: Optional persistent volumes for projects
3. **Custom Images**: User-defined base images and environments
4. **Advanced Monitoring**: Prometheus metrics and alerting
5. **Load Balancing**: Distribute containers across multiple nodes
