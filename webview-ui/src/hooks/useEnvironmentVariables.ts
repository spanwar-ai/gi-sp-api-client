import { useMemo } from 'react';
import { useEnvironmentStore } from '../store/environmentStore';
import type { KeyValue } from '../types';

export function useEnvironmentVariables() {
  const { environments } = useEnvironmentStore();

  const activeVariables = useMemo<KeyValue[]>(() => {
    const active = environments.find((e) => e.isActive);
    return active?.variables || [];
  }, [environments]);

  const interpolate = (input: string): string => {
    return input.replace(/\{\{([^}]+)\}\}/g, (match, varName: string) => {
      const trimmed = varName.trim();
      const variable = activeVariables.find((v) => v.key === trimmed && v.enabled);
      return variable?.value ?? match;
    });
  };

  return { activeVariables, interpolate };
}
