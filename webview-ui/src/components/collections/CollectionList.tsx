import React, { useState, useEffect, useCallback } from 'react';
import { useCollectionStore } from '../../store/collectionStore';
import { useRequestStore } from '../../store/requestStore';
import { messageService } from '../../services/messageService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { cn } from '../../utils/cn';
import { getMethodClass } from '../../utils/formatters';
import type { Collection, ApiRequest, CollectionFolder } from '../../types';

interface CollectionItemProps {
  collection: Collection;
  onDelete: (id: string) => void;
  onLoadRequest: (request: ApiRequest) => void;
}

function RequestItem({
  request,
  onLoad,
}: {
  request: ApiRequest;
  onLoad: (request: ApiRequest) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-sm',
        'hover:bg-vscode-list-hover transition-colors',
        'focus:outline-none focus:ring-1 focus:ring-vscode-focus-border'
      )}
      onClick={() => onLoad(request)}
    >
      <span
        className={cn(
          'text-xs font-bold uppercase w-12 shrink-0',
          getMethodClass(request.method)
        )}
      >
        {request.method}
      </span>
      <span className="truncate text-vscode-fg opacity-80">{request.name}</span>
    </button>
  );
}

function FolderItem({
  folder,
  onLoadRequest,
}: {
  folder: CollectionFolder;
  onLoadRequest: (request: ApiRequest) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={cn(
          'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-sm',
          'hover:bg-vscode-list-hover transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-vscode-focus-border'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs opacity-60">{expanded ? '▾' : '▸'}</span>
        <span className="text-vscode-fg">{folder.name}</span>
        <span className="ml-auto text-xs text-vscode-fg opacity-40">
          {folder.requests.length + folder.folders.length}
        </span>
      </button>
      {expanded && (
        <div className="ml-4">
          {folder.folders.map((sub) => (
            <FolderItem
              key={sub.id}
              folder={sub}
              onLoadRequest={onLoadRequest}
            />
          ))}
          {folder.requests.map((req) => (
            <RequestItem key={req.id} request={req} onLoad={onLoadRequest} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionItem({ collection, onDelete, onLoadRequest }: CollectionItemProps) {
  const [expanded, setExpanded] = useState(false);

  const totalRequests =
    collection.requests.length +
    collection.folders.reduce(
      (sum, f) => sum + f.requests.length,
      0
    );

  return (
    <div className="border border-vscode-border rounded">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer',
          'hover:bg-vscode-list-hover transition-colors rounded-t',
          expanded && 'border-b border-vscode-border'
        )}
      >
        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-left focus:outline-none"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs opacity-60">{expanded ? '▾' : '▸'}</span>
          <span className="text-sm font-medium text-vscode-fg">{collection.name}</span>
          <span className="text-xs text-vscode-fg opacity-40 ml-1">
            ({totalRequests})
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(collection.id);
          }}
          title="Delete collection"
        >
          &times;
        </Button>
      </div>
      {expanded && (
        <div className="py-1">
          {collection.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              onLoadRequest={onLoadRequest}
            />
          ))}
          {collection.requests.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              onLoad={onLoadRequest}
            />
          ))}
          {collection.folders.length === 0 && collection.requests.length === 0 && (
            <div className="text-xs text-vscode-fg opacity-40 px-3 py-2">
              No requests in this collection
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CollectionList() {
  const { collections } = useCollectionStore();
  const { loadRequest } = useRequestStore();

  const [showNewInput, setShowNewInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    messageService.getCollections();
  }, []);

  const handleLoadRequest = useCallback(
    (request: ApiRequest) => {
      loadRequest(request);
    },
    [loadRequest]
  );

  const handleDeleteCollection = useCallback((id: string) => {
    messageService.deleteCollection(id);
  }, []);

  const handleCreateCollection = useCallback(() => {
    const name = newCollectionName.trim();
    if (!name) return;

    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      folders: [],
      requests: [],
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    messageService.saveCollection(newCollection);
    setNewCollectionName('');
    setShowNewInput(false);
  }, [newCollectionName]);

  const handleNewInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCreateCollection();
      } else if (e.key === 'Escape') {
        setShowNewInput(false);
        setNewCollectionName('');
      }
    },
    [handleCreateCollection]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-border">
        <h3 className="text-xs font-semibold text-vscode-fg uppercase tracking-wide">
          Collections
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewInput(true)}
          title="New collection"
        >
          +
        </Button>
      </div>

      {showNewInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-vscode-border">
          <div className="flex-1">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={handleNewInputKeyDown}
              autoFocus
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleCreateCollection}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewInput(false);
              setNewCollectionName('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="text-sm text-vscode-fg opacity-50">No collections</div>
            <div className="text-xs text-vscode-fg opacity-40 mt-1">
              Create a collection to organize your requests
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {collections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                onDelete={handleDeleteCollection}
                onLoadRequest={handleLoadRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
