import React from 'react';

interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  const entries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="p-3">
      {entries.length === 0 ? (
        <p className="text-xs text-vscode-fg opacity-50">No response headers</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b border-vscode-border">
              <th className="pb-2 font-medium text-vscode-fg opacity-70 pr-4">Header</th>
              <th className="pb-2 font-medium text-vscode-fg opacity-70">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b border-vscode-border border-opacity-30">
                <td className="py-1.5 pr-4 font-medium text-blue-400">{key}</td>
                <td className="py-1.5 text-vscode-fg break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
