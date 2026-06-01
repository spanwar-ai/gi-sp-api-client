import React, { useState, useCallback, useEffect } from 'react';
import { messageService } from '../../services/messageService';
import { useCollectionStore } from '../../store/collectionStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { CodeEditor } from '../common/CodeEditor';

type ActiveTab = 'import' | 'export';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ActiveTab;
}

export function ImportExportModal({
  isOpen,
  onClose,
  initialTab = 'import',
}: ImportExportModalProps) {
  const { collections } = useCollectionStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [importContent, setImportContent] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [exportContent, setExportContent] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setImportContent('');
      setImportError(null);
      setImportSuccess(false);
      setExportContent('');
      setSelectedCollectionId(collections.length > 0 ? collections[0].id : '');
    }
  }, [isOpen, initialTab, collections]);

  const handleImport = useCallback(() => {
    const trimmed = importContent.trim();
    if (!trimmed) {
      setImportError('Please paste collection JSON to import.');
      return;
    }

    try {
      JSON.parse(trimmed);
    } catch {
      setImportError('Invalid JSON format. Please check your input.');
      return;
    }

    setImportError(null);
    setImportSuccess(false);
    messageService.importCollection(trimmed);

    // Listen for the import result
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'importCollectionResult') {
        if (message.payload?.error) {
          setImportError(message.payload.error);
        } else {
          setImportSuccess(true);
          setImportContent('');
        }
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
  }, [importContent]);

  const handleExport = useCallback(() => {
    if (!selectedCollectionId) return;

    setExportLoading(true);
    setExportContent('');
    messageService.exportCollection(selectedCollectionId);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'exportCollectionResult') {
        setExportLoading(false);
        if (message.payload?.content) {
          setExportContent(message.payload.content);
        } else if (message.payload?.error) {
          setExportContent(`// Error: ${message.payload.error}`);
        }
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Timeout fallback
    setTimeout(() => {
      setExportLoading(false);
    }, 15000);
  }, [selectedCollectionId]);

  const handleCollectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCollectionId(e.target.value);
      setExportContent('');
    },
    []
  );

  const handleCopyExport = useCallback(() => {
    if (exportContent) {
      navigator.clipboard.writeText(exportContent);
    }
  }, [exportContent]);

  const collectionOptions =
    collections.length > 0
      ? collections.map((c) => ({ value: c.id, label: c.name }))
      : [{ value: '', label: 'No collections available' }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export Collections"
      className="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex border-b border-vscode-border">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-vscode-fg border-b-2 border-vscode-focus-border'
                : 'text-vscode-fg opacity-50 hover:opacity-80'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-vscode-fg border-b-2 border-vscode-focus-border'
                : 'text-vscode-fg opacity-50 hover:opacity-80'
            }`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>

        {/* Import tab */}
        {activeTab === 'import' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-vscode-fg opacity-60">
              Paste a collection JSON to import it into your workspace.
            </p>
            <CodeEditor
              value={importContent}
              onChange={(val) => {
                setImportContent(val);
                if (importError) setImportError(null);
                if (importSuccess) setImportSuccess(false);
              }}
              language="json"
              placeholder='{"name": "My Collection", "requests": [...]}'
              minHeight="200px"
            />
            {importError && (
              <div className="text-xs text-red-400">{importError}</div>
            )}
            {importSuccess && (
              <div className="text-xs text-green-400">
                Collection imported successfully.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!importContent.trim()}
              >
                Import
              </Button>
            </div>
          </div>
        )}

        {/* Export tab */}
        {activeTab === 'export' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-vscode-fg opacity-60">
              Select a collection to export as JSON.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label="Collection"
                  options={collectionOptions}
                  value={selectedCollectionId}
                  onChange={handleCollectionChange}
                  disabled={collections.length === 0}
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={!selectedCollectionId || exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export'}
              </Button>
            </div>
            {exportContent && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-vscode-fg opacity-80">
                    Exported JSON
                  </label>
                  <Button variant="ghost" size="sm" onClick={handleCopyExport}>
                    Copy
                  </Button>
                </div>
                <CodeEditor
                  value={exportContent}
                  onChange={() => {}}
                  language="json"
                  readOnly
                  minHeight="200px"
                />
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
