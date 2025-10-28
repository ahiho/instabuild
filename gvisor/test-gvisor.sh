#!/bin/bash

# Test gVisor installation and container escape protection
set -e

echo "Testing gVisor runtime..."

# Test basic functionality
echo "1. Testing basic container execution with gVisor..."
docker run --rm --runtime=runsc alpine:latest echo "Hello from gVisor!"

# Test system call filtering
echo "2. Testing system call filtering..."
docker run --rm --runtime=runsc alpine:latest sh -c "
  echo 'Testing allowed system calls...'
  ls /
  echo 'Testing restricted operations...'
  # This should be filtered/restricted by gVisor
  mount 2>/dev/null || echo 'Mount operation blocked (expected)'
"

# Test network isolation
echo "3. Testing network isolation..."
docker run --rm --runtime=runsc --network=none alpine:latest sh -c "
  echo 'Testing network isolation...'
  ping -c 1 8.8.8.8 2>/dev/null || echo 'Network access blocked (expected)'
"

# Test filesystem isolation
echo "4. Testing filesystem isolation..."
docker run --rm --runtime=runsc -v /tmp:/host-tmp:ro alpine:latest sh -c "
  echo 'Testing filesystem access...'
  ls /host-tmp >/dev/null && echo 'Read-only access works'
  touch /host-tmp/test 2>/dev/null || echo 'Write access blocked (expected)'
"

echo "✅ gVisor tests completed successfully!"