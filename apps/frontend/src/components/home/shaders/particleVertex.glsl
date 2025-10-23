// Particle vertex shader
uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uResolution;

attribute vec3 aVelocity;
attribute float aLifetime;
attribute float aSize;

varying float vLifetime;
varying float vDepth;

void main() {
  // Calculate lifetime-based opacity
  vLifetime = aLifetime;

  // Position in 3D space
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  // Depth for parallax effect (normalized)
  vDepth = (viewPosition.z + 50.0) / 100.0;

  // Size based on depth and particle size attribute
  float sizeAttenuation = 1.0 - clamp(vDepth * 0.5, 0.0, 0.8);
  gl_PointSize = aSize * uPixelRatio * sizeAttenuation * (uResolution.y / 800.0);

  // Ensure particles fade at edges of their lifetime
  if (vLifetime < 0.1 || vLifetime > 0.9) {
    gl_PointSize *= smoothstep(0.0, 0.1, vLifetime) * (1.0 - smoothstep(0.9, 1.0, vLifetime));
  }
}
