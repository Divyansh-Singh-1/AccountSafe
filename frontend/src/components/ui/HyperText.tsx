import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface HyperTextProps {
  text: string;
  duration?: number;
  className?: string;
  triggerOnHover?: boolean;
}

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

export const HyperText: React.FC<HyperTextProps> = ({
  text,
  duration = 800,
  className,
  triggerOnHover = true,
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [isScrambling, setIsScrambling] = useState<boolean>(false);

  const startScramble = () => {
    if (isScrambling) return;
    setIsScrambling(true);

    let iterations = 0;
    const intervalTime = duration / text.length;

    const interval = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iterations) {
              return text[index];
            }
            return alphabets[Math.floor(Math.random() * alphabets.length)];
          })
          .join('');
      });

      if (iterations >= text.length) {
        clearInterval(interval);
        setIsScrambling(false);
      }

      iterations += 1;
    }, intervalTime);
  };

  useEffect(() => {
    startScramble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <h2
      onMouseEnter={() => {
        if (triggerOnHover) startScramble();
      }}
      className={cn(
        "font-bold select-none cursor-default font-mono tracking-tight",
        "text-slate-900 dark:text-white",
        className
      )}
    >
      {displayText}
    </h2>
  );
};

export default HyperText;
