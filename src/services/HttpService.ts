import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as https from 'https';
import * as vscode from 'vscode';
import type { ApiRequest, ApiResponse, KeyValue } from '../shared/models';
import { DEFAULT_TIMEOUT, CONTENT_TYPE_MAP } from '../shared/constants';

export class HttpService {
  private abortControllers = new Map<string, AbortController>();

  async sendRequest(
    request: ApiRequest,
    resolvedUrl: string,
    resolvedHeaders: KeyValue[],
    resolvedParams: KeyValue[],
    resolvedBody: string,
    authHeaders: Record<string, string>
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    this.abortControllers.set(request.id, controller);

    const config = vscode.workspace.getConfiguration('aavamiRest');
    const timeout = config.get<number>('requestTimeout', DEFAULT_TIMEOUT);
    const sslVerification = config.get<boolean>('sslVerification', true);
    const followRedirects = config.get<boolean>('followRedirects', true);

    const headers: Record<string, string> = { ...authHeaders };
    for (const h of resolvedHeaders) {
      if (h.enabled && h.key) {
        headers[h.key] = h.value;
      }
    }

    if (request.body.type !== 'none' && !headers['Content-Type']) {
      const ct = CONTENT_TYPE_MAP[request.body.type];
      if (ct) {
        headers['Content-Type'] = ct;
      }
    }

    let url = resolvedUrl;
    const enabledParams = resolvedParams.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const searchParams = new URLSearchParams();
      for (const p of enabledParams) {
        searchParams.append(p.key, p.value);
      }
      const separator = url.includes('?') ? '&' : '?';
      url = url + separator + searchParams.toString();
    }

    let data: any = undefined;
    if (request.body.type !== 'none' && resolvedBody) {
      switch (request.body.type) {
        case 'json':
          try {
            data = JSON.parse(resolvedBody);
          } catch {
            data = resolvedBody;
          }
          break;
        case 'graphql': {
          const gql = request.body.graphql;
          if (gql) {
            let variables: any = {};
            try { variables = JSON.parse(gql.variables || '{}'); } catch { /* use empty */ }
            data = { query: gql.query, variables };
          } else {
            data = resolvedBody;
          }
          break;
        }
        case 'form-urlencoded': {
          const formData = new URLSearchParams();
          const pairs = request.body.formData || [];
          for (const pair of pairs) {
            if (pair.enabled) {
              formData.append(pair.key, pair.value);
            }
          }
          data = formData.toString();
          break;
        }
        case 'form-data': {
          const form = new FormData();
          const pairs = request.body.formData || [];
          for (const pair of pairs) {
            if (pair.enabled) {
              form.append(pair.key, pair.value);
            }
          }
          data = form;
          delete headers['Content-Type'];
          Object.assign(headers, form.getHeaders());
          break;
        }
        case 'binary': {
          if (resolvedBody) {
            data = Buffer.from(resolvedBody, 'base64');
            if (!headers['Content-Type']) {
              headers['Content-Type'] = 'application/octet-stream';
            }
          }
          break;
        }
        default:
          data = resolvedBody;
      }
    }

    const httpsAgent = sslVerification
      ? undefined
      : new https.Agent({ rejectUnauthorized: false });

    const axiosConfig: AxiosRequestConfig = {
      method: request.method.toLowerCase() as any,
      url,
      headers,
      data,
      timeout,
      signal: controller.signal,
      validateStatus: () => true,
      maxRedirects: followRedirects ? 10 : 0,
      responseType: 'text',
      transformResponse: [(d) => d],
      ...(httpsAgent ? { httpsAgent } : {}),
    };

    const proxyConfig = vscode.workspace.getConfiguration('http');
    const proxy = proxyConfig.get<string>('proxy');
    if (proxy) {
      try {
        const proxyUrl = new URL(proxy);
        axiosConfig.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10) || 80,
          protocol: proxyUrl.protocol,
        };
      } catch {
        // Invalid proxy URL, skip
      }
    }

    const startTime = performance.now();

    try {
      const response: AxiosResponse = await axios(axiosConfig);
      const endTime = performance.now();

      const responseBody = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (value != null) {
          responseHeaders[key] = String(value);
        }
      }

      const contentType = responseHeaders['content-type'] || '';

      return {
        requestId: request.id,
        statusCode: response.status,
        statusText: response.statusText || '',
        headers: responseHeaders,
        body: responseBody,
        bodySize: new TextEncoder().encode(responseBody).length,
        time: Math.round(endTime - startTime),
        contentType,
      };
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request was cancelled');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused: ${url}`);
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed: ${url}`);
      }
      throw new Error(error.message || 'Request failed');
    } finally {
      this.abortControllers.delete(request.id);
    }
  }

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAll(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}
