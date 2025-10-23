import { Canvas } from '@react-three/fiber';
import { WavingParticles } from './WavingParticles';

/**
 * WavingParticleBackground: Premium particle system background
 *
 * Visual Design:
 * - Dark navy background (#0a0e27)
 * - 500-2000 glowing particles with soft bloom
 * - White/cyan particles with subtle transparency
 * - 3D parallax with depth-of-field
 *
 * Animation:
 * - Smooth, organic motion using Perlin noise
 * - Slow, meditative speed (10-30 seconds to traverse viewport)
 * - Particles fade in/out at edges
 * - No jerky movements - all motion eased
 *
 * Performance:
 * - GPU-accelerated particle simulation
 * - Efficient shader-based rendering
 * - Optimized for 60fps on modern hardware
 */
export function WavingParticleBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0e27]">
      <Canvas
        camera={{
          position: [1.26, 2.66, -1.82],
          fov: 50,
          near: 0.01,
          far: 300,
        }}
        dpr={[1, 2]} // Device pixel ratio: [min, max] for performance/quality balance
      >
        {/* Background color */}
        <color attach="background" args={['#0a0e27']} />

        {/* Waving particle system */}
        <WavingParticles
          speed={0.3} // Slow, meditative animation
          focus={3.8} // Depth-of-field focus distance
          aperture={1.79} // Depth-of-field blur amount
          size={512} // 512x512 = 262,144 particles
          noiseScale={0.6} // Perlin noise frequency
          noiseIntensity={0.52} // Wave amplitude
          timeScale={0.3} // Animation speed multiplier
          pointSize={10.0} // Particle size
          opacity={0.8} // Particle transparency
          planeScale={10.0} // Spread area
        />
      </Canvas>
    </div>
  );
}
