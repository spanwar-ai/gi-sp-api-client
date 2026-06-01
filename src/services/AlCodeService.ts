import type { ApiRequest } from '../shared/models';

export class AlCodeService {
  generate(request: ApiRequest): string {
    const sections: string[] = [];
    sections.push(this.mainProcedure(request));

    if (request.auth.type === 'oauth2-client-credentials') {
      sections.push(this.clientCredentialsProcedure(request.auth));
    }
    if (request.auth.type === 'oauth2-auth-code') {
      sections.push(this.authCodeProcedure(request.auth));
    }
    if (request.auth.type === 'oauth2-password') {
      sections.push(this.passwordGrantProcedure(request.auth));
    }

    return sections.join('\n\n');
  }

  private mainProcedure(request: ApiRequest): string {
    const procName = this.toProcName(request.name);
    const vars: string[] = [];
    const body: string[] = [];

    const hasBody =
      request.body.type !== 'none' &&
      (request.body.content || request.body.formData?.length || request.body.graphql?.query);
    const isOAuth2 =
      request.auth.type === 'oauth2-client-credentials' ||
      request.auth.type === 'oauth2-auth-code' ||
      request.auth.type === 'oauth2-password';

    // --- variables ---
    vars.push('Client: HttpClient');
    vars.push('RequestMessage: HttpRequestMessage');
    vars.push('ResponseMessage: HttpResponseMessage');
    vars.push('Headers: HttpHeaders');

    if (hasBody) {
      vars.push('Content: HttpContent');
      vars.push('ContentHeaders: HttpHeaders');
      vars.push('RequestBody: Text');
    }
    if (isOAuth2) {
      vars.push('AccessToken: SecretText');
    }
    if (request.auth.type === 'basic') {
      vars.push('Base64Convert: Codeunit "Base64 Convert"');
      vars.push('AuthBase64: Text');
    }

    // --- URL with query params ---
    let url = request.url || 'https://api.example.com';
    const queryParams = request.params.filter((p) => p.enabled && p.key);

    if (request.auth.type === 'api-key' && request.auth.addTo === 'query') {
      queryParams.push({ key: request.auth.key, value: request.auth.value, enabled: true });
    }

    if (queryParams.length > 0) {
      const qs = queryParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + qs;
    }

    // --- separate content-type from user headers ---
    let userContentType: string | null = null;
    const userHeaders = request.headers.filter((h) => {
      if (!h.enabled || !h.key) return false;
      if (h.key.toLowerCase() === 'content-type') {
        userContentType = h.value;
        return false;
      }
      return true;
    });

    // --- body: request setup ---
    body.push(`    RequestMessage.SetRequestUri('${this.esc(url)}');`);
    body.push(`    RequestMessage.Method := '${request.method}';`);
    body.push('');
    body.push('    RequestMessage.GetHeaders(Headers);');

    for (const h of userHeaders) {
      body.push(`    Headers.Add('${this.esc(h.key)}', '${this.esc(h.value)}');`);
    }

    // --- auth ---
    switch (request.auth.type) {
      case 'basic':
        body.push('');
        body.push(
          `    AuthBase64 := Base64Convert.ToBase64('${this.esc((request.auth.username || '') + ':' + (request.auth.password || ''))}');`
        );
        body.push(`    Headers.Add('Authorization', 'Basic ' + AuthBase64);`);
        break;

      case 'bearer':
        body.push(
          `    Headers.Add('Authorization', 'Bearer ${this.esc(request.auth.token || '')}');`
        );
        break;

      case 'api-key':
        if (request.auth.addTo === 'header') {
          body.push(
            `    Headers.Add('${this.esc(request.auth.key || '')}', '${this.esc(request.auth.value || '')}');`
          );
        }
        break;

      case 'oauth2-client-credentials':
      case 'oauth2-auth-code':
      case 'oauth2-password':
        body.push('');
        body.push('    if not AcquireAccessToken(AccessToken) then');
        body.push(`        Error('Failed to acquire access token.');`);
        body.push(
          `    Headers.Add('Authorization', SecretStrSubstNo('Bearer %1', AccessToken));`
        );
        break;
    }

    // --- body ---
    if (hasBody) {
      body.push('');
      const { content, contentType } = this.resolveBody(request);
      const ct = userContentType || contentType;

      if (request.body.type === 'binary') {
        body.push(`    // TODO: Binary body — load from InStream or Base64 instead of Text`);
        body.push(`    RequestBody := '';`);
      } else if (content.length > 200) {
        body.push('    RequestBody :=');
        const chunks = this.chunkText(content, 120);
        for (let i = 0; i < chunks.length; i++) {
          const end = i < chunks.length - 1 ? ' +' : ';';
          body.push(`        '${this.esc(chunks[i])}'${end}`);
        }
      } else {
        body.push(`    RequestBody := '${this.esc(content)}';`);
      }

      body.push('    Content.WriteFrom(RequestBody);');
      body.push('    Content.GetHeaders(ContentHeaders);');
      body.push(`    ContentHeaders.Remove('Content-Type');`);
      body.push(`    ContentHeaders.Add('Content-Type', '${this.esc(ct)}');`);
      body.push('    RequestMessage.Content := Content;');
    }

    // --- send ---
    body.push('');
    body.push('    if not Client.Send(RequestMessage, ResponseMessage) then');
    body.push('        exit(false);');
    body.push('');
    body.push('    ResponseMessage.Content.ReadAs(ResponseText);');
    body.push('    exit(ResponseMessage.IsSuccessStatusCode());');

    // --- assemble ---
    const lines: string[] = [];
    lines.push(`procedure ${procName}(var ResponseText: Text): Boolean`);
    lines.push('var');
    for (const v of vars) {
      lines.push(`    ${v};`);
    }
    lines.push('begin');
    lines.push(...body);
    lines.push('end;');

    return lines.join('\n');
  }

  // OAuth2 Client Credentials — direct HttpClient POST to token endpoint
  private clientCredentialsProcedure(
    auth: Record<string, any>
  ): string {
    const lines: string[] = [];

    lines.push('local procedure AcquireAccessToken(var AccessToken: SecretText): Boolean');
    lines.push('var');
    lines.push('    Client: HttpClient;');
    lines.push('    RequestMessage: HttpRequestMessage;');
    lines.push('    ResponseMessage: HttpResponseMessage;');
    lines.push('    Content: HttpContent;');
    lines.push('    ContentHeaders: HttpHeaders;');
    lines.push('    ResponseText: Text;');
    lines.push('    JObject: JsonObject;');
    lines.push('    JToken: JsonToken;');
    lines.push('    RequestBody: Text;');
    lines.push('begin');
    lines.push(
      `    RequestMessage.SetRequestUri('${this.esc(auth.tokenUrl || '')}');`
    );
    lines.push(`    RequestMessage.Method := 'POST';`);
    lines.push('');

    const parts = [
      `grant_type=client_credentials`,
      `client_id=${encodeURIComponent(auth.clientId || '')}`,
      `client_secret=${encodeURIComponent(auth.clientSecret || '')}`,
    ];
    if (auth.scope) parts.push(`scope=${encodeURIComponent(auth.scope)}`);
    if (auth.resource) parts.push(`resource=${encodeURIComponent(auth.resource)}`);

    const bodyStr = parts.join('&');

    if (bodyStr.length > 120) {
      lines.push('    RequestBody :=');
      lines.push(`        'grant_type=client_credentials' +`);
      lines.push(
        `        '&client_id=${this.esc(encodeURIComponent(auth.clientId || ''))}' +`
      );
      lines.push(
        `        '&client_secret=${this.esc(encodeURIComponent(auth.clientSecret || ''))}';`
      );
      if (auth.scope) {
        lines.push(
          `    RequestBody += '&scope=${this.esc(encodeURIComponent(auth.scope))}';`
        );
      }
      if (auth.resource) {
        lines.push(
          `    RequestBody += '&resource=${this.esc(encodeURIComponent(auth.resource))}';`
        );
      }
    } else {
      lines.push(`    RequestBody := '${this.esc(bodyStr)}';`);
    }

    lines.push('    Content.WriteFrom(RequestBody);');
    lines.push('    Content.GetHeaders(ContentHeaders);');
    lines.push(`    ContentHeaders.Remove('Content-Type');`);
    lines.push(
      `    ContentHeaders.Add('Content-Type', 'application/x-www-form-urlencoded');`
    );
    lines.push('    RequestMessage.Content := Content;');
    lines.push('');
    lines.push('    if not Client.Send(RequestMessage, ResponseMessage) then');
    lines.push('        exit(false);');
    lines.push('');
    lines.push('    ResponseMessage.Content.ReadAs(ResponseText);');
    lines.push('    if not JObject.ReadFrom(ResponseText) then');
    lines.push('        exit(false);');
    lines.push(`    if not JObject.Get('access_token', JToken) then`);
    lines.push('        exit(false);');
    lines.push('    AccessToken := JToken.AsValue().AsText();');
    lines.push('    exit(true);');
    lines.push('end;');

    return lines.join('\n');
  }

  // OAuth2 Auth Code — uses BC's built-in OAuth2 codeunit for the interactive flow
  private authCodeProcedure(auth: Record<string, any>): string {
    const lines: string[] = [];
    const scopes = (auth.scope || '').split(' ').filter(Boolean);

    lines.push('local procedure AcquireAccessToken(var AccessToken: SecretText): Boolean');
    lines.push('var');
    lines.push('    OAuth2: Codeunit OAuth2;');
    lines.push('    Scopes: List of [Text];');
    lines.push(`    PromptInteraction: Enum "Prompt Interaction";`);
    lines.push('    AuthCodeErr: Text;');
    lines.push('begin');

    if (scopes.length > 0) {
      for (const s of scopes) {
        lines.push(`    Scopes.Add('${this.esc(s)}');`);
      }
    } else {
      lines.push(`    Scopes.Add('openid');`);
    }

    lines.push('');
    lines.push('    if not OAuth2.AcquireTokenByAuthorizationCode(');
    lines.push(`        '${this.esc(auth.clientId || '')}',`);
    lines.push(`        '${this.esc(auth.clientSecret || '')}',`);
    lines.push(`        '${this.esc(auth.authUrl || '')}',`);
    lines.push(`        '${this.esc(auth.redirectUri || '')}',`);
    lines.push('        Scopes,');
    lines.push('        PromptInteraction::Login,');
    lines.push('        AccessToken,');
    lines.push('        AuthCodeErr)');
    lines.push('    then');
    lines.push('        Error(AuthCodeErr);');
    lines.push('');
    lines.push('    exit(true);');
    lines.push('end;');

    return lines.join('\n');
  }

  // OAuth2 Password grant — direct HttpClient POST to token endpoint with username + password
  private passwordGrantProcedure(auth: Record<string, any>): string {
    const lines: string[] = [];

    lines.push('local procedure AcquireAccessToken(var AccessToken: SecretText): Boolean');
    lines.push('var');
    lines.push('    Client: HttpClient;');
    lines.push('    RequestMessage: HttpRequestMessage;');
    lines.push('    ResponseMessage: HttpResponseMessage;');
    lines.push('    Content: HttpContent;');
    lines.push('    ContentHeaders: HttpHeaders;');
    lines.push('    ResponseText: Text;');
    lines.push('    JObject: JsonObject;');
    lines.push('    JToken: JsonToken;');
    lines.push('    RequestBody: Text;');
    lines.push('begin');
    lines.push(`    RequestMessage.SetRequestUri('${this.esc(auth.tokenUrl || '')}');`);
    lines.push(`    RequestMessage.Method := 'POST';`);
    lines.push('');

    lines.push('    RequestBody :=');
    lines.push(`        'grant_type=password' +`);
    lines.push(
      `        '&client_id=${this.esc(encodeURIComponent(auth.clientId || ''))}' +`
    );
    if (auth.clientSecret) {
      lines.push(
        `        '&client_secret=${this.esc(encodeURIComponent(auth.clientSecret || ''))}' +`
      );
    }
    lines.push(
      `        '&username=${this.esc(encodeURIComponent(auth.username || ''))}' +`
    );
    lines.push(
      `        '&password=${this.esc(encodeURIComponent(auth.password || ''))}';`
    );
    if (auth.scope) {
      lines.push(
        `    RequestBody += '&scope=${this.esc(encodeURIComponent(auth.scope))}';`
      );
    }
    if (auth.resource) {
      lines.push(
        `    RequestBody += '&resource=${this.esc(encodeURIComponent(auth.resource))}';`
      );
    }

    lines.push('    Content.WriteFrom(RequestBody);');
    lines.push('    Content.GetHeaders(ContentHeaders);');
    lines.push(`    ContentHeaders.Remove('Content-Type');`);
    lines.push(
      `    ContentHeaders.Add('Content-Type', 'application/x-www-form-urlencoded');`
    );
    lines.push('    RequestMessage.Content := Content;');
    lines.push('');
    lines.push('    if not Client.Send(RequestMessage, ResponseMessage) then');
    lines.push('        exit(false);');
    lines.push('');
    lines.push('    ResponseMessage.Content.ReadAs(ResponseText);');
    lines.push('    if not JObject.ReadFrom(ResponseText) then');
    lines.push('        exit(false);');
    lines.push(`    if not JObject.Get('access_token', JToken) then`);
    lines.push('        exit(false);');
    lines.push('    AccessToken := JToken.AsValue().AsText();');
    lines.push('    exit(true);');
    lines.push('end;');

    return lines.join('\n');
  }

  private resolveBody(request: ApiRequest): { content: string; contentType: string } {
    switch (request.body.type) {
      case 'json':
        return { content: request.body.content || '', contentType: 'application/json' };
      case 'raw':
        return { content: request.body.content || '', contentType: 'text/plain' };
      case 'form-urlencoded': {
        if (request.body.formData?.length) {
          const pairs = request.body.formData
            .filter((p) => p.enabled)
            .map(
              (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
            );
          return {
            content: pairs.join('&'),
            contentType: 'application/x-www-form-urlencoded',
          };
        }
        return {
          content: request.body.content || '',
          contentType: 'application/x-www-form-urlencoded',
        };
      }
      case 'form-data': {
        if (request.body.formData?.length) {
          const pairs = request.body.formData
            .filter((p) => p.enabled)
            .map(
              (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
            );
          return {
            content: pairs.join('&'),
            contentType: 'application/x-www-form-urlencoded',
          };
        }
        return { content: request.body.content || '', contentType: 'multipart/form-data' };
      }
      case 'graphql': {
        const gql = request.body.graphql;
        if (gql?.query) {
          return {
            content: JSON.stringify({ query: gql.query, variables: gql.variables || '{}' }),
            contentType: 'application/json',
          };
        }
        return { content: request.body.content || '', contentType: 'application/json' };
      }
      default:
        return { content: request.body.content || '', contentType: 'text/plain' };
    }
  }

  private toProcName(name: string): string {
    if (!name) return 'CallApi';
    const cleaned = name.replace(/[^a-zA-Z0-9\s_-]/g, '');
    const pascal = cleaned
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    if (/^\d/.test(pascal)) return 'Call' + pascal;
    return pascal || 'CallApi';
  }

  private esc(str: string): string {
    return str.replace(/'/g, "''");
  }

  private chunkText(str: string, maxLen: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += maxLen) {
      chunks.push(str.substring(i, i + maxLen));
    }
    return chunks;
  }
}
