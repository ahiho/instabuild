#!/bin/bash

# Install gVisor for enhanced container security
set -e

echo "Installing gVisor runtime..."

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
  x86_64) ARCH="x86_64" ;;
  aarch64) ARCH="aarch64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Download and install runsc
curl -fsSL https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}/runsc -o runsc
curl -fsSL https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}/runsc.sha512 -o runsc.sha512
sha512sum -c runsc.sha512
rm -f runsc.sha512
chmod a+rx runsc
sudo mv runsc /usr/local/bin

# Download and install containerd-shim-runsc-v1
curl -fsSL https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}/containerd-shim-runsc-v1 -o containerd-shim-runsc-v1
curl -fsSL https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}/containerd-shim-runsc-v1.sha512 -o containerd-shim-runsc-v1.sha512
sha512sum -c containerd-shim-runsc-v1.sha512
rm -f containerd-shim-runsc-v1.sha512
chmod a+rx containerd-shim-runsc-v1
sudo mv containerd-shim-runsc-v1 /usr/local/bin

# Configure Docker daemon
echo "Configuring Docker daemon for gVisor..."
sudo mkdir -p /etc/docker
sudo cp gvisor/daemon.json /etc/docker/daemon.json

# Restart Docker
echo "Restarting Docker daemon..."
sudo systemctl restart docker

echo "✅ gVisor installation complete!"
echo "Test with: docker run --runtime=runsc hello-world"