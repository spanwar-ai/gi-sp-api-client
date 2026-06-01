import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { RequestPanel } from '../request/RequestPanel';
import { ResponsePanel } from '../response/ResponsePanel';

export function MainLayout() {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    notifications,
    removeNotification,
  } = useUIStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-vscode-bg text-vscode-fg">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center border-b border-vscode-border">
          <button
            onClick={toggleSidebar}
            className="px-2 py-1.5 text-vscode-fg opacity-50 hover:opacity-100 text-sm border-r border-vscode-border"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? '>' : '<'}
          </button>
          <div className="flex-1">
            <TabBar />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden border-b border-vscode-border">
            <RequestPanel />
          </div>

          <div className="h-[300px] min-h-[150px] overflow-hidden">
            <ResponsePanel />
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg shadow-lg border text-xs ${
                n.level === 'error'
                  ? 'bg-red-900/90 border-red-700 text-red-100'
                  : n.level === 'warning'
                  ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100'
                  : 'bg-blue-900/90 border-blue-700 text-blue-100'
              }`}
            >
              <span className="flex-1">{n.message}</span>
              <button
                onClick={() => removeNotification(n.id)}
                className="opacity-70 hover:opacity-100 text-sm leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
