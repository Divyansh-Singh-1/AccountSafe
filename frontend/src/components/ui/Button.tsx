import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Button Variants - Shadcn/UI inspired design system
export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  external?: boolean;
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

// Variant styles mapping - Sleek Cybernetic theme
const variantStyles: Record<ButtonVariant, string> = {
  default: `
    bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-700
    hover:from-indigo-500 hover:via-cyan-500 hover:to-indigo-600
    text-white font-semibold tracking-wide
    shadow-[0_4px_16px_rgba(6,182,212,0.3)]
    hover:shadow-[0_0_25px_rgba(6,182,212,0.55)]
    focus-visible:ring-cyan-500/50
    dark:from-indigo-500 dark:via-cyan-500 dark:to-indigo-600
    dark:hover:from-indigo-400 dark:hover:via-cyan-400 dark:hover:to-indigo-500
  `,
  secondary: `
    bg-slate-100 dark:bg-zinc-900/80
    text-slate-900 dark:text-zinc-200
    border border-slate-200 dark:border-zinc-800
    hover:bg-slate-200/80 dark:hover:bg-zinc-800/80
    hover:border-slate-300 dark:hover:border-zinc-700
    focus-visible:ring-zinc-500/50
  `,
  outline: `
    border-2 border-indigo-600/35 dark:border-cyan-500/35 bg-transparent 
    text-indigo-600 dark:text-cyan-400 font-semibold
    hover:bg-indigo-600/10 dark:hover:bg-cyan-500/10
    hover:border-indigo-650 dark:hover:border-cyan-400
  `,
  ghost: `
    text-slate-700 dark:text-zinc-400
    hover:bg-slate-100 dark:hover:bg-zinc-800/60
    hover:text-slate-950 dark:hover:text-zinc-200
  `,
  destructive: `
    bg-gradient-to-r from-red-650 to-rose-650 text-white font-medium
    shadow-[0_4px_15px_-2px_rgba(239,68,68,0.4)]
    hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]
  `,
  link: `
    text-indigo-600 hover:text-indigo-500 dark:text-cyan-400 dark:hover:text-cyan-300 underline-offset-4 hover:underline
  `,
};

// Size styles mapping
const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 py-1.5 text-xs rounded-md',
  lg: 'h-12 px-6 py-3 text-base',
  icon: 'h-10 w-10 p-0',
};

// Base button styles
const baseStyles = `
  inline-flex items-center justify-center gap-2
  rounded-xl font-medium
  transition-all duration-200 ease-in-out
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:pointer-events-none disabled:opacity-50
`;

// Loading spinner component
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    className={`animate-spin ${className}`} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Main Button Component
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'default', 
    size = 'default', 
    isLoading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const localRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, show: false });

    // Sync refs
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(localRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = localRef.current;
      }
    }, [ref]);

    // Handle magnetic pull and spotlight effect
    useEffect(() => {
      const el = localRef.current;
      if (!el || disabled || isLoading) return;

      // Disables on mobile pointer coarse
      if (window.matchMedia('(pointer: coarse)').matches) {
        return;
      }

      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const elX = rect.left + rect.width / 2;
        const elY = rect.top + rect.height / 2;
        
        const distanceX = e.clientX - elX;
        const distanceY = e.clientY - elY;
        const distance = Math.hypot(distanceX, distanceY);

        const pullRange = 55;
        if (distance < pullRange) {
          const power = (pullRange - distance) / pullRange;
          // Apply magnetic offset (16% coefficient)
          setPosition({ x: distanceX * 0.16 * power, y: distanceY * 0.16 * power });
        } else {
          setPosition({ x: 0, y: 0 });
        }

        setSpotlight({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          show: true
        });
      };

      const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
        setSpotlight(prev => ({ ...prev, show: false }));
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [disabled, isLoading]);

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const getSpotlightGradient = () => {
      if (variant === 'default') {
        return `radial-gradient(55px circle at ${spotlight.x}px ${spotlight.y}px, rgba(255, 255, 255, 0.22), transparent)`;
      }
      return `radial-gradient(55px circle at ${spotlight.x}px ${spotlight.y}px, rgba(6, 182, 212, 0.15), transparent)`;
    };

    return (
      <button
        ref={localRef}
        className={combinedClassName}
        disabled={disabled || isLoading}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${spotlight.show ? 1.02 : 1})`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
        }}
        {...props}
      >
        {/* Spotlight overlay */}
        {spotlight.show && !disabled && !isLoading && (
          <span
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-[1]"
            style={{
              background: getSpotlightGradient(),
            }}
          />
        )}
        {isLoading ? (
          <LoadingSpinner className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        ) : leftIcon}
        <span className="relative z-10 flex items-center gap-1.5">{children}</span>
        {!isLoading && rightIcon && <span className="relative z-10">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Button as Link Component (for navigation)
export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ 
    className = '', 
    variant = 'default', 
    size = 'default',
    to,
    external = false,
    leftIcon,
    rightIcon,
    onClick,
    children
  }, ref) => {
    const localRef = useRef<HTMLAnchorElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, show: false });

    // Sync refs
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(localRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = localRef.current;
      }
    }, [ref]);

    // Handle magnetic pull and spotlight effect
    useEffect(() => {
      const el = localRef.current;
      if (!el) return;

      if (window.matchMedia('(pointer: coarse)').matches) {
        return;
      }

      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const elX = rect.left + rect.width / 2;
        const elY = rect.top + rect.height / 2;
        
        const distanceX = e.clientX - elX;
        const distanceY = e.clientY - elY;
        const distance = Math.hypot(distanceX, distanceY);

        const pullRange = 55;
        if (distance < pullRange) {
          const power = (pullRange - distance) / pullRange;
          setPosition({ x: distanceX * 0.16 * power, y: distanceY * 0.16 * power });
        } else {
          setPosition({ x: 0, y: 0 });
        }

        setSpotlight({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          show: true
        });
      };

      const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
        setSpotlight(prev => ({ ...prev, show: false }));
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, []);

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const getSpotlightGradient = () => {
      if (variant === 'default') {
        return `radial-gradient(55px circle at ${spotlight.x}px ${spotlight.y}px, rgba(255, 255, 255, 0.22), transparent)`;
      }
      return `radial-gradient(55px circle at ${spotlight.x}px ${spotlight.y}px, rgba(6, 182, 212, 0.15), transparent)`;
    };

    const styleProps = {
      transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${spotlight.show ? 1.02 : 1})`,
      position: 'relative' as const,
      overflow: 'hidden' as const,
      transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
    };

    const innerContent = (
      <>
        {spotlight.show && (
          <span
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-[1]"
            style={{
              background: getSpotlightGradient(),
            }}
          />
        )}
        {leftIcon}
        <span className="relative z-10 flex items-center gap-1.5">{children}</span>
        {rightIcon}
      </>
    );

    if (external) {
      return (
        <a
          ref={localRef}
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          className={combinedClassName}
          style={styleProps}
          onClick={onClick}
        >
          {innerContent}
        </a>
      );
    }

    return (
      <Link
        ref={localRef}
        to={to}
        className={combinedClassName}
        style={styleProps}
        onClick={onClick}
      >
        {innerContent}
      </Link>
    );
  }
);

ButtonLink.displayName = 'ButtonLink';

// Icon Button sizes
type IconButtonSize = 'sm' | 'default' | 'lg';
const iconButtonSizes: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 p-0 rounded-lg',
  default: 'h-10 w-10 p-0 rounded-xl',
  lg: 'h-12 w-12 p-0 rounded-2xl',
};

// Icon Button Component (for icon-only buttons)
interface IconButtonProps extends Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon'> {
  size?: IconButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', variant = 'ghost', size = 'default', children, disabled, ...props }, ref) => {
    const localRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, show: false });

    // Sync refs
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(localRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = localRef.current;
      }
    }, [ref]);

    // Handle magnetic pull and spotlight effect
    useEffect(() => {
      const el = localRef.current;
      if (!el || disabled) return;

      if (window.matchMedia('(pointer: coarse)').matches) {
        return;
      }

      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const elX = rect.left + rect.width / 2;
        const elY = rect.top + rect.height / 2;
        
        const distanceX = e.clientX - elX;
        const distanceY = e.clientY - elY;
        const distance = Math.hypot(distanceX, distanceY);

        const pullRange = 45;
        if (distance < pullRange) {
          const power = (pullRange - distance) / pullRange;
          setPosition({ x: distanceX * 0.2 * power, y: distanceY * 0.2 * power });
        } else {
          setPosition({ x: 0, y: 0 });
        }

        setSpotlight({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          show: true
        });
      };

      const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
        setSpotlight(prev => ({ ...prev, show: false }));
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [disabled]);

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${iconButtonSizes[size]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const getSpotlightGradient = () => {
      return `radial-gradient(40px circle at ${spotlight.x}px ${spotlight.y}px, rgba(6, 182, 212, 0.18), transparent)`;
    };

    return (
      <button
        ref={localRef}
        className={combinedClassName}
        disabled={disabled}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${spotlight.show ? 1.05 : 1})`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
        }}
        {...props}
      >
        {spotlight.show && !disabled && (
          <span
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-[1]"
            style={{
              background: getSpotlightGradient(),
            }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
