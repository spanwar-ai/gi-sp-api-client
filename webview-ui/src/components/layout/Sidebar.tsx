import React, { useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { messageService } from '../../services/messageService';
import { cn } from '../../utils/cn';
import type { SidebarTab } from '../../types';
import { CollectionList } from '../collections/CollectionList';
import { HistoryList } from '../history/HistoryList';
import { EnvironmentManager } from '../environments/EnvironmentManager';
import { Button } from '../common/Button';

const ALL_TABS: Array<{ id: SidebarTab; label: string; icon: string }> = [
  { id: 'collections', label: 'Collections', icon: 'C' },
  { id: 'history', label: 'History', icon: 'H' },
  { id: 'environments', label: 'Environments', icon: 'E' },
];

export function Sidebar() {
  const { sidebarTab, setSidebarTab, isSidebarCollapsed, userRole } = useUIStore();
  const isAdmin = userRole === 'admin';

  const tabs = useMemo(
    () => (isAdmin ? ALL_TABS : ALL_TABS.filter((t) => t.id === 'collections')),
    [isAdmin]
  );

  useEffect(() => {
    messageService.getCollections();
    if (isAdmin) {
      messageService.getEnvironments();
      messageService.getHistory();
    }
  }, [isAdmin]);

  // If the user role was elevated/demoted while a now-hidden tab was active,
  // force the visible tab back to Collections.
  useEffect(() => {
    if (!tabs.some((t) => t.id === sidebarTab)) {
      setSidebarTab('collections');
    }
  }, [tabs, sidebarTab, setSidebarTab]);

  if (isSidebarCollapsed) {
    return (
      <div className="flex flex-col items-center py-2 bg-vscode-sidebar-bg border-r border-vscode-border w-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSidebarTab(tab.id);
              useUIStore.getState().toggleSidebar();
            }}
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center text-xs font-bold mb-1',
              sidebarTab === tab.id
                ? 'bg-vscode-list-active text-vscode-list-active-fg'
                : 'text-vscode-fg opacity-60 hover:opacity-100 hover:bg-vscode-list-hover'
            )}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-vscode-sidebar-bg border-r border-vscode-border h-full" style={{ width: 280 }}>
      <div className="flex border-b border-vscode-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={cn(
              'flex-1 px-2 py-2 text-[10px] font-medium text-center transition-colors',
              sidebarTab === tab.id
                ? 'text-vscode-fg border-b-2 border-vscode-focus-border'
                : 'text-vscode-fg opacity-50 hover:opacity-80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'collections' && <CollectionList />}
        {isAdmin && sidebarTab === 'history' && <HistoryList />}
        {isAdmin && sidebarTab === 'environments' && <EnvironmentManager />}
      </div>

      {isAdmin && (
        <div className="border-t border-vscode-border p-2 flex flex-col gap-1.5">
          <p className="text-[9px] text-vscode-fg opacity-35 text-center truncate" title="C:\RestApiTestData\GISP-data.json">
            Data: C:\RestApiTestData
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="flex-1 text-[10px]" onClick={() => messageService.importAllData()}>
              Import
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-[10px]" onClick={() => messageService.exportAllData()}>
              Export
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
