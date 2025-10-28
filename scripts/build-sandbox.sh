#!/bin/bash

# Build script for Agentic Landing Page Builder Sandbox
set -e

echo "Building Agentic Sandbox Docker image..."

# Build the Docker image
docker build -f Dockerfile.sandbox -t agentic-sandbox-base:latest .

echo "✅ Sandbox Docker image built successfully!"
echo "Image: agentic-sandbox-base:latest"
echo ""
echo "To test the image:"
echo "docker run -p 5173:5173 agentic-sandbox-base:latest"