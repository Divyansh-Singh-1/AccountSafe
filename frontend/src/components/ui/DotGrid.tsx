import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  glowRadius?: number;
  className?: string;
}

export const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 1.5,
  gap = 24,
  glowRadius = 120,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Themes configuration
      const isDark = theme === 'dark';
      const baseDotColor = isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(203, 213, 225, 0.45)'; // slates
      const activeGlowColor = isDark ? 'rgba(59, 130, 246, ' : 'rgba(79, 70, 229, '; // Blue vs Indigo

      const cols = Math.floor(width / gap) + 1;
      const rows = Math.floor(height / gap) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * gap;
          const y = j * gap;

          const dx = mouseRef.current.x - x;
          const dy = mouseRef.current.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          ctx.beginPath();

          if (distance < glowRadius) {
            // Proximity glow
            const factor = 1 - distance / glowRadius;
            const size = dotSize + factor * 2;
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `${activeGlowColor}${0.2 + factor * 0.65})`;
          } else {
            // Normal dot
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = baseDotColor;
          }

          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, dotSize, gap, glowRadius]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none z-0 ${className}`}
      style={{ mixBlendMode: 'normal' }}
    />
  );
};

export default DotGrid;
