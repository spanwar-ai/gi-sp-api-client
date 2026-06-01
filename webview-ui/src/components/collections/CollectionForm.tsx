import React, { useState, useCallback } from 'react';
import { messageService } from '../../services/messageService';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import type { Collection } from '../../types';

interface CollectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass an existing collection to edit; omit to create new. */
  collection?: Collection;
}

export function CollectionForm({ isOpen, onClose, collection }: CollectionFormProps) {
  const [name, setName] = useState(collection?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!collection;

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Collection name is required.');
      return;
    }

    if (isEditing && collection) {
      const updated: Collection = {
        ...collection,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      };
      messageService.saveCollection(updated);
    } else {
      const newCollection: Collection = {
        id: crypto.randomUUID(),
        name: trimmed,
        folders: [],
        requests: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      messageService.saveCollection(newCollection);
    }

    setName('');
    setError(null);
    onClose();
  }, [name, collection, isEditing, onClose]);

  const handleCancel = useCallback(() => {
    setName(collection?.name ?? '');
    setError(null);
    onClose();
  }, [collection, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? 'Edit Collection' : 'New Collection'}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="Enter collection name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
