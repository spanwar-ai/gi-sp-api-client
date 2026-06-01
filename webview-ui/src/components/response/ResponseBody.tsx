import React, { useMemo } from 'react';
import { JsonViewer } from '../common/JsonViewer';
import { XmlViewer } from '../common/XmlViewer';
import { CopyButton } from '../common/CopyButton';
import { detectContentType, formatJson, formatXml } from '../../utils/formatters';

interface ResponseBodyProps {
  body: string;
}

export function ResponseBody({ body }: ResponseBodyProps) {
  const contentType = useMemo(() => detectContentType(body), [body]);

  const formatted = useMemo(() => {
    if (contentType === 'json') return formatJson(body);
    if (contentType === 'xml') return formatXml(body);
    return body;
  }, [body, contentType]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b border-vscode-border">
        <span className="text-xs text-vscode-fg opacity-60 uppercase">{contentType}</span>
        <CopyButton text={formatted} />
      </div>
      <div className="flex-1 overflow-auto p-3">
        {contentType === 'json' && <JsonViewer data={body} />}
        {contentType === 'xml' && <XmlViewer data={body} />}
        {contentType === 'text' && (
          <pre className="font-vscode-editor text-xs whitespace-pre-wrap">{body}</pre>
        )}
      </div>
    </div>
  );
}
