import React from 'react';
import { UrlBar } from './UrlBar';
import { RequestTabs } from './RequestTabs';

export function RequestPanel() {
  return (
    <div className="flex flex-col h-full">
      <UrlBar />
      <RequestTabs />
    </div>
  );
}
