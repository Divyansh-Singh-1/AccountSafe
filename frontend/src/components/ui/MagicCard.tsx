import React, { useRef, useState, forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  spotlightColor?: string;
  className?: string;
}

export const MagicCard = forwardRef<HTMLDivElement, MagicCardProps>(({
  children,
  spotlightColor,
  className,
  ...props
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const { theme } = useTheme();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  const isDark = theme === 'dark';
  // Fallback spotlight styles depending on dark / light modes
  const defaultSpotlight = isDark
    ? 'rgba(59, 130, 246, 0.08)' // Slate Blue highlight
    : 'rgba(99, 102, 241, 0.06)'; // Indigo-50 highlights

  const setRefs = (node: HTMLDivElement | null) => {
    // Set internal ref for spotlight calculations
    (containerRef as any).current = node;
    
    // Forward the ref to the parent hook
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as any).current = node;
    }
  };

  return (
    <div
      ref={setRefs}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-300",
        // Dark Mode: Deep glassmorphic surface
        "dark:bg-slate-900/60 dark:border-slate-800/80 dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        // Light Mode: White card
        "bg-white/80 border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)]",
        className
      )}
      {...props}
    >
      {/* Background Spotlight Layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 select-none z-0"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, ${
            spotlightColor || defaultSpotlight
          }, transparent 80%)`,
        }}
      />

      {/* Border Spotlight Glow Layer */}
      <div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 z-1"
        style={{
          opacity: opacity * 0.5,
          background: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, ${
            isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(79, 70, 229, 0.15)'
          }, transparent)`,
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});

export default MagicCard;
