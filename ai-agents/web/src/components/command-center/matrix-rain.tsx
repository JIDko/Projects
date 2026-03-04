'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MatrixRainProps {
  opacity?: number;
  speed?: number;
  className?: string;
}

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FONT_SIZE = 16;
const TARGET_FPS = 30;

export function MatrixRain({ opacity = 1, speed = 1, className }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let columns = 0;
    let drops: number[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      const newCols = Math.floor(canvas!.width / FONT_SIZE);
      if (newCols !== columns) {
        const oldDrops = drops;
        drops = new Array(newCols).fill(0);
        for (let i = 0; i < Math.min(oldDrops.length, newCols); i++) {
          drops[i] = oldDrops[i]!;
        }
        // Randomize new columns
        for (let i = oldDrops.length; i < newCols; i++) {
          drops[i] = Math.random() * -100;
        }
        columns = newCols;
      }
    }

    resize();
    // Initialize drops with random starting positions
    for (let i = 0; i < drops.length; i++) {
      drops[i] = Math.random() * -100;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(document.documentElement);

    let lastFrame = 0;
    const frameInterval = 1000 / TARGET_FPS;

    function draw(timestamp: number) {
      const delta = timestamp - lastFrame;
      if (delta < frameInterval) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      // Fade trail
      ctx!.fillStyle = `rgba(9, 9, 11, ${0.05 + (1 - speed) * 0.08})`;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      ctx!.fillStyle = '#00ff41';
      ctx!.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (drops[i]! < 0) {
          drops[i] = drops[i]! + speed;
          continue;
        }

        const char = CHARS[Math.floor(Math.random() * CHARS.length)]!;
        const x = i * FONT_SIZE;
        const y = drops[i]! * FONT_SIZE;

        // Head character is brighter
        ctx!.fillStyle = '#00ff41';
        ctx!.globalAlpha = 0.8 + Math.random() * 0.2;
        ctx!.fillText(char, x, y);

        // Reset drop when it goes off screen
        if (y > canvas!.height && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
        }

        drops[i] = drops[i]! + speed;
      }

      ctx!.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
    };
  }, [speed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 pointer-events-none z-0', className)}
      style={{ opacity }}
    />
  );
}
