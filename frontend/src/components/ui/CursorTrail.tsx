import React, { useEffect, useRef } from 'react';

export const CursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Disable on mobile/touch screens
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width / 2, y: height / 2 };
    const history: { x: number; y: number }[] = [];
    const maxHistory = 24;

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Dynamic color selection based on dark mode class
    const getColors = (isDark: boolean) => {
      if (isDark) {
        return {
          start: 'rgba(6, 182, 212, 0.45)', // cyan
          end: 'rgba(99, 102, 241, 0.05)',  // indigo
          glow: 'rgba(6, 182, 212, 0.3)'
        };
      } else {
        return {
          start: 'rgba(168, 85, 247, 0.25)', // purple
          end: 'rgba(59, 130, 246, 0.02)',   // blue
          glow: 'rgba(168, 85, 247, 0.15)'
        };
      }
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      decay: number;
      color: string;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.radius = Math.random() * 2 + 1;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
        this.color = color;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.globalAlpha = this.alpha;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
        c.restore();
      }
    }

    const particles: Particle[] = [];

    // Physics render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      const colors = getColors(isDark);

      // Interpolate history towards mouse position for smooth trailing spring physics
      if (history.length === 0) {
        for (let i = 0; i < maxHistory; i++) {
          history.push({ x: mouse.x, y: mouse.y });
        }
      }

      // Physics spring updates
      history[0].x += (mouse.x - history[0].x) * 0.35;
      history[0].y += (mouse.y - history[0].y) * 0.35;

      for (let i = 1; i < history.length; i++) {
        history[i].x += (history[i - 1].x - history[i].x) * 0.35;
        history[i].y += (history[i - 1].y - history[i].y) * 0.35;
      }

      if (history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(history[0].x, history[0].y);

        // Smooth curve calculation using quadratic curves
        for (let i = 0; i < history.length - 1; i++) {
          const xc = (history[i].x + history[i + 1].x) / 2;
          const yc = (history[i].y + history[i + 1].y) / 2;
          ctx.quadraticCurveTo(history[i].x, history[i].y, xc, yc);
        }

        ctx.strokeStyle = colors.start;
        
        // Draw trailing path with gradient
        const gradient = ctx.createLinearGradient(
          history[history.length - 1].x,
          history[history.length - 1].y,
          history[0].x,
          history[0].y
        );
        gradient.addColorStop(0, colors.end);
        gradient.addColorStop(1, colors.start);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Apply glow effect
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.shadowColor = colors.glow;
        
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw small floating particles at cursor tip for cyber feel
        if (Math.random() > 0.5) {
          particles.push(new Particle(mouse.x, mouse.y, colors.start));
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          p.draw(ctx);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
    />
  );
};

export default CursorTrail;
