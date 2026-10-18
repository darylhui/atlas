import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

const useConfetti = create<{ n: number }>(() => ({ n: 0 }));

/** Fire a short celebratory burst (respects reduced-motion). */
export function celebrate() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  useConfetti.setState((s) => ({ n: s.n + 1 }));
}

const COLORS = ['#aad600', '#c2f400', '#5c9cec', '#e0703f', '#2fae82', '#a1d0c6', '#f2b530'];

export function ConfettiHost() {
  const n = useConfetti((s) => s.n);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!n || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - frame / 140);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      if (frame < 140) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  return createPortal(<canvas ref={ref} className="confetti" style={{ width: '100vw', height: '100vh' }} aria-hidden />, document.body);
}
