import React, { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';

interface JsonViewerProps {
  data: string;
  className?: string;
}

function JsonNode({ name, value, depth }: { name?: string; value: any; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 3);

  if (value === null) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {name && <span className="text-purple-400">{name}: </span>}
        <span className="text-gray-500">null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {name && <span className="text-purple-400">{name}: </span>}
        <span className="text-orange-400">{value.toString()}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {name && <span className="text-purple-400">{name}: </span>}
        <span className="text-green-400">{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {name && <span className="text-purple-400">{name}: </span>}
        <span className="text-yellow-300">"{value}"</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          className="cursor-pointer select-none hover:opacity-80"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs mr-1">{expanded ? '▼' : '▶'}</span>
          {name && <span className="text-purple-400">{name}: </span>}
          <span className="text-vscode-fg opacity-60">[{value.length}]</span>
        </span>
        {expanded && (
          <div>
            {value.map((item, i) => (
              <JsonNode key={i} name={String(i)} value={item} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          className="cursor-pointer select-none hover:opacity-80"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs mr-1">{expanded ? '▼' : '▶'}</span>
          {name && <span className="text-purple-400">{name}: </span>}
          <span className="text-vscode-fg opacity-60">{`{${keys.length}}`}</span>
        </span>
        {expanded && (
          <div>
            {keys.map((key) => (
              <JsonNode key={key} name={key} value={value[key]} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      {name && <span className="text-purple-400">{name}: </span>}
      <span>{String(value)}</span>
    </div>
  );
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (parsed === null) {
    return (
      <pre className={cn('font-vscode-editor text-vscode-editor whitespace-pre-wrap', className)}>
        {data}
      </pre>
    );
  }

  return (
    <div className={cn('font-vscode-editor text-xs leading-5 overflow-auto', className)}>
      <JsonNode value={parsed} depth={0} />
    </div>
  );
}
