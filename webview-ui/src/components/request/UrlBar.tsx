import React, { useState } from 'react';
import { useRequestStore } from '../../store/requestStore';
import { useCollectionStore } from '../../store/collectionStore';
import { useRequest } from '../../hooks/useRequest';
import { messageService } from '../../services/messageService';
import { cn } from '../../utils/cn';
import { getMethodClass } from '../../utils/formatters';
import { Spinner } from '../common/Spinner';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import type { HttpMethod, Collection } from '../../types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function UrlBar() {
  const { setMethod, setUrl, getActiveRequest, updateActiveRequest } = useRequestStore();
  const { send, cancel, isLoading } = useRequest();
  const { collections } = useCollectionStore();
  const request = getActiveRequest();

  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  if (!request) return null;

  const openSaveModal = () => {
    const name = request.name && request.name !== 'New Request'
      ? request.name
      : request.url || 'New Request';
    setSaveName(name);
    setNewCollectionName('');

    if (request.collectionId && collections.find((c) => c.id === request.collectionId)) {
      setSelectedCollectionId(request.collectionId);
      setCreatingNew(false);
    } else if (collections.length > 0) {
      setSelectedCollectionId(collections[0].id);
      setCreatingNew(false);
    } else {
      setCreatingNew(true);
    }

    setShowSave(true);
  };

  const handleSave = () => {
    const trimmedName = saveName.trim() || 'New Request';
    let collectionId = selectedCollectionId;

    if (creatingNew) {
      const colName = newCollectionName.trim();
      if (!colName) return;
      const newCol: Collection = {
        id: crypto.randomUUID(),
        name: colName,
        folders: [],
        requests: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      messageService.saveCollection(newCol);
      collectionId = newCol.id;
    }

    if (!collectionId) return;

    const updated = { ...request, name: trimmedName };
    updateActiveRequest({ name: trimmedName, collectionId });
    messageService.saveRequest(collectionId, updated);
    setShowSave(false);
  };

  const canSave = creatingNew
    ? !!newCollectionName.trim()
    : !!selectedCollectionId;

  return (
    <div className="flex items-center gap-2 p-3">
      <select
        value={request.method}
        onChange={(e) => setMethod(e.target.value as HttpMethod)}
        className={cn(
          'bg-vscode-dropdown-bg border border-vscode-dropdown-border rounded px-2 py-1.5 text-sm font-bold',
          'focus:outline-none focus:border-vscode-focus-border min-w-[100px]',
          getMethodClass(request.method)
        )}
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <input
        value={request.url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL or paste curl command"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLoading) send();
        }}
        className={cn(
          'flex-1 bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
          'rounded px-3 py-1.5 text-sm focus:outline-none focus:border-vscode-focus-border',
          'placeholder:text-vscode-fg placeholder:opacity-30'
        )}
      />

      <button
        onClick={openSaveModal}
        className={cn(
          'bg-vscode-button-secondary-bg text-vscode-button-secondary-fg rounded px-4 py-1.5 text-sm font-medium',
          'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        Save
      </button>

      {isLoading ? (
        <button
          onClick={cancel}
          className="bg-red-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-red-700 flex items-center gap-2"
        >
          <Spinner size="sm" />
          Cancel
        </button>
      ) : (
        <button
          onClick={send}
          disabled={!request.url}
          className={cn(
            'bg-vscode-button-bg text-vscode-button-fg rounded px-6 py-1.5 text-sm font-medium',
            'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Send
        </button>
      )}

      <Modal isOpen={showSave} onClose={() => setShowSave(false)} title="Save Request">
        <div className="flex flex-col gap-3">
          <Input
            label="Request Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="My Request"
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) handleSave(); }}
            autoFocus
          />

          {!creatingNew ? (
            <>
              {collections.length > 0 ? (
                <Select
                  label="Collection"
                  options={collections.map((c) => ({ value: c.id, label: c.name }))}
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                />
              ) : (
                <p className="text-xs text-vscode-fg opacity-50">No collections yet.</p>
              )}
              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className="text-xs text-vscode-fg opacity-50 hover:opacity-80 text-left"
              >
                + Create new collection
              </button>
            </>
          ) : (
            <>
              <Input
                label="New Collection Name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="My Collection"
                onKeyDown={(e) => { if (e.key === 'Enter' && canSave) handleSave(); }}
              />
              {collections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-vscode-fg opacity-50 hover:opacity-80 text-left"
                >
                  &larr; Choose existing collection
                </button>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-vscode-border">
            <Button variant="ghost" onClick={() => setShowSave(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
