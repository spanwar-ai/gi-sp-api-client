import type { ApiRequest } from '../shared/models';

export class CurlService {
  generate(request: ApiRequest, authHeaders: Record<string, string> = {}): string {
    const parts: string[] = ['curl'];

    if (request.method !== 'GET') {
      parts.push(`-X ${request.method}`);
    }

    let url = request.url;
    const enabledParams = request.params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const sp = new URLSearchParams();
      for (const p of enabledParams) {
        sp.append(p.key, p.value);
      }
      const sep = url.includes('?') ? '&' : '?';
      url = url + sep + sp.toString();
    }

    parts.push(`'${this.escape(url)}'`);

    const allHeaders = { ...authHeaders };
    for (const h of request.headers) {
      if (h.enabled && h.key) {
        allHeaders[h.key] = h.value;
      }
    }
    for (const [key, value] of Object.entries(allHeaders)) {
      parts.push(`-H '${this.escape(key)}: ${this.escape(value)}'`);
    }

    if (request.body.type !== 'none' && request.body.content) {
      if (request.body.type === 'form-urlencoded' && request.body.formData) {
        for (const pair of request.body.formData) {
          if (pair.enabled) {
            parts.push(`--data-urlencode '${this.escape(pair.key)}=${this.escape(pair.value)}'`);
          }
        }
      } else if (request.body.type === 'graphql' && request.body.graphql) {
        const payload = JSON.stringify({
          query: request.body.graphql.query,
          variables: request.body.graphql.variables || '{}',
        });
        parts.push(`-d '${this.escape(payload)}'`);
      } else {
        parts.push(`-d '${this.escape(request.body.content)}'`);
      }
    }

    return parts.join(' \\\n  ');
  }

  private escape(str: string): string {
    return str.replace(/'/g, "'\\''");
  }
}
