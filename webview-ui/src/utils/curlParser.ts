import type { ApiRequest, KeyValue } from '../types';

export function parseCurl(curlCommand: string): Partial<ApiRequest> {
  const result: Partial<ApiRequest> = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { type: 'none', content: '' },
    auth: { type: 'none' },
  };

  const cleaned = curlCommand
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .trim();

  const urlMatch = cleaned.match(/curl\s+(?:-[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/);
  if (urlMatch) {
    result.url = urlMatch[1];
  }

  const methodMatch = cleaned.match(/-X\s+(\w+)/);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase() as ApiRequest['method'];
  }

  const headers: KeyValue[] = [];
  const headerMatches = cleaned.matchAll(/-H\s+['"]([^'"]+)['"]/g);
  for (const match of headerMatches) {
    const colonIdx = match[1].indexOf(':');
    if (colonIdx > 0) {
      headers.push({
        key: match[1].substring(0, colonIdx).trim(),
        value: match[1].substring(colonIdx + 1).trim(),
        enabled: true,
      });
    }
  }
  result.headers = headers;

  const dataMatch = cleaned.match(/-d\s+['"]([^'"]+)['"]/);
  if (dataMatch) {
    result.body = { type: 'json', content: dataMatch[1] };
    if (!result.method || result.method === 'GET') {
      result.method = 'POST';
    }
  }

  return result;
}
