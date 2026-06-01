import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useRequestStore } from '../../store/requestStore';
import { Tabs } from '../common/Tabs';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import type { RequestTab } from '../../types';

export function RequestTabs() {
  const { requestTab, setRequestTab } = useUIStore();
  const request = useRequestStore((s) => s.getActiveRequest());

  const tabs = [
    { id: 'params', label: 'Params', count: request?.params.filter((p) => p.enabled).length || 0 },
    { id: 'headers', label: 'Headers', count: request?.headers.filter((h) => h.enabled).length || 0 },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Tabs
        tabs={tabs}
        activeTab={requestTab}
        onTabChange={(id) => setRequestTab(id as RequestTab)}
      />
      <div className="flex-1 overflow-y-auto">
        {requestTab === 'params' && <ParamsEditor />}
        {requestTab === 'headers' && <HeadersEditor />}
        {requestTab === 'body' && <BodyEditor />}
        {requestTab === 'auth' && <AuthEditor />}
      </div>
    </div>
  );
}
