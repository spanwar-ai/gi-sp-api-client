import React from 'react';
import type { ApiResponse } from '../../types';
import { Badge } from '../common/Badge';
import { formatBytes, formatTime, getStatusClass } from '../../utils/formatters';

interface ResponseMetaProps {
  response: ApiResponse;
}

export function ResponseMeta({ response }: ResponseMetaProps) {
  const statusVariant = response.statusCode >= 200 && response.statusCode < 300
    ? 'success'
    : response.statusCode >= 400
    ? 'error'
    : 'warning';

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-vscode-border">
      <Badge variant={statusVariant}>
        <span className={getStatusClass(response.statusCode)}>
          {response.statusCode} {response.statusText}
        </span>
      </Badge>
      <Badge variant="info">{formatTime(response.time)}</Badge>
      <Badge variant="default">{formatBytes(response.bodySize)}</Badge>
    </div>
  );
}
