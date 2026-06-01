import React, { useState } from 'react';
import { useEnvironmentStore } from '../../store/environmentStore';
import { messageService } from '../../services/messageService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { VariableEditor } from './VariableEditor';
import { cn } from '../../utils/cn';
import type { KeyValue, Environment } from '../../types';

export function EnvironmentManager() {
  const { environments, setEnvironments } = useEnvironmentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSetActive = (id: string) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;
    messageService.setActiveEnvironment(env.isActive ? null : id);
  };

  const handleStartEdit = (env: Environment) => {
    setEditingId(env.id);
    setEditName(env.name);
  };

  const handleSaveEdit = (env: Environment) => {
    if (!editName.trim()) return;
    const updated: Environment = { ...env, name: editName.trim() };
    messageService.saveEnvironment(updated);
    setEnvironments(
      environments.map((e) => (e.id === updated.id ? updated : e))
    );
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string) => {
    messageService.deleteEnvironment(id);
    setEnvironments(environments.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const env: Environment = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      variables: [],
      isActive: false,
    };
    messageService.saveEnvironment(env);
    setEnvironments([...environments, env]);
    setNewName('');
    setIsCreating(false);
    setExpandedId(env.id);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewName('');
  };

  const handleVariablesChange = (envId: string, variables: KeyValue[]) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;
    const updated: Environment = { ...env, variables };
    messageService.saveEnvironment(updated);
    setEnvironments(
      environments.map((e) => (e.id === envId ? updated : e))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-panel-border">
        <span className="text-xs font-medium text-vscode-fg uppercase tracking-wide">
          Environments
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          + New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isCreating && (
          <div className="px-3 py-2 border-b border-vscode-panel-border bg-vscode-input-bg">
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Environment name"
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') handleCancelCreate();
                }}
              />
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelCreate}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {environments.length === 0 && !isCreating && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-vscode-fg opacity-60 mb-3">
              No environments yet
            </p>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              Create Environment
            </Button>
          </div>
        )}

        {environments.map((env) => (
          <div
            key={env.id}
            className={cn(
              'border-b border-vscode-panel-border',
              env.isActive && 'bg-vscode-list-hover'
            )}
          >
            {/* Environment header row */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-vscode-list-hover',
                expandedId === env.id && 'bg-vscode-list-hover'
              )}
              onClick={() => handleToggleExpand(env.id)}
            >
              <span
                className={cn(
                  'text-xs transition-transform',
                  expandedId === env.id && 'rotate-90'
                )}
              >
                &#9656;
              </span>

              {env.isActive && (
                <span
                  className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
                  title="Active environment"
                />
              )}

              {editingId === env.id ? (
                <div
                  className="flex items-center gap-1 flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={cn(
                      'flex-1 bg-vscode-input-bg text-vscode-input-fg border border-vscode-input-border',
                      'rounded px-2 py-0.5 text-xs focus:outline-none focus:border-vscode-focus-border'
                    )}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(env);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button size="sm" onClick={() => handleSaveEdit(env)}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-vscode-fg truncate flex-1 min-w-0">
                  {env.name}
                </span>
              )}

              {editingId !== env.id && (
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetActive(env.id)}
                    title={env.isActive ? 'Deactivate' : 'Set as active'}
                    className="text-xs"
                  >
                    {env.isActive ? 'Active' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(env)}
                    title="Rename environment"
                    className="text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(env.id)}
                    title="Delete environment"
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Expanded variable editor */}
            {expandedId === env.id && (
              <div className="px-3 py-2 border-t border-vscode-panel-border bg-vscode-editor-bg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-vscode-fg opacity-60">
                    Variables ({env.variables.length})
                  </span>
                </div>
                <VariableEditor
                  variables={env.variables}
                  onChange={(variables) => handleVariablesChange(env.id, variables)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
