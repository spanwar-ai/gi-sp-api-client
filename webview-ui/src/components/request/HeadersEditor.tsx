import React from 'react';
import { useRequestStore } from '../../store/requestStore';
import { KeyValueTable } from './KeyValueTable';

export function HeadersEditor() {
  const { getActiveRequest, setHeaders } = useRequestStore();
  const request = getActiveRequest();

  if (!request) return null;

  return (
    <div className="p-3">
      <KeyValueTable
        items={request.headers}
        onChange={setHeaders}
        keyPlaceholder="Header name"
        valuePlaceholder="Value"
      />
    </div>
  );
}
