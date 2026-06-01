import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { formatXml } from '../../utils/formatters';

interface XmlViewerProps {
  data: string;
  className?: string;
}

export function XmlViewer({ data, className }: XmlViewerProps) {
  const formatted = useMemo(() => formatXml(data), [data]);

  const highlighted = useMemo(() => {
    return formatted.replace(
      /(<\/?)([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)(\/?>)/g,
      (_match, open: string, tag: string, attrs: string, close: string) => {
        const highlightedAttrs = attrs.replace(
          /([\w:-]+)="([^"]*)"/g,
          '<span class="text-yellow-300">$1</span>=<span class="text-green-400">"$2"</span>'
        );
        return `<span class="text-gray-500">${open}</span><span class="text-blue-400">${tag}</span>${highlightedAttrs}<span class="text-gray-500">${close}</span>`;
      }
    );
  }, [formatted]);

  return (
    <pre
      className={cn('font-vscode-editor text-xs leading-5 whitespace-pre-wrap overflow-auto', className)}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
