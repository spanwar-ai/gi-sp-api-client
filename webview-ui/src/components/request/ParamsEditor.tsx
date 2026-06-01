import React from 'react';
import { useRequestStore } from '../../store/requestStore';
import { KeyValueTable } from './KeyValueTable';

export function ParamsEditor() {
  const { getActiveRequest, setParams } = useRequestStore();
  const request = getActiveRequest();

  if (!request) return null;

  return (
    <div className="p-3">
      <KeyValueTable
        items={request.params}
        onChange={setParams}
        keyPlaceholder="Parameter name"
        valuePlaceholder="Value"
      />
    </div>
  );
}
