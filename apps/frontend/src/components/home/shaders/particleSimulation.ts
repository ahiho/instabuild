// Particle simulation logic with Perlin noise

import type { Particle, ParticleConfig } from './particleConfig';
import * as THREE from 'three';

// Simple Perlin noise implementation
class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed = 0) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    // Fisher-Yates shuffle with seed
    const random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [
        this.permutation[j],
        this.permutation[i],
      ];
    }
    this.p = [...this.permutation, ...this.permutation];
  }

  private seededRandom(seed: number) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z)
        ),
        this.lerp(
          u,
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z)
        )
      ),
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1)
        ),
        this.lerp(
          u,
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }
}

export class ParticleSimulation {
  private particles: Particle[] = [];
  private noise: PerlinNoise;
  private config: ParticleConfig;
  private mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  private time: number = 0;

  constructor(config: ParticleConfig) {
    this.config = config;
    this.noise = new PerlinNoise(Math.random() * 1000);
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      const particle: Particle = {
        position: [
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * this.config.depthRange,
        ],
        velocity: [0, 0, 0],
        originalPosition: [0, 0, 0],
        lifetime: Math.random(),
        size: this.config.particleSize * (0.5 + Math.random() * 0.5),
        noiseOffset: [
          Math.random() * 1000,
          Math.random() * 1000,
          Math.random() * 1000,
        ],
      };
      particle.originalPosition = [...particle.position];
      this.particles.push(particle);
    }
  }

  setMousePosition(x: number, y: number): void {
    this.mousePosition.set(x, y);
  }

  updateParticleCount(count: number): void {
    if (count > this.particles.length) {
      // Add particles
      const toAdd = count - this.particles.length;
      for (let i = 0; i < toAdd; i++) {
        const particle: Particle = {
          position: [
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * this.config.depthRange,
          ],
          velocity: [0, 0, 0],
          originalPosition: [0, 0, 0],
          lifetime: Math.random(),
          size: this.config.particleSize * (0.5 + Math.random() * 0.5),
          noiseOffset: [
            Math.random() * 1000,
            Math.random() * 1000,
            Math.random() * 1000,
          ],
        };
        particle.originalPosition = [...particle.position];
        this.particles.push(particle);
      }
    } else if (count < this.particles.length) {
      // Remove particles
      this.particles.splice(count);
    }
    this.config.particleCount = count;
  }

  update(deltaTime: number): Float32Array {
    this.time += deltaTime;

    // Update each particle
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      // Perlin noise-based movement
      const noiseX = this.noise.noise(
        (particle.originalPosition[0] + particle.noiseOffset[0]) *
          this.config.noiseScale,
        this.time * this.config.noiseSpeed,
        0
      );
      const noiseY = this.noise.noise(
        (particle.originalPosition[1] + particle.noiseOffset[1]) *
          this.config.noiseScale,
        this.time * this.config.noiseSpeed,
        100
      );
      const noiseZ = this.noise.noise(
        (particle.originalPosition[2] + particle.noiseOffset[2]) *
          this.config.noiseScale,
        this.time * this.config.noiseSpeed,
        200
      );

      // Apply noise to velocity
      particle.velocity[0] += noiseX * this.config.movementSpeed * 0.02;
      particle.velocity[1] += noiseY * this.config.movementSpeed * 0.02;
      particle.velocity[2] += noiseZ * this.config.movementSpeed * 0.01;

      // Mouse interaction
      if (this.config.enableInteraction) {
        const dx = this.mousePosition.x - particle.position[0];
        const dy = this.mousePosition.y - particle.position[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.config.interactionRadius) {
          const force =
            (1 - distance / this.config.interactionRadius) *
            this.config.interactionStrength;
          const angle = Math.atan2(dy, dx);

          if (this.config.interactionType === 'attract') {
            particle.velocity[0] += Math.cos(angle) * force * 0.5;
            particle.velocity[1] += Math.sin(angle) * force * 0.5;
          } else if (this.config.interactionType === 'repel') {
            particle.velocity[0] -= Math.cos(angle) * force * 0.5;
            particle.velocity[1] -= Math.sin(angle) * force * 0.5;
          } else {
            // 'both' - oscillate between attract and repel
            const oscillation = Math.sin(this.time * 2);
            particle.velocity[0] += Math.cos(angle) * force * 0.5 * oscillation;
            particle.velocity[1] += Math.sin(angle) * force * 0.5 * oscillation;
          }
        }
      }

      // Apply velocity damping
      particle.velocity[0] *= 0.95;
      particle.velocity[1] *= 0.95;
      particle.velocity[2] *= 0.95;

      // Update position
      particle.position[0] += particle.velocity[0];
      particle.position[1] += particle.velocity[1];
      particle.position[2] += particle.velocity[2];

      // Update lifetime
      particle.lifetime = (particle.lifetime + deltaTime * 0.05) % 1.0;

      // Wrap particles at edges
      const bounds = { x: 60, y: 40, z: this.config.depthRange / 2 };
      if (Math.abs(particle.position[0]) > bounds.x) {
        particle.position[0] = -Math.sign(particle.position[0]) * bounds.x;
        particle.lifetime = 0;
      }
      if (Math.abs(particle.position[1]) > bounds.y) {
        particle.position[1] = -Math.sign(particle.position[1]) * bounds.y;
        particle.lifetime = 0;
      }
      if (Math.abs(particle.position[2]) > bounds.z) {
        particle.position[2] = -Math.sign(particle.position[2]) * bounds.z;
      }
    }

    // Convert to Float32Array for GPU transfer
    return this.getPositionArray();
  }

  getPositionArray(): Float32Array {
    const positions = new Float32Array(this.particles.length * 3);
    for (let i = 0; i < this.particles.length; i++) {
      positions[i * 3] = this.particles[i].position[0];
      positions[i * 3 + 1] = this.particles[i].position[1];
      positions[i * 3 + 2] = this.particles[i].position[2];
    }
    return positions;
  }

  getVelocityArray(): Float32Array {
    const velocities = new Float32Array(this.particles.length * 3);
    for (let i = 0; i < this.particles.length; i++) {
      velocities[i * 3] = this.particles[i].velocity[0];
      velocities[i * 3 + 1] = this.particles[i].velocity[1];
      velocities[i * 3 + 2] = this.particles[i].velocity[2];
    }
    return velocities;
  }

  getLifetimeArray(): Float32Array {
    const lifetimes = new Float32Array(this.particles.length);
    for (let i = 0; i < this.particles.length; i++) {
      lifetimes[i] = this.particles[i].lifetime;
    }
    return lifetimes;
  }

  getSizeArray(): Float32Array {
    const sizes = new Float32Array(this.particles.length);
    for (let i = 0; i < this.particles.length; i++) {
      sizes[i] = this.particles[i].size;
    }
    return sizes;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
