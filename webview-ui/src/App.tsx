import React, { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { ActivationGate } from './components/ActivationGate';
import { useVsCodeMessage } from './hooks/useVsCodeMessage';
import { useUIStore } from './store/uiStore';
import { messageService } from './services/messageService';
import { Spinner } from './components/common/Spinner';

export function App() {
  useVsCodeMessage();
  const isActivated = useUIStore((s) => s.isActivated);

  useEffect(() => {
    messageService.sendReady();
  }, []);

  const isSidebar = document.getElementById('root')?.dataset.view === 'sidebar';

  if (isSidebar) {
    return <SidebarView />;
  }

  if (isActivated === null) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-vscode-bg">
        <Spinner />
      </div>
    );
  }

  if (!isActivated) {
    return <ActivationGate />;
  }

  return <MainLayout />;
}

function SidebarView() {
  return (
    <div className="h-screen w-full bg-vscode-sidebar-bg text-vscode-fg overflow-y-auto p-2">
      <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider opacity-70">
        GI-SP REST & SOAP Client
      </h3>
      <p className="text-xs opacity-60">
        Use the main panel for full API testing.
      </p>
      <button
        onClick={() => messageService.getCollections()}
        className="mt-3 w-full bg-vscode-button-bg text-vscode-button-fg rounded px-3 py-1.5 text-xs hover:opacity-90"
      >
        Open GI-SP REST & SOAP Client
      </button>
    </div>
  );
}
