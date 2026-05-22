import React from 'react';
import { cn } from '../../utils/cn';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  className,
  size = 140,
  duration = 8,
  colorFrom = '#3b82f6', // blue-500
  colorTo = '#10b981', // green success
  borderWidth = 1.5,
}) => {
  return (
    <div
      style={{
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--border-width': `${borderWidth}px`,
      } as React.CSSProperties}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] z-10",
        // Mask to only show the border outline
        "[mask-image:linear-gradient(white,white),linear-gradient(white,white)] [mask-clip:padding-box,border-box] [mask-composite:intersect]",
        // Border thickness overlay
        "border-[length:var(--border-width)] border-transparent",
        // Orbiter beam style using modern offset-path
        "after:absolute after:aspect-square after:w-[var(--size)] after:animate-border-beam",
        "after:bg-[linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
        "after:[offset-anchor:50%_50%] after:[offset-path:rect(0_100%_100%_0_round_12px)]",
        className
      )}
    />
  );
};

export default BorderBeam;
