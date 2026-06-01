import React, { useState, useMemo } from 'react';
import { useHistoryStore } from '../../store/historyStore';
import { useRequestStore } from '../../store/requestStore';
import { messageService } from '../../services/messageService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { cn } from '../../utils/cn';
import { getMethodClass, formatTime } from '../../utils/formatters';

function getStatusVariant(code: number): 'success' | 'warning' | 'error' {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'warning';
  return 'error';
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryList() {
  const { entries } = useHistoryStore();
  const { loadRequest } = useRequestStore();
  const [filter, setFilter] = useState('');

  const sortedAndFiltered = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (!filter.trim()) return sorted;

    const query = filter.toLowerCase().trim();
    return sorted.filter((entry) => {
      const method = entry.request.method.toLowerCase();
      const url = entry.request.url.toLowerCase();
      const status = String(entry.response.statusCode);
      return method.includes(query) || url.includes(query) || status.includes(query);
    });
  }, [entries, filter]);

  const handleLoadRequest = (entry: typeof entries[0]) => {
    loadRequest({ ...entry.request });
  };

  const handleDeleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    messageService.deleteHistoryEntry(id);
  };

  const handleClearAll = () => {
    messageService.clearHistory();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-panel-border">
        <span className="text-xs font-medium text-vscode-fg uppercase tracking-wide">
          History
        </span>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs">
            Clear All
          </Button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="px-3 py-2 border-b border-vscode-panel-border">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by method, URL, or status..."
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <EmptyState
            title="No history yet"
            description="Send a request to see it appear here."
          />
        ) : sortedAndFiltered.length === 0 ? (
          <EmptyState
            title="No matching entries"
            description="Try a different search term."
            action={
              <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
                Clear Filter
              </Button>
            }
          />
        ) : (
          sortedAndFiltered.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-vscode-panel-border',
                'hover:bg-vscode-list-hover transition-colors group'
              )}
              onClick={() => handleLoadRequest(entry)}
              title={`${entry.request.method} ${entry.request.url}`}
            >
              <span
                className={cn(
                  'text-xs font-semibold w-14 flex-shrink-0',
                  getMethodClass(entry.request.method)
                )}
              >
                {entry.request.method}
              </span>

              <span className="text-xs text-vscode-fg truncate flex-1 min-w-0 opacity-80">
                {entry.request.url}
              </span>

              <Badge variant={getStatusVariant(entry.response.statusCode)}>
                {entry.response.statusCode}
              </Badge>

              <span className="text-[10px] text-vscode-fg opacity-50 flex-shrink-0 w-16 text-right">
                {formatTime(entry.response.time)}
              </span>

              <span className="text-[10px] text-vscode-fg opacity-40 flex-shrink-0 w-14 text-right">
                {formatTimestamp(entry.timestamp)}
              </span>

              <button
                onClick={(e) => handleDeleteEntry(e, entry.id)}
                className={cn(
                  'px-1 text-vscode-fg opacity-0 group-hover:opacity-50 hover:!opacity-100',
                  'text-sm flex-shrink-0 transition-opacity'
                )}
                title="Delete entry"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
