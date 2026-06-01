import React from 'react';
import type { KeyValue } from '../../types';
import { cn } from '../../utils/cn';

interface KeyValueTableProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueTable({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueTableProps) {
  const updateItem = (index: number, updates: Partial<KeyValue>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 text-xs">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <label className="flex items-center px-1">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => updateItem(index, { enabled: e.target.checked })}
                className="accent-vscode-button-bg"
              />
            </label>
            <input
              value={item.key}
              onChange={(e) => updateItem(index, { key: e.target.value })}
              placeholder={keyPlaceholder}
              className={cn(
                'bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
                'rounded px-2 py-1 text-xs focus:outline-none focus:border-vscode-focus-border',
                'placeholder:text-vscode-fg placeholder:opacity-30'
              )}
            />
            <input
              value={item.value}
              onChange={(e) => updateItem(index, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className={cn(
                'bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
                'rounded px-2 py-1 text-xs focus:outline-none focus:border-vscode-focus-border',
                'placeholder:text-vscode-fg placeholder:opacity-30'
              )}
            />
            <button
              onClick={() => removeItem(index)}
              className="px-2 text-vscode-fg opacity-50 hover:opacity-100 text-sm"
            >
              &times;
            </button>
          </React.Fragment>
        ))}
      </div>
      <button
        onClick={addItem}
        className="text-xs text-vscode-fg opacity-60 hover:opacity-100 text-left px-1 py-1"
      >
        + Add
      </button>
    </div>
  );
}
