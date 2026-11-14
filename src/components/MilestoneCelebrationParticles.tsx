import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  decay: number;
  shape: 'rect' | 'circle' | 'spark';
}

const FESTIVE_COLORS = [
  '#f59e0b', // warm gold
  '#fbbf24', // bright yellow
  '#10b981', // emerald
  '#34d399', // mint
  '#6366f1', // electric indigo
  '#38bdf8', // sky blue
  '#f43f5e', // coral rose
  '#a855f7', // soft purple
  '#ffffff', // bright spark
];

/**
 * Lightweight, zero-dependency celebration cracker/confetti animation for milestone cards.
 * Runs on HTML5 Canvas and terminates after ~3 seconds to preserve performance.
 */
export default function MilestoneCelebrationParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect user's reduced motion settings
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];

    const createBurst = (originX: number, originY: number, angleDeg: number, spreadDeg: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = ((angleDeg + (Math.random() - 0.5) * spreadDeg) * Math.PI) / 180;
        const speed = 7 + Math.random() * 11;
        const isSpark = Math.random() < 0.25;
        const isCircle = Math.random() < 0.3;

        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: isSpark ? 3 : 5 + Math.random() * 5,
          h: isSpark ? 3 : 7 + Math.random() * 7,
          color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.05 + Math.random() * 0.08,
          opacity: 1,
          decay: 0.005 + Math.random() * 0.007,
          shape: isSpark ? 'spark' : isCircle ? 'circle' : 'rect',
        });
      }
    };

    // Initial dual corner poppers (left and right bursting inward and upward)
    createBurst(width * 0.15, height * 0.78, -55, 45, 40);
    createBurst(width * 0.85, height * 0.78, -125, 45, 40);

    // Follow-up secondary burst after 250ms for pop rhythm
    const secondaryTimer = setTimeout(() => {
      createBurst(width * 0.25, height * 0.72, -65, 40, 25);
      createBurst(width * 0.75, height * 0.72, -115, 40, 25);
      createBurst(width * 0.5, height * 0.65, -90, 60, 30);
    }, 240);

    let isRunning = true;

    const render = () => {
      if (!ctx || !isRunning) return;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.opacity <= 0.01) continue;
        aliveCount++;

        // Physics updates
        p.vx *= 0.96;
        p.vy += 0.22; // gravity
        p.x += p.vx + Math.sin(p.wobble) * 0.8;
        p.y += p.vy;
        p.wobble += p.wobbleSpeed;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Flattening flutter effect
          const scaleY = Math.cos(p.wobble);
          ctx.scale(1, scaleY);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      }

      if (aliveCount > 0) {
        animId = requestAnimationFrame(render);
      } else {
        isRunning = false;
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      clearTimeout(secondaryTimer);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none"
    />
  );
}

