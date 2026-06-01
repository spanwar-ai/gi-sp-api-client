import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-vscode-focus-border disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-vscode-button-bg text-vscode-button-fg hover:opacity-90',
    secondary: 'bg-vscode-button-secondary-bg text-vscode-button-secondary-fg hover:opacity-90',
    ghost: 'bg-transparent text-vscode-fg hover:bg-vscode-list-hover',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
