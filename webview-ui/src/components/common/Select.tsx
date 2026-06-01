import React from 'react';
import { cn } from '../../utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs text-vscode-fg opacity-80">{label}</label>
      )}
      <select
        className={cn(
          'w-full bg-vscode-dropdown-bg text-vscode-dropdown-fg border border-vscode-dropdown-border rounded px-2 py-1.5 text-sm',
          'focus:outline-none focus:border-vscode-focus-border',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
