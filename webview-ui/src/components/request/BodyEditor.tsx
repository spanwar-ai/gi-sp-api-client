import React from 'react';
import { useRequestStore } from '../../store/requestStore';
import { messageService } from '../../services/messageService';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { CodeEditor } from '../common/CodeEditor';
import { KeyValueTable } from './KeyValueTable';
import type { RequestBodyType } from '../../types';

// NOTE: GraphQL is hidden in Phase 1 (REST + SOAP only). The backend still
// handles `body.type === 'graphql'` for imported Postman collections, so
// re-adding `{ value: 'graphql', label: 'GraphQL' }` in a later phase is
// a one-line change.
const BODY_TYPES: Array<{ value: RequestBodyType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw / XML / SOAP / Text' },
  { value: 'form-urlencoded', label: 'Form URL Encoded' },
  { value: 'form-data', label: 'Form Data (Multipart)' },
  { value: 'binary', label: 'Binary (File)' },
];

const SOAP_ENVELOPE_TEMPLATE =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n' +
  '  <soap:Header>\n' +
  '    <!-- Optional headers (WS-Security, etc.) -->\n' +
  '  </soap:Header>\n' +
  '  <soap:Body>\n' +
  '    <!-- Your SOAP request goes here -->\n' +
  '  </soap:Body>\n' +
  '</soap:Envelope>\n';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BodyEditor() {
  const { getActiveRequest, setBody } = useRequestStore();
  const request = getActiveRequest();

  if (!request) return null;

  const bodyType = request.body.type;

  const handleClearBinary = () => {
    setBody({ ...request.body, content: '', binaryFileName: undefined, binarySize: undefined });
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <Select
        options={BODY_TYPES}
        value={bodyType}
        onChange={(e) =>
          setBody({
            ...request.body,
            type: e.target.value as RequestBodyType,
          })
        }
        className="w-56"
      />

      {bodyType === 'none' && (
        <p className="text-xs text-vscode-fg opacity-50">
          This request does not have a body
        </p>
      )}

      {(bodyType === 'json' || bodyType === 'raw') && (
        <>
          {bodyType === 'raw' && !request.body.content && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setBody({
                    ...request.body,
                    content: SOAP_ENVELOPE_TEMPLATE,
                  })
                }
              >
                Insert SOAP envelope
              </Button>
            </div>
          )}
          <CodeEditor
            value={request.body.content}
            onChange={(content) => setBody({ ...request.body, content })}
            placeholder={
              bodyType === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter body content (XML / SOAP / HTML / plain text)'
            }
          />
        </>
      )}

      {bodyType === 'graphql' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-vscode-fg opacity-70">Query</label>
          <CodeEditor
            value={request.body.graphql?.query || ''}
            onChange={(query) =>
              setBody({
                ...request.body,
                graphql: { ...request.body.graphql, query, variables: request.body.graphql?.variables || '' },
              })
            }
            placeholder={'query {\n  users {\n    id\n    name\n  }\n}'}
            minHeight="120px"
          />
          <label className="text-xs text-vscode-fg opacity-70">Variables (JSON)</label>
          <CodeEditor
            value={request.body.graphql?.variables || ''}
            onChange={(variables) =>
              setBody({
                ...request.body,
                graphql: { query: request.body.graphql?.query || '', variables },
              })
            }
            placeholder={'{\n  "id": 1\n}'}
            minHeight="80px"
          />
        </div>
      )}

      {(bodyType === 'form-urlencoded' || bodyType === 'form-data') && (
        <KeyValueTable
          items={request.body.formData || []}
          onChange={(formData) => setBody({ ...request.body, formData })}
          keyPlaceholder="Field name"
          valuePlaceholder="Value"
        />
      )}

      {bodyType === 'binary' && (
        <div className="flex flex-col gap-2">
          {request.body.binaryFileName ? (
            <div className="flex items-center gap-3 bg-vscode-input-bg border border-vscode-input-border rounded p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-vscode-fg truncate">{request.body.binaryFileName}</p>
                <p className="text-[10px] text-vscode-fg opacity-40">
                  {formatSize(request.body.binarySize || 0)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearBinary}>
                Remove
              </Button>
              <Button size="sm" onClick={() => messageService.selectBinaryFile()}>
                Change File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 bg-vscode-input-bg border border-vscode-input-border border-dashed rounded p-6">
              <p className="text-xs text-vscode-fg opacity-50">No file selected</p>
              <Button size="sm" onClick={() => messageService.selectBinaryFile()}>
                Select File
              </Button>
              <p className="text-[10px] text-vscode-fg opacity-30">Maximum 10 MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
