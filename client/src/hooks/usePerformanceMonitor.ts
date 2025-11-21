import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: number;
  quality: 'high' | 'medium' | 'low';
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memory: 0,
    quality: 'high',
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const measureFrame = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;

      frameTimesRef.current.push(deltaTime);
      while (frameTimesRef.current.length > 60) {
        frameTimesRef.current.pop();
      }

      frameCountRef.current++;

      // Update metrics every 500ms
      if (frameCountRef.current % 30 === 0) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);

        // Get memory usage if available
        let memory = 0;
        if ((performance as any).memory) {
          memory = Math.round((performance as any).memory.usedJSHeapSize / 1048576); // MB
        }

        // Determine quality based on FPS
        let quality: 'high' | 'medium' | 'low' = 'high';
        if (fps < 30) {
          quality = 'low';
        } else if (fps < 45) {
          quality = 'medium';
        }

        setMetrics({
          fps,
          frameTime: avgFrameTime,
          memory,
          quality,
        });
      }

      lastTimeRef.current = now;
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return metrics;
}
