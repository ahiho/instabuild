// Particle fragment shader
uniform vec3 uColor;
uniform float uOpacity;

varying float vLifetime;
varying float vDepth;

void main() {
  // Calculate distance from center of point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Soft circular shape with glow
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

  // Add bright core
  float core = 1.0 - smoothstep(0.0, 0.15, dist);
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);

  // Combine core and glow
  float brightness = core * 2.0 + glow * 0.8;

  // Apply lifetime-based fade
  float lifetimeFade = smoothstep(0.0, 0.15, vLifetime) * (1.0 - smoothstep(0.85, 1.0, vLifetime));

  // Depth-based transparency for parallax effect
  float depthAlpha = mix(0.3, 1.0, vDepth);

  // Final color with luminosity
  vec3 finalColor = uColor * brightness;
  float finalAlpha = alpha * lifetimeFade * depthAlpha * uOpacity;

  // Add slight color variation based on depth
  finalColor = mix(finalColor * 0.8, finalColor * 1.2, vDepth);

  gl_FragColor = vec4(finalColor, finalAlpha);

  // Discard fully transparent fragments
  if (gl_FragColor.a < 0.01) discard;
}
