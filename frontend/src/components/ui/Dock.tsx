import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface DockProps {
  className?: string;
  children: React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({ className, children }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
        className={cn(
          "pointer-events-auto flex items-end gap-3 px-4 py-2.5 rounded-2xl border",
          "backdrop-blur-lg backdrop-saturate-150 transition-all duration-300",
          // Dark Mode: Deep gray transparency
          "dark:bg-slate-900/60 dark:border-slate-800 dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
          // Light Mode: White transparency
          "bg-white/60 border-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.06)]",
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
};

interface DockIconProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  tooltip?: string;
  className?: string;
}

export const DockIcon: React.FC<DockIconProps> = ({
  children,
  onClick,
  active = false,
  tooltip,
  className,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.28, y: -8 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200",
        // Active vs Normal styling
        active
          ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] dark:bg-indigo-500 dark:shadow-[0_4px_16px_rgba(59,130,246,0.4)]"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80",
        className
      )}
    >
      {/* Icon content */}
      <span className="w-5 h-5 flex items-center justify-center">
        {children}
      </span>

      {/* Active Indicator dot */}
      {active && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />
      )}

      {/* Hover Tooltip banner */}
      {tooltip && (
        <div
          className={cn(
            "absolute -top-10 opacity-0 scale-95 pointer-events-none select-none transition-all duration-150 ease-out",
            "group-hover:opacity-100 group-hover:scale-100 px-2 py-1 rounded-md text-xxs font-medium tracking-wide shadow-sm",
            "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border dark:border-slate-100"
          )}
        >
          {tooltip}
        </div>
      )}
    </motion.button>
  );
};
