import React from 'react';
import { cn } from '../../utils/cn';

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center min-h-screen overflow-hidden transition-colors duration-300",
        // Dark Mode: Deep navy slate
        // Light Mode: Clean high-contrast slate-50
        "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50",
        className
      )}
      {...props}
    >
      {/* Aurora Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div
          className={cn(
            "absolute -inset-[10px] opacity-50 dark:opacity-40 filter blur-[80px]",
            // Liquid Mesh Colors
            // Dark mode: Deep teal, glowing blue, deep purple
            // Light mode: Soft sky blue, pastel lavender, light pink
            "bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-blue-300 via-indigo-100 to-purple-200",
            "dark:bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] dark:from-indigo-950 dark:via-slate-900 dark:to-teal-950",
            "transition-all duration-300"
          )}
        >
          {/* Animated Blobs with Hardware Acceleration */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-200 dark:bg-indigo-900/30 blur-[60px] top-[-10%] left-[-10%] animate-blob-morph" />
          <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-200 dark:bg-purple-900/20 blur-[80px] bottom-[-20%] right-[-10%] animate-blob-morph-delayed" />
          <div className="absolute w-[450px] h-[450px] rounded-full bg-pink-100 dark:bg-teal-900/30 blur-[70px] top-[30%] right-[20%] animate-blob-morph-delayed-2" />
        </div>

        {/* Diagonal Light Sweep Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Vignette Spotlight Radial Gradient */}
        {showRadialGradient && (
          <div className="absolute inset-0 bg-slate-50/20 dark:bg-slate-950/40 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        )}
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;
