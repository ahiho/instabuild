import { useEffect, useRef } from 'react';

/**
 * Geometric dot grid background with subtle wave animations
 * Minimalist dark theme with white/gray dots on black
 */
export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    // Grid configuration
    const GRID_SPACING = 80; // Space between dots
    const DOT_SIZE = 2; // Base dot size
    const WAVE_AMPLITUDE = 12; // How far the wave displaces (vertical movement)
    const WAVE_SPEED = 0.001; // Wave animation speed
    const WAVE_FREQUENCY = 0.01; // How many waves across the screen
    const DOT_COLOR = 'rgba(255, 255, 255, 0.4)'; // White with opacity

    // Create grid points
    interface GridDot {
      baseX: number;
      baseY: number;
      col: number;
      row: number;
    }

    const createGrid = (): GridDot[] => {
      const dots: GridDot[] = [];
      const cols = Math.ceil(canvas.width / GRID_SPACING) + 2;
      const rows = Math.ceil(canvas.height / GRID_SPACING) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dots.push({
            baseX: col * GRID_SPACING,
            baseY: row * GRID_SPACING,
            col,
            row,
          });
        }
      }
      return dots;
    };

    let gridDots = createGrid();
    const startTime = Date.now();

    // Animation loop
    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw dots with synchronized wave displacement
      gridDots.forEach(dot => {
        // Synchronized wave: all dots follow the same wave pattern based on their position
        // Creates a rippling fabric effect across the entire grid
        const wavePhase =
          (dot.baseX + dot.baseY) * WAVE_FREQUENCY + elapsed * WAVE_SPEED;
        const displaceY = Math.sin(wavePhase) * WAVE_AMPLITUDE;

        const x = dot.baseX;
        const y = dot.baseY + displaceY;

        // Skip dots outside canvas
        if (
          x < -20 ||
          x > canvas.width + 20 ||
          y < -20 ||
          y > canvas.height + 20
        ) {
          return;
        }

        // Draw dot
        ctx.fillStyle = DOT_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      setCanvasSize();
      gridDots = createGrid(); // Recreate grid on resize
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: '#000000' }}
    />
  );
}
