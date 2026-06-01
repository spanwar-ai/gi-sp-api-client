import xmlFormatter from 'xml-formatter';

export function formatJson(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return input;
  }
}

export function formatXml(input: string): string {
  try {
    return xmlFormatter(input, { indentation: '  ', collapseContent: true });
  } catch {
    return input;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function getStatusClass(code: number): string {
  if (code >= 200 && code < 300) return 'status-2xx';
  if (code >= 300 && code < 400) return 'status-3xx';
  if (code >= 400 && code < 500) return 'status-4xx';
  return 'status-5xx';
}

export function getMethodClass(method: string): string {
  return `method-${method.toLowerCase()}`;
}

export function isJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function isXml(str: string): boolean {
  return str.trimStart().startsWith('<');
}

export function detectContentType(body: string): 'json' | 'xml' | 'text' {
  if (isJson(body)) return 'json';
  if (isXml(body)) return 'xml';
  return 'text';
}
