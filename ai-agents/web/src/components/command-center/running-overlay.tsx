'use client';

import { useEffect, useRef } from 'react';

/**
 * Glitch Takeover overlay — full-screen distortion effect when agents are running.
 *
 * Layers:
 * 1. Chromatic aberration strips (random horizontal bands with RGB shift)
 * 2. Scan line sweeping top → bottom
 * 3. Random pixelated noise blocks
 *
 * All rendered on a single canvas for performance.
 */
export function RunningOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let w = 0;
    let h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
    }
    resize();
    window.addEventListener('resize', resize);

    // Scan line state
    let scanY = -40;
    const scanSpeed = 1.5; // px per frame

    // Glitch strip timing
    let nextGlitchAt = 0;
    let glitchStrips: Array<{ y: number; h: number; offset: number; ttl: number }> = [];

    // Noise block timing
    let nextNoiseAt = 0;
    let noiseBlocks: Array<{ x: number; y: number; w: number; h: number; ttl: number }> = [];

    let frame = 0;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      frame++;

      // --- Scan line ---
      scanY += scanSpeed;
      if (scanY > h + 40) scanY = -40;

      const scanGrad = ctx!.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      scanGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.08)');
      scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
      scanGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.08)');
      scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx!.fillStyle = scanGrad;
      ctx!.fillRect(0, scanY - 20, w, 40);

      // Bright center line
      ctx!.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx!.fillRect(0, scanY - 0.5, w, 1);

      // --- Chromatic glitch strips ---
      if (frame >= nextGlitchAt) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          glitchStrips.push({
            y: Math.random() * h,
            h: 2 + Math.random() * 12,
            offset: (Math.random() - 0.5) * 20,
            ttl: 3 + Math.floor(Math.random() * 8),
          });
        }
        nextGlitchAt = frame + 15 + Math.floor(Math.random() * 60);
      }

      glitchStrips = glitchStrips.filter(s => {
        s.ttl--;
        if (s.ttl <= 0) return false;

        // Red channel shift
        ctx!.fillStyle = `rgba(255, 0, 0, ${0.04 + Math.random() * 0.06})`;
        ctx!.fillRect(s.offset, s.y, w, s.h);

        // Cyan channel shift (opposite direction)
        ctx!.fillStyle = `rgba(0, 255, 255, ${0.04 + Math.random() * 0.06})`;
        ctx!.fillRect(-s.offset, s.y + 1, w, s.h);

        return true;
      });

      // --- Noise / pixelated blocks ---
      if (frame >= nextNoiseAt) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const bw = 30 + Math.random() * 100;
          const bh = 20 + Math.random() * 60;
          noiseBlocks.push({
            x: Math.random() * (w - bw),
            y: Math.random() * (h - bh),
            w: bw,
            h: bh,
            ttl: 2 + Math.floor(Math.random() * 6),
          });
        }
        nextNoiseAt = frame + 30 + Math.floor(Math.random() * 90);
      }

      noiseBlocks = noiseBlocks.filter(b => {
        b.ttl--;
        if (b.ttl <= 0) return false;

        // Draw pixelated noise inside block
        const pixelSize = 4 + Math.floor(Math.random() * 4);
        for (let px = b.x; px < b.x + b.w; px += pixelSize) {
          for (let py = b.y; py < b.y + b.h; py += pixelSize) {
            if (Math.random() > 0.6) {
              const brightness = Math.random() * 0.12;
              const hue = Math.random() > 0.5 ? '0, 255, 65' : '6, 182, 212';
              ctx!.fillStyle = `rgba(${hue}, ${brightness})`;
              ctx!.fillRect(px, py, pixelSize, pixelSize);
            }
          }
        }

        return true;
      });

      // --- Occasional full-width flash ---
      if (Math.random() < 0.005) {
        ctx!.fillStyle = `rgba(6, 182, 212, ${0.02 + Math.random() * 0.04})`;
        ctx!.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
