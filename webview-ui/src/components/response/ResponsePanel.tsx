import React from 'react';
import { useRequestStore } from '../../store/requestStore';
import { useResponseStore } from '../../store/responseStore';
import { useUIStore } from '../../store/uiStore';
import { messageService } from '../../services/messageService';
import { Tabs } from '../common/Tabs';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { CopyButton } from '../common/CopyButton';
import { Button } from '../common/Button';
import { ResponseMeta } from './ResponseMeta';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import type { ResponseTab } from '../../types';

export function ResponsePanel() {
  const request = useRequestStore((s) => s.getActiveRequest());
  const isLoading = useRequestStore((s) => s.isLoading);
  const response = useResponseStore((s) => request ? s.responses[request.id] : undefined);
  const curl = useResponseStore((s) => s.curl);
  const alCode = useResponseStore((s) => s.alCode);
  const { responseTab, setResponseTab } = useUIStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Spinner />
        <span className="text-sm text-vscode-fg opacity-70">Sending request...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', count: response ? Object.keys(response.headers).length : undefined },
    { id: 'curl', label: 'cURL' },
    { id: 'alcode', label: 'AL Code' },
  ];

  const handleGenerateAlCode = () => {
    if (request) messageService.generateAlCode(request);
  };

  const handleGenerateCurl = () => {
    if (request) messageService.generateCurl(request);
  };

  return (
    <div className="flex flex-col h-full">
      {response && <ResponseMeta response={response} />}
      <Tabs
        tabs={tabs}
        activeTab={responseTab}
        onTabChange={(id) => setResponseTab(id as ResponseTab)}
      />
      <div className="flex-1 overflow-auto">
        {responseTab === 'body' && (
          response
            ? <ResponseBody body={response.body} />
            : <EmptyState title="No Response" description="Send a request to see the response here" />
        )}

        {responseTab === 'headers' && (
          response
            ? <ResponseHeaders headers={response.headers} />
            : <EmptyState title="No Response" description="Send a request to see the headers here" />
        )}

        {responseTab === 'curl' && (
          <div className="p-3">
            {curl ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-end">
                  <CopyButton text={curl} />
                </div>
                <pre className="font-vscode-editor text-xs bg-vscode-input-bg p-3 rounded border border-vscode-input-border whitespace-pre-wrap">
                  {curl}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-sm text-vscode-fg opacity-50">
                  Generate the cURL command for this request
                </p>
                <Button onClick={handleGenerateCurl} disabled={!request?.url}>
                  Generate cURL
                </Button>
              </div>
            )}
          </div>
        )}

        {responseTab === 'alcode' && (
          <div className="p-3">
            {alCode ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-end">
                  <CopyButton text={alCode} />
                </div>
                <pre className="font-vscode-editor text-xs bg-vscode-input-bg p-3 rounded border border-vscode-input-border whitespace-pre-wrap">
                  {alCode}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-sm text-vscode-fg opacity-50">
                  Generate an AL procedure from this request configuration
                </p>
                <Button onClick={handleGenerateAlCode} disabled={!request?.url}>
                  Generate AL Code
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
