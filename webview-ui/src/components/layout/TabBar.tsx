import React from 'react';
import { useRequestStore } from '../../store/requestStore';
import { cn } from '../../utils/cn';
import { getMethodClass } from '../../utils/formatters';

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, removeTab, addTab } = useRequestStore();

  return (
    <div className="flex items-center bg-vscode-tab-inactive-bg border-b border-vscode-border overflow-x-auto">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r border-vscode-border min-w-0 max-w-[200px] group',
            activeTabId === tab.id || (!activeTabId && openTabs[0]?.id === tab.id)
              ? 'bg-vscode-tab-active-bg text-vscode-tab-active-fg border-b-2 border-b-vscode-focus-border'
              : 'text-vscode-tab-inactive-fg hover:bg-vscode-list-hover'
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className={cn('font-bold text-[10px]', getMethodClass(tab.method))}>
            {tab.method}
          </span>
          <span className="truncate">{tab.name || tab.url || 'New Request'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
            className="ml-auto text-vscode-fg opacity-0 group-hover:opacity-50 hover:!opacity-100 text-sm leading-none flex-shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        onClick={() => addTab()}
        className="px-3 py-1.5 text-vscode-fg opacity-50 hover:opacity-100 text-sm flex-shrink-0"
        title="New tab"
      >
        +
      </button>
    </div>
  );
}
