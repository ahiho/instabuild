import type { PerformanceMetrics } from '../../types/home';

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private isMonitoring = false;

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.measureFPS();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private measureFPS(): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    this.frameCount++;

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastTime)
      );
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    requestAnimationFrame(() => this.measureFPS());
  }

  getCurrentMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      loadTime: this.getPageLoadTime(),
      interactionDelay: this.getInteractionDelay(),
    };
  }

  private getPageLoadTime(): number {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    return navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
  }

  private getInteractionDelay(): number {
    // Measure time from user interaction to visual response
    // This is a simplified implementation
    return performance.now() % 100; // Placeholder for actual measurement
  }

  // Check if device can handle complex animations
  isHighPerformanceDevice(): boolean {
    return this.fps >= 55 && navigator.hardwareConcurrency >= 4;
  }

  // Adaptive animation settings based on performance
  getOptimalAnimationSettings() {
    const isHighPerf = this.isHighPerformanceDevice();

    return {
      particleCount: isHighPerf ? 100 : 50,
      animationDuration: isHighPerf ? 1 : 0.5,
      enableComplexEffects: isHighPerf,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const measureInteractionTime = (callback: () => void) => {
  const startTime = performance.now();
  callback();
  return performance.now() - startTime;
};

export const throttleAnimation = (fn: () => void, fps = 60) => {
  let lastTime = 0;
  const interval = 1000 / fps;

  return () => {
    const currentTime = performance.now();
    if (currentTime - lastTime >= interval) {
      lastTime = currentTime;
      fn();
    }
  };
};
