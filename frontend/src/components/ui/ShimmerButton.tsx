import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ShimmerButtonProps extends HTMLMotionProps<'button'> {
  shimmerColor?: string;
  shimmerSize?: string;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  shimmerColor = '#ffffff',
  shimmerSize = '0.08em',
  duration = 3,
  className,
  children,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center justify-center gap-2 overflow-hidden cursor-pointer",
        "rounded-lg px-6 py-2.5 text-sm font-medium transition-shadow duration-300",
        // Dark theme optimized: deep slate surface
        // Light theme optimized: indigo-600 background
        "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.35)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)]",
        "dark:bg-slate-900 dark:text-indigo-400 dark:border dark:border-slate-800 dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        className
      )}
      {...props}
    >
      {/* Moving Shimmer Track */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] pointer-events-none">
        <div
          style={{
            '--shimmer-color-rgb': shimmerColor === '#ffffff' ? '255,255,255' : '99,102,241',
            '--duration': `${duration}s`,
            animation: 'shimmer-slide var(--duration) ease-in-out infinite',
          } as React.CSSProperties}
          className="absolute inset-[-100%] bg-[linear-gradient(135deg,transparent_45%,rgba(var(--shimmer-color-rgb),0.3)_50%,transparent_55%)] bg-[size:200%_200%]"
        />
      </div>

      {/* Button Content Wrapper */}
      <span className="relative z-10 flex items-center gap-2 transition-transform duration-200 group-hover:scale-[1.01]">
        {children}
      </span>
    </motion.button>
  );
};

export default ShimmerButton;
