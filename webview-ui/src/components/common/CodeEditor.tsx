import React from 'react';
import { cn } from '../../utils/cn';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'json' | 'xml' | 'text';
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
  minHeight = '200px',
}: CodeEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
      className={cn(
        'w-full bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border rounded',
        'px-3 py-2 font-vscode-editor text-vscode-editor resize-y',
        'focus:outline-none focus:border-vscode-focus-border',
        'placeholder:text-vscode-fg placeholder:opacity-30',
        readOnly && 'cursor-default',
        className
      )}
      style={{ minHeight, tabSize: 2 }}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const target = e.target as HTMLTextAreaElement;
          const start = target.selectionStart;
          const end = target.selectionEnd;
          const newValue = value.substring(0, start) + '  ' + value.substring(end);
          onChange(newValue);
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = start + 2;
          });
        }
      }}
    />
  );
}
