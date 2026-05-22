import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '../../utils/cn';

interface NumberTickerProps {
  value: number;
  duration?: number; // duration in seconds
  className?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  duration = 1.8,
  className,
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    // Reset to 0 and trigger spring fade-in count animation
    count.set(0);
    const controls = animate(count, value, {
      duration: duration,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [value, duration, count]);

  // Sync motion value updates safely with local React state to avoid Hydration mismatches
  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      setDisplayValue(v);
    });
    return () => unsubscribe();
  }, [rounded]);

  return (
    <motion.span
      className={cn(
        "font-bold font-mono tracking-tighter text-3xl",
        "text-slate-900 dark:text-white",
        className
      )}
    >
      {displayValue}
    </motion.span>
  );
};

export default NumberTicker;
