// Particle system configuration and types

export interface ParticleConfig {
  particleCount: number;
  particleSize: number;
  color: string;
  backgroundColor: string;
  movementSpeed: number;
  interactionRadius: number;
  interactionStrength: number;
  interactionType: 'attract' | 'repel' | 'both';
  noiseScale: number;
  noiseSpeed: number;
  depthRange: number;
  enableBloom: boolean;
  bloomStrength: number;
  enableInteraction: boolean;
  adaptivePerformance: boolean;
  targetFPS: number;
}

export interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  originalPosition: [number, number, number];
  lifetime: number;
  size: number;
  noiseOffset: [number, number, number];
}

export const DEFAULT_CONFIG: ParticleConfig = {
  particleCount: 1000,
  particleSize: 4.0,
  color: '#00d9ff', // Cyan accent
  backgroundColor: '#0a0e27', // Dark navy
  movementSpeed: 0.15, // Slower for meditative feel (10-30s traverse)
  interactionRadius: 300,
  interactionStrength: 0.3, // Gentler interaction
  interactionType: 'attract',
  noiseScale: 0.3, // Smoother, broader waves
  noiseSpeed: 0.05, // Much slower noise animation
  depthRange: 100,
  enableBloom: true,
  bloomStrength: 1.5,
  enableInteraction: true,
  adaptivePerformance: true,
  targetFPS: 50,
};

// Preset configurations for different use cases
export const PRESETS = {
  fintech: {
    ...DEFAULT_CONFIG,
    color: '#00d9ff',
    backgroundColor: '#0a0e27',
    particleCount: 1500,
    interactionType: 'attract' as const,
  },
  venture: {
    ...DEFAULT_CONFIG,
    color: '#ffffff',
    backgroundColor: '#0f1419',
    particleCount: 800,
    interactionType: 'repel' as const,
    movementSpeed: 0.2,
  },
  tech: {
    ...DEFAULT_CONFIG,
    color: '#8b5cf6',
    backgroundColor: '#1a1a2e',
    particleCount: 1200,
    interactionType: 'both' as const,
  },
} as const;

// Performance quality levels
export enum PerformanceQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

export const QUALITY_SETTINGS = {
  [PerformanceQuality.LOW]: {
    particleCount: 300,
    bloomStrength: 0.8,
    enableInteraction: false,
  },
  [PerformanceQuality.MEDIUM]: {
    particleCount: 600,
    bloomStrength: 1.0,
    enableInteraction: true,
  },
  [PerformanceQuality.HIGH]: {
    particleCount: 1000,
    bloomStrength: 1.5,
    enableInteraction: true,
  },
  [PerformanceQuality.ULTRA]: {
    particleCount: 2000,
    bloomStrength: 2.0,
    enableInteraction: true,
  },
};
