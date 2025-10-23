import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSimulation } from './shaders/particleSimulation';
import {
  DEFAULT_CONFIG,
  QUALITY_SETTINGS,
  PerformanceQuality,
  type ParticleConfig,
} from './shaders/particleConfig';

// Import shaders
import particleVertexShader from './shaders/particleVertex.glsl';
import particleFragmentShader from './shaders/particleFragment.glsl';

interface GLBackgroundProps {
  config?: Partial<ParticleConfig>;
  className?: string;
}

interface ParticleSystemProps {
  config: ParticleConfig;
  onPerformanceChange?: (fps: number, quality: PerformanceQuality) => void;
}

function ParticleSystem({ config, onPerformanceChange }: ParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const simulationRef = useRef<ParticleSimulation | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const fpsTrackerRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const [currentQuality, setCurrentQuality] = useState<PerformanceQuality>(
    PerformanceQuality.HIGH
  );

  const { viewport, size } = useThree();

  // Initialize simulation
  useEffect(() => {
    simulationRef.current = new ParticleSimulation(config);
  }, []);

  // Update configuration when it changes
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.updateParticleCount(config.particleCount);
    }
  }, [config.particleCount]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!config.enableInteraction) return;

      // Convert screen coordinates to Three.js world coordinates
      const x = (event.clientX / size.width) * 2 - 1;
      const y = -(event.clientY / size.height) * 2 + 1;

      // Scale to viewport
      mouseRef.current.x = (x * viewport.width) / 2;
      mouseRef.current.y = (y * viewport.height) / 2;

      if (simulationRef.current) {
        simulationRef.current.setMousePosition(
          mouseRef.current.x,
          mouseRef.current.y
        );
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [
    config.enableInteraction,
    size.width,
    size.height,
    viewport.width,
    viewport.height,
  ]);

  // Shader material
  const shaderMaterial = useMemo(() => {
    // Fallback shaders if imports fail
    const vertexShader =
      particleVertexShader ||
      `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec2 uResolution;
      attribute vec3 aVelocity;
      attribute float aLifetime;
      attribute float aSize;
      varying float vLifetime;
      varying float vDepth;
      void main() {
        vLifetime = aLifetime;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        gl_Position = projectionMatrix * viewPosition;
        vDepth = (viewPosition.z + 50.0) / 100.0;
        gl_PointSize = aSize * uPixelRatio * (1.0 - clamp(vDepth * 0.5, 0.0, 0.8));
      }
    `;

    const fragmentShader =
      particleFragmentShader ||
      `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vLifetime;
      varying float vDepth;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(uColor, alpha * uOpacity);
        if (gl_FragColor.a < 0.01) discard;
      }
    `;

    const colorObj = new THREE.Color(config.color);

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: {
          value: new THREE.Vector3(colorObj.r, colorObj.g, colorObj.b),
        },
        uOpacity: { value: 0.8 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [config.color, size.width, size.height]);

  // Initialize geometry with attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(config.particleCount * 3);
    const velocities = new Float32Array(config.particleCount * 3);
    const lifetimes = new Float32Array(config.particleCount);
    const sizes = new Float32Array(config.particleCount);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [config.particleCount]);

  // Animation loop
  useFrame(state => {
    if (!meshRef.current || !simulationRef.current) return;

    const deltaTime = state.clock.getDelta();
    const currentTime = state.clock.getElapsedTime();

    // Update shader uniforms
    if (shaderMaterial.uniforms) {
      shaderMaterial.uniforms.uTime.value = currentTime;
    }

    // Update particle simulation
    const positions = simulationRef.current.update(deltaTime);
    const velocities = simulationRef.current.getVelocityArray();
    const lifetimes = simulationRef.current.getLifetimeArray();
    const sizes = simulationRef.current.getSizeArray();

    // Update geometry attributes
    const positionAttr = meshRef.current.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const velocityAttr = meshRef.current.geometry.getAttribute(
      'aVelocity'
    ) as THREE.BufferAttribute;
    const lifetimeAttr = meshRef.current.geometry.getAttribute(
      'aLifetime'
    ) as THREE.BufferAttribute;
    const sizeAttr = meshRef.current.geometry.getAttribute(
      'aSize'
    ) as THREE.BufferAttribute;

    positionAttr.set(positions);
    velocityAttr.set(velocities);
    lifetimeAttr.set(lifetimes);
    sizeAttr.set(sizes);

    positionAttr.needsUpdate = true;
    velocityAttr.needsUpdate = true;
    lifetimeAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // Performance monitoring
    if (config.adaptivePerformance) {
      const fps = 1 / deltaTime;
      fpsTrackerRef.current.push(fps);

      // Check FPS every 2 seconds
      if (currentTime - lastTimeRef.current > 2) {
        const avgFps =
          fpsTrackerRef.current.reduce((a, b) => a + b, 0) /
          fpsTrackerRef.current.length;
        fpsTrackerRef.current = [];
        lastTimeRef.current = currentTime;

        // Adjust quality based on performance
        let newQuality = currentQuality;
        if (avgFps < 30 && currentQuality !== PerformanceQuality.LOW) {
          newQuality = PerformanceQuality.LOW;
        } else if (avgFps < 45 && currentQuality === PerformanceQuality.ULTRA) {
          newQuality = PerformanceQuality.HIGH;
        } else if (avgFps > 55 && currentQuality === PerformanceQuality.LOW) {
          newQuality = PerformanceQuality.MEDIUM;
        } else if (
          avgFps > 58 &&
          currentQuality === PerformanceQuality.MEDIUM
        ) {
          newQuality = PerformanceQuality.HIGH;
        }

        if (newQuality !== currentQuality) {
          setCurrentQuality(newQuality);
          const qualitySettings = QUALITY_SETTINGS[newQuality];
          simulationRef.current.updateParticleCount(
            qualitySettings.particleCount
          );
          onPerformanceChange?.(avgFps, newQuality);
        }
      }
    }
  });

  return <points ref={meshRef} geometry={geometry} material={shaderMaterial} />;
}

export function GLBackground({ config, className = '' }: GLBackgroundProps) {
  const mergedConfig: ParticleConfig = { ...DEFAULT_CONFIG, ...config };
  const [performanceQuality, setPerformanceQuality] =
    useState<PerformanceQuality>(PerformanceQuality.HIGH);

  const handlePerformanceChange = (
    fps: number,
    quality: PerformanceQuality
  ) => {
    setPerformanceQuality(quality);
    if (import.meta.env.DEV) {
      console.log(
        `Performance adjusted: ${fps.toFixed(1)} FPS, Quality: ${quality}`
      );
    }
  };

  return (
    <div
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ backgroundColor: mergedConfig.backgroundColor }}
    >
      <Canvas
        camera={{
          position: [0, 0, 50],
          fov: 75,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        {/* Ambient light for general illumination */}
        <ambientLight intensity={0.1} />

        {/* Particle system */}
        <ParticleSystem
          config={mergedConfig}
          onPerformanceChange={handlePerformanceChange}
        />

        {/* Post-processing effects */}
        {/* Temporarily disabled for debugging */}
        {/* {mergedConfig.enableBloom && (
          <EffectComposer>
            <Bloom
              intensity={mergedConfig.bloomStrength}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        )} */}
      </Canvas>

      {/* Performance indicator (dev only) */}
      {import.meta.env.DEV && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-2 rounded text-xs font-mono">
          Quality: {performanceQuality.toUpperCase()}
        </div>
      )}
    </div>
  );
}
