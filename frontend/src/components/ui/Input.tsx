import React, { useState } from 'react';
import BorderBeam from './BorderBeam';

// Input variants
export type InputVariant = 'default' | 'filled' | 'ghost';
export type InputSize = 'default' | 'sm' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  inputSize?: InputSize;
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

// Variant styles mapping - Glassmorphic Cyber theme
const variantStyles: Record<InputVariant, string> = {
  default: `
    border border-zinc-200 dark:border-zinc-800/80
    bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md
    text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
    focus:border-transparent focus:ring-0
  `,
  filled: `
    border border-transparent bg-zinc-100 dark:bg-zinc-900/80
    focus:border-transparent focus:ring-0
  `,
  ghost: `
    border border-transparent bg-transparent
    hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50
    focus:border-transparent focus:ring-0
  `,
};

// Size styles mapping
const sizeStyles: Record<InputSize, string> = {
  default: 'h-10 px-3 py-2 text-sm',
  sm: 'h-8 px-2.5 py-1.5 text-xs',
  lg: 'h-12 px-4 py-3 text-base',
};

// Icon size mapping
const iconSizeStyles: Record<InputSize, string> = {
  default: 'w-4 h-4',
  sm: 'w-3.5 h-3.5',
  lg: 'w-5 h-5',
};

// Base input styles
const baseStyles = `
  flex w-full rounded-xl
  transition-all duration-200 ease-in-out
  focus:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;

// Label styles
const labelStyles = `
  block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5
`;

// Error styles
const errorStyles = `
  border-red-500/50 focus:border-red-500/50
  dark:border-red-500/40 dark:focus:border-red-500/40
`;

// Hint/Error text styles
const hintStyles = `
  mt-1.5 text-xs text-zinc-500 dark:text-zinc-400
`;

const errorTextStyles = `
  mt-1.5 text-xs text-red-500 dark:text-red-400 font-medium
`;

// Input Component
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '', 
    variant = 'default', 
    inputSize = 'default',
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    rightElement,
    fullWidth = true,
    type = 'text',
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!error;
    
    const inputClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${hasError ? errorStyles : ''}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || rightElement ? 'pr-10' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const wrapperClassName = fullWidth ? 'w-full' : '';

    return (
      <div className={wrapperClassName}>
        {label && (
          <label className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative rounded-xl overflow-hidden group">
          {leftIcon && (
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-cyan-500 transition-colors ${iconSizeStyles[inputSize]}`}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={inputClassName}
            onFocus={(e) => {
              setIsFocused(true);
              if (onFocus) onFocus(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              if (onBlur) onBlur(e);
            }}
            {...props}
          />
          {(rightIcon || rightElement) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-cyan-500 transition-colors">
              {rightElement || (
                <span className={iconSizeStyles[inputSize]}>
                  {rightIcon}
                </span>
              )}
            </div>
          )}
          {isFocused && !props.disabled && (
            <BorderBeam 
              size={60} 
              duration={4} 
              colorFrom={hasError ? '#ef4444' : '#06b6d4'} // Cyan highlight or Red error highlight
              colorTo={hasError ? '#f43f5e' : '#6366f1'}   // Indigo highlight or Rose error highlight
              borderWidth={1.5}
            />
          )}
        </div>
        {hint && !hasError && (
          <p className={hintStyles}>{hint}</p>
        )}
        {hasError && (
          <p className={errorTextStyles}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className = '', 
    variant = 'default',
    label,
    error,
    hint,
    fullWidth = true,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!error;
    
    const textareaClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      min-h-[80px] px-3 py-2 text-sm resize-none
      ${hasError ? errorStyles : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const wrapperClassName = fullWidth ? 'w-full' : '';

    return (
      <div className={wrapperClassName}>
        {label && (
          <label className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative rounded-xl overflow-hidden group">
          <textarea
            ref={ref}
            className={textareaClassName}
            onFocus={(e) => {
              setIsFocused(true);
              if (onFocus) onFocus(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              if (onBlur) onBlur(e);
            }}
            {...props}
          />
          {isFocused && !props.disabled && (
            <BorderBeam 
              size={90} 
              duration={5} 
              colorFrom={hasError ? '#ef4444' : '#06b6d4'} 
              colorTo={hasError ? '#f43f5e' : '#6366f1'} 
              borderWidth={1.5}
            />
          )}
        </div>
        {hint && !hasError && (
          <p className={hintStyles}>{hint}</p>
        )}
        {hasError && (
          <p className={errorTextStyles}>{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Search Input Component
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, ...props }, ref) => {
    const SearchIcon = (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );

    const ClearButton = value && onClear ? (
      <button
        type="button"
        onClick={onClear}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 dark:text-zinc-500"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    ) : null;

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={SearchIcon}
        rightElement={ClearButton}
        value={value}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default Input;
