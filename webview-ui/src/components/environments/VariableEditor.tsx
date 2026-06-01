import React from 'react';
import type { KeyValue } from '../../types';
import { cn } from '../../utils/cn';

interface VariableEditorProps {
  variables: KeyValue[];
  onChange: (variables: KeyValue[]) => void;
}

export function VariableEditor({ variables, onChange }: VariableEditorProps) {
  const updateVariable = (index: number, updates: Partial<KeyValue>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const addVariable = () => {
    onChange([...variables, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="flex flex-col gap-1">
      {variables.length > 0 && (
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 px-1 mb-1">
          <span className="text-[10px] text-vscode-fg opacity-40 px-1" />
          <span className="text-[10px] text-vscode-fg opacity-40">Variable</span>
          <span className="text-[10px] text-vscode-fg opacity-40">Value</span>
          <span className="text-[10px] text-vscode-fg opacity-40 px-2" />
        </div>
      )}
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 text-xs">
        {variables.map((variable, index) => (
          <React.Fragment key={index}>
            <label className="flex items-center px-1">
              <input
                type="checkbox"
                checked={variable.enabled}
                onChange={(e) => updateVariable(index, { enabled: e.target.checked })}
                className="accent-vscode-button-bg"
              />
            </label>
            <input
              value={variable.key}
              onChange={(e) => updateVariable(index, { key: e.target.value })}
              placeholder="Variable name"
              className={cn(
                'bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
                'rounded px-2 py-1 text-xs focus:outline-none focus:border-vscode-focus-border',
                'placeholder:text-vscode-fg placeholder:opacity-30',
                !variable.enabled && 'opacity-50'
              )}
            />
            <input
              value={variable.value}
              onChange={(e) => updateVariable(index, { value: e.target.value })}
              placeholder="Value"
              className={cn(
                'bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
                'rounded px-2 py-1 text-xs focus:outline-none focus:border-vscode-focus-border',
                'placeholder:text-vscode-fg placeholder:opacity-30',
                !variable.enabled && 'opacity-50'
              )}
            />
            <button
              onClick={() => removeVariable(index)}
              className="px-2 text-vscode-fg opacity-50 hover:opacity-100 text-sm"
              title="Remove variable"
            >
              &times;
            </button>
          </React.Fragment>
        ))}
      </div>
      <button
        onClick={addVariable}
        className="text-xs text-vscode-fg opacity-60 hover:opacity-100 text-left px-1 py-1"
      >
        + Add Variable
      </button>
    </div>
  );
}
