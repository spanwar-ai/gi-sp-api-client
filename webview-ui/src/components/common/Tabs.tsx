import React from 'react';
import { cn } from '../../utils/cn';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-vscode-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
            activeTab === tab.id
              ? 'text-vscode-fg border-vscode-focus-border'
              : 'text-vscode-fg opacity-60 border-transparent hover:opacity-80'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
