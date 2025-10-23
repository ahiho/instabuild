import * as THREE from 'three';
import { useMemo, useState, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import { DofPointsMaterial } from '../../shaders/pointMaterial';
import { SimulationMaterial } from '../../shaders/simulationMaterial';

interface ParticlesProps {
  speed?: number;
  aperture?: number;
  focus?: number;
  size?: number;
  noiseScale?: number;
  noiseIntensity?: number;
  timeScale?: number;
  pointSize?: number;
  opacity?: number;
  planeScale?: number;
}

/**
 * WavingParticles: GPU-accelerated particle system with smooth, organic motion
 * Features:
 * - 512x512 particles (262,144 total) for dense, rich visuals
 * - Perlin noise-based movement for natural, flowing animation
 * - Depth-of-field rendering for 3D parallax effect
 * - Fade-in animation on mount
 * - Sparkle effect for luminous quality
 */
export function WavingParticles({
  speed = 0.3,
  aperture = 1.79,
  focus = 3.8,
  size = 512,
  noiseScale = 0.6,
  noiseIntensity = 0.52,
  timeScale = 0.3,
  pointSize = 10.0,
  opacity = 0.8,
  planeScale = 10.0,
  ...props
}: ParticlesProps) {
  // Reveal animation state
  const revealStartTime = useRef<number | null>(null);
  const revealDuration = 3.5; // seconds - slow, meditative fade-in

  // Create simulation material with scale parameter
  const simulationMaterial = useMemo(() => {
    return new SimulationMaterial(planeScale);
  }, [planeScale]);

  // Frame buffer object for GPU simulation
  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });

  // Create point material with depth-of-field
  const dofPointsMaterial = useMemo(() => {
    const m = new DofPointsMaterial();
    m.uniforms.positions.value = target.texture;
    m.uniforms.initialPositions.value =
      simulationMaterial.uniforms.positions.value;
    return m;
  }, [simulationMaterial, target.texture]);

  // Scene for GPU simulation
  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1)
  );

  // Geometry for simulation quad
  const [positions] = useState(
    () =>
      new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
      ])
  );
  const [uvs] = useState(
    () => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0])
  );

  // Particle positions (UV coordinates for texture lookup)
  const particles = useMemo(() => {
    const length = size * size;
    const particles = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      const i3 = i * 3;
      particles[i3 + 0] = (i % size) / size;
      particles[i3 + 1] = i / size / size;
    }
    return particles;
  }, [size]);

  // Animation loop
  useFrame((state, delta) => {
    if (!dofPointsMaterial || !simulationMaterial) return;

    // Render simulation to texture
    state.gl.setRenderTarget(target);
    state.gl.clear();
    state.gl.render(scene, camera);
    state.gl.setRenderTarget(null);

    const currentTime = state.clock.elapsedTime;

    // Initialize reveal start time on first frame
    if (revealStartTime.current === null) {
      revealStartTime.current = currentTime;
    }

    // Calculate reveal progress
    const revealElapsed = currentTime - revealStartTime.current;
    const revealProgress = Math.min(revealElapsed / revealDuration, 1.0);

    // Ease out the reveal animation
    const easedProgress = 1 - Math.pow(1 - revealProgress, 3);

    // Map progress to reveal factor (0 = fully hidden, higher values = more revealed)
    const revealFactor = easedProgress * 4.0;

    // Update point material uniforms
    dofPointsMaterial.uniforms.uTime.value = currentTime;
    dofPointsMaterial.uniforms.uFocus.value = focus;
    dofPointsMaterial.uniforms.uBlur.value = aperture;
    dofPointsMaterial.uniforms.uPointSize.value = pointSize;
    dofPointsMaterial.uniforms.uOpacity.value = opacity;
    dofPointsMaterial.uniforms.uRevealFactor.value = revealFactor;
    dofPointsMaterial.uniforms.uRevealProgress.value = easedProgress;

    // Update simulation material uniforms
    simulationMaterial.uniforms.uTime.value = currentTime;
    simulationMaterial.uniforms.uNoiseScale.value = noiseScale;
    simulationMaterial.uniforms.uNoiseIntensity.value = noiseIntensity;
    simulationMaterial.uniforms.uTimeScale.value = timeScale * speed;
  });

  return (
    <>
      {/* Simulation scene (renders to texture) */}
      {createPortal(
        <mesh material={simulationMaterial}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          </bufferGeometry>
        </mesh>,
        scene
      )}

      {/* Rendered particles */}
      <points material={dofPointsMaterial} {...props}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
      </points>
    </>
  );
}
