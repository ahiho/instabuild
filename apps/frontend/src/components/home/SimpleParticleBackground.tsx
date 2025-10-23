import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function SimpleParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Particle system
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Simple point material with cyan color
    const material = new THREE.PointsMaterial({
      color: 0x00d9ff,
      size: 2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 50;

    // Animation variables
    let time = 0;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      const positions = particles.geometry.attributes.position
        .array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Simple wave motion using sine
        const waveX = Math.sin(time * 0.5 + positions[i3 + 1] * 0.05) * 0.15;
        const waveY = Math.cos(time * 0.5 + positions[i3] * 0.05) * 0.15;

        // Update positions
        positions[i3] += velocities[i].x + waveX * 0.01;
        positions[i3 + 1] += velocities[i].y + waveY * 0.01;
        positions[i3 + 2] += velocities[i].z;

        // Boundary wrapping
        if (positions[i3] > 50) positions[i3] = -50;
        if (positions[i3] < -50) positions[i3] = 50;
        if (positions[i3 + 1] > 30) positions[i3 + 1] = -30;
        if (positions[i3 + 1] < -30) positions[i3 + 1] = 30;
        if (positions[i3 + 2] > 25) positions[i3 + 2] = -25;
        if (positions[i3 + 2] < -25) positions[i3 + 2] = 25;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.0005;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
}
