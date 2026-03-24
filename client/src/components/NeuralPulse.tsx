/**
 * NeuralPulse — Canvas 2D neural network animation.
 *
 * Substitui o Three.js WebGL NeuralSphere por uma implementação
 * leve e reativa usando apenas a Canvas API nativa.
 *
 * Estados visuais:
 *  idle       → roxo vibrante  (#9664FF) · velocidade baixa
 *  thinking   → ciano  (#00DCFF) · acelera suavemente
 *  searching  → ciano  (#00DCFF) · máxima velocidade
 *  executing  → amarelo (#FBBB24) · pulsante
 *  alert      → vermelho (#EF4444) · pulso rápido
 */

import { useEffect, useRef } from "react";
import { useNeuralSphere } from "@/contexts/NeuralSphereContext";
import type { AgentState } from "@/contexts/NeuralSphereContext";

// ── Cor-alvo por estado ────────────────────────────────────────────────────

const STATE_COLOR: Record<AgentState, [number, number, number]> = {
  idle:      [150, 100, 255],  // roxo
  thinking:  [0,   220, 255],  // ciano
  searching: [0,   220, 255],  // ciano
  executing: [251, 187,  36],  // âmbar
  alert:     [239,  68,  68],  // vermelho
};

const STATE_SPEED: Record<AgentState, number> = {
  idle:      1.0,
  thinking:  2.8,
  searching: 3.5,
  executing: 2.2,
  alert:     3.0,
};

// ── Partícula ──────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

const PARTICLE_COUNT  = 65;
const BASE_SPEED      = 0.45;
const CONN_DIST       = 130;

// ── Componente ─────────────────────────────────────────────────────────────

export function NeuralPulse() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const { agentState } = useNeuralSphere();
  const stateRef    = useRef<AgentState>(agentState);
  const currentColor = useRef<[number, number, number]>([150, 100, 255]);
  const currentSpeed = useRef<number>(1.0);
  const frameRef     = useRef<number>(0);

  // Keep stateRef current so the animation loop reads it without re-mounting
  useEffect(() => { stateRef.current = agentState; }, [agentState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width  = rect?.width  ?? window.innerWidth;
      canvas.height = rect?.height ?? 350;
    };
    resize();

    const ctx = canvas.getContext("2d")!;

    // Init particles
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * BASE_SPEED,
      vy: (Math.random() - 0.5) * BASE_SPEED,
      r:  Math.random() * 1.5 + 0.8,
    }));

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function draw() {
      if (!canvas) return;
      frameRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state   = stateRef.current;
      const target  = STATE_COLOR[state];
      const tSpeed  = STATE_SPEED[state];
      const lerpT   = 0.06;

      // Smooth color & speed transitions
      const c = currentColor.current;
      c[0] = lerp(c[0], target[0], lerpT);
      c[1] = lerp(c[1], target[1], lerpT);
      c[2] = lerp(c[2], target[2], lerpT);
      currentSpeed.current = lerp(currentSpeed.current, tSpeed, 0.04);

      const [r, g, b] = c.map(Math.round);
      const boost = currentSpeed.current;

      ctx.fillStyle   = `rgba(${r},${g},${b},0.55)`;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
      ctx.lineWidth   = 0.9;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * boost;
        p.y += p.vy * boost;

        // Bounce
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONN_DIST) {
            const alpha = (1 - dist / CONN_DIST) * 0.25;
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    }

    draw();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
