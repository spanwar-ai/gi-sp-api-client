import { v4 as uuidv4 } from 'uuid';
import type { KeyValue } from '../shared/models';

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

const DYNAMIC_VARIABLES: Record<string, () => string> = {
  $timestamp: () => Date.now().toString(),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => Math.floor(Math.random() * 1000000).toString(),
  $guid: () => uuidv4(),
  $randomUUID: () => uuidv4(),
};

export function interpolate(input: string, variables: KeyValue[]): string {
  return input.replace(VARIABLE_PATTERN, (match, varName: string) => {
    const trimmed = varName.trim();

    if (DYNAMIC_VARIABLES[trimmed]) {
      return DYNAMIC_VARIABLES[trimmed]();
    }

    const variable = variables.find((v) => v.key === trimmed && v.enabled);
    if (variable) {
      return variable.value;
    }

    return match;
  });
}

export function interpolateRequest(
  url: string,
  headers: KeyValue[],
  params: KeyValue[],
  bodyContent: string,
  envVariables: KeyValue[]
): { url: string; headers: KeyValue[]; params: KeyValue[]; bodyContent: string } {
  return {
    url: interpolate(url, envVariables),
    headers: headers.map((h) => ({
      ...h,
      key: interpolate(h.key, envVariables),
      value: interpolate(h.value, envVariables),
    })),
    params: params.map((p) => ({
      ...p,
      key: interpolate(p.key, envVariables),
      value: interpolate(p.value, envVariables),
    })),
    bodyContent: interpolate(bodyContent, envVariables),
  };
}
