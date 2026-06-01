import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-vscode-fg opacity-80">{label}</label>
      )}
      <input
        className={cn(
          'w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border rounded px-2 py-1.5 text-sm',
          'focus:outline-none focus:border-vscode-focus-border',
          'placeholder:text-vscode-fg placeholder:opacity-40',
          className
        )}
        {...props}
      />
    </div>
  );
}
