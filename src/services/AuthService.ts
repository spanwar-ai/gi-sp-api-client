import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';
import * as msal from '@azure/msal-node';
import axios from 'axios';
import type { AuthConfig } from '../shared/models';
import { STORAGE_KEYS } from '../shared/constants';
import type { StorageService } from './StorageService';

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

export class AuthService {
  private tokenCache = new Map<string, TokenCacheEntry>();
  private cacheReady: Promise<void>;

  constructor(private storage: StorageService) {
    this.cacheReady = this.loadCachedTokens();
  }

  async getAuthHeaders(config: AuthConfig): Promise<Record<string, string>> {
    await this.cacheReady;
    switch (config.type) {
      case 'none':
        return {};

      case 'basic': {
        const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        return { Authorization: `Basic ${encoded}` };
      }

      case 'bearer':
        return config.token ? { Authorization: `Bearer ${config.token}` } : {};

      case 'api-key':
        if (config.addTo === 'header') {
          return { [config.key]: config.value };
        }
        return {};

      case 'oauth2-client-credentials':
        return this.getClientCredentialsHeaders(config);

      case 'oauth2-auth-code':
        return this.getAuthCodeHeaders(config);

      case 'oauth2-password':
        return this.getPasswordGrantHeaders(config);

      default:
        return {};
    }
  }

  getApiKeyQueryParams(config: AuthConfig): Record<string, string> {
    if (config.type === 'api-key' && config.addTo === 'query') {
      return { [config.key]: config.value };
    }
    return {};
  }

  async acquireOAuth2Token(
    config: AuthConfig
  ): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
    await this.cacheReady;
    if (config.type === 'oauth2-client-credentials') {
      return this.fetchClientCredentialsToken(config);
    }
    if (config.type === 'oauth2-auth-code') {
      return this.fetchAuthCodeToken(config);
    }
    if (config.type === 'oauth2-password') {
      return this.fetchPasswordToken(config);
    }
    throw new Error('Invalid auth type for token acquisition');
  }

  private async getPasswordGrantHeaders(
    config: Extract<AuthConfig, { type: 'oauth2-password' }>
  ): Promise<Record<string, string>> {
    if (config.accessToken && config.expiresAt && config.expiresAt > Date.now()) {
      return { Authorization: `Bearer ${config.accessToken}` };
    }

    const cacheKey = `pw:${config.clientId}:${config.username}:${config.tokenUrl}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return { Authorization: `Bearer ${cached.accessToken}` };
    }

    const result = await this.fetchPasswordToken(config);
    this.tokenCache.set(cacheKey, {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt || Date.now() + 3600000,
      refreshToken: result.refreshToken,
    });
    await this.persistTokenCache();

    return { Authorization: `Bearer ${result.accessToken}` };
  }

  private async fetchPasswordToken(
    config: Extract<AuthConfig, { type: 'oauth2-password' }>
  ): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', config.clientId);
    if (config.clientSecret) {
      params.append('client_secret', config.clientSecret);
    }
    params.append('username', config.username);
    params.append('password', config.password);
    if (config.scope) {
      params.append('scope', config.scope);
    }
    if (config.resource) {
      params.append('resource', config.resource);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    return {
      accessToken: response.data.access_token,
      expiresAt: response.data.expires_in
        ? Date.now() + response.data.expires_in * 1000
        : undefined,
      refreshToken: response.data.refresh_token,
    };
  }

  private async getClientCredentialsHeaders(
    config: Extract<AuthConfig, { type: 'oauth2-client-credentials' }>
  ): Promise<Record<string, string>> {
    if (config.accessToken && config.expiresAt && config.expiresAt > Date.now()) {
      return { Authorization: `Bearer ${config.accessToken}` };
    }

    const cacheKey = `cc:${config.clientId}:${config.tokenUrl}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return { Authorization: `Bearer ${cached.accessToken}` };
    }

    const result = await this.fetchClientCredentialsToken(config);
    this.tokenCache.set(cacheKey, {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt || Date.now() + 3600000,
    });
    await this.persistTokenCache();

    return { Authorization: `Bearer ${result.accessToken}` };
  }

  private async getAuthCodeHeaders(
    config: Extract<AuthConfig, { type: 'oauth2-auth-code' }>
  ): Promise<Record<string, string>> {
    if (config.accessToken && config.expiresAt && config.expiresAt > Date.now()) {
      return { Authorization: `Bearer ${config.accessToken}` };
    }

    const cacheKey = `ac:${config.clientId}:${config.tokenUrl}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return { Authorization: `Bearer ${cached.accessToken}` };
    }

    const refreshToken = cached?.refreshToken || config.refreshToken;
    if (refreshToken) {
      try {
        const refreshed = await this.refreshOAuth2Token(config, refreshToken);
        this.tokenCache.set(cacheKey, {
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt || Date.now() + 3600000,
          refreshToken: refreshed.refreshToken,
        });
        await this.persistTokenCache();
        return { Authorization: `Bearer ${refreshed.accessToken}` };
      } catch {
        // Refresh failed, user needs to re-authenticate
      }
    }

    throw new Error(
      'OAuth2 Authorization Code flow requires an interactive login. ' +
      'Click "Get Token" in the Auth tab to authenticate.'
    );
  }

  private async fetchClientCredentialsToken(
    config: Extract<AuthConfig, { type: 'oauth2-client-credentials' }>
  ): Promise<{ accessToken: string; expiresAt?: number }> {
    if (this.isMicrosoftTokenUrl(config.tokenUrl)) {
      return this.fetchMsalToken(config);
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    if (config.scope) {
      params.append('scope', config.scope);
    }
    if (config.resource) {
      params.append('resource', config.resource);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    return {
      accessToken: response.data.access_token,
      expiresAt: response.data.expires_in
        ? Date.now() + response.data.expires_in * 1000
        : undefined,
    };
  }

  private async fetchAuthCodeToken(
    config: Extract<AuthConfig, { type: 'oauth2-auth-code' }>
  ): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
    const redirectUri = config.redirectUri || 'http://localhost:8400/callback';
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(redirectUri);
    } catch {
      throw new Error(`Invalid Redirect URI: ${redirectUri}`);
    }

    if (redirectUrl.hostname !== 'localhost' && redirectUrl.hostname !== '127.0.0.1') {
      throw new Error(
        'Only localhost redirect URIs are supported. ' +
        'Use a URI like http://localhost:8400/callback'
      );
    }

    const port = parseInt(redirectUrl.port, 10) || 8400;
    const callbackPath = redirectUrl.pathname || '/callback';

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    const { waitForCode, close } = await this.startCallbackServer(port, callbackPath);

    try {
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      if (config.scope) {
        authUrl.searchParams.set('scope', config.scope);
      }
      if (config.resource) {
        authUrl.searchParams.set('resource', config.resource);
      }

      const opened = await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
      if (!opened) {
        throw new Error('Failed to open browser for authentication.');
      }

      const code = await waitForCode(state);

      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', config.clientId);
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('code_verifier', codeVerifier);
      if (config.clientSecret) {
        params.append('client_secret', config.clientSecret);
      }
      if (config.resource) {
        params.append('resource', config.resource);
      }

      const response = await axios.post(config.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      });

      const result = {
        accessToken: response.data.access_token,
        expiresAt: response.data.expires_in
          ? Date.now() + response.data.expires_in * 1000
          : undefined,
        refreshToken: response.data.refresh_token,
      };

      const cacheKey = `ac:${config.clientId}:${config.tokenUrl}`;
      this.tokenCache.set(cacheKey, {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt || Date.now() + 3600000,
        refreshToken: result.refreshToken,
      });
      await this.persistTokenCache();

      return result;
    } finally {
      close();
    }
  }

  private async refreshOAuth2Token(
    config: Extract<AuthConfig, { type: 'oauth2-auth-code' }>,
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', config.clientId);
    params.append('refresh_token', refreshToken);
    if (config.clientSecret) {
      params.append('client_secret', config.clientSecret);
    }
    if (config.resource) {
      params.append('resource', config.resource);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    return {
      accessToken: response.data.access_token,
      expiresAt: response.data.expires_in
        ? Date.now() + response.data.expires_in * 1000
        : undefined,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  }

  private async fetchMsalToken(
    config: Extract<AuthConfig, { type: 'oauth2-client-credentials' }>
  ): Promise<{ accessToken: string; expiresAt?: number }> {
    const authority = this.extractAuthority(config.tokenUrl);
    const app = new msal.ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority,
      },
    });

    const result = await app.acquireTokenByClientCredential({
      scopes: config.scope ? config.scope.split(' ').filter(Boolean) : [],
    });

    if (!result?.accessToken) {
      throw new Error('Failed to acquire token');
    }

    return {
      accessToken: result.accessToken,
      expiresAt: result.expiresOn ? result.expiresOn.getTime() : undefined,
    };
  }

  private isMicrosoftTokenUrl(url: string): boolean {
    return url.includes('login.microsoftonline.com') || url.includes('login.microsoft.com');
  }

  private extractAuthority(tokenUrl: string): string {
    try {
      const url = new URL(tokenUrl);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 1) {
        return `${url.origin}/${segments[0]}`;
      }
    } catch { /* ignore */ }
    return 'https://login.microsoftonline.com/common';
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  private startCallbackServer(
    port: number,
    path: string
  ): Promise<{ waitForCode: (expectedState: string) => Promise<string>; close: () => void }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer();

      server.listen(port, '127.0.0.1', () => {
        const waitForCode = (expectedState: string): Promise<string> => {
          return new Promise((resolveCode, rejectCode) => {
            const timeout = setTimeout(() => {
              server.close();
              rejectCode(new Error('Authorization timed out after 2 minutes. Please try again.'));
            }, 120000);

            server.on('request', (req, res) => {
              const url = new URL(req.url!, `http://127.0.0.1:${port}`);

              if (url.pathname !== path) {
                res.writeHead(404);
                res.end('Not found');
                return;
              }

              const code = url.searchParams.get('code');
              const returnedState = url.searchParams.get('state');
              const error = url.searchParams.get('error');
              const errorDesc = url.searchParams.get('error_description');

              if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.callbackHtml(false, errorDesc || error));
                clearTimeout(timeout);
                rejectCode(new Error(`Authorization failed: ${errorDesc || error}`));
                return;
              }

              if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(this.callbackHtml(false, 'No authorization code received'));
                return;
              }

              if (returnedState !== expectedState) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(this.callbackHtml(false, 'State mismatch — possible CSRF attack'));
                clearTimeout(timeout);
                rejectCode(new Error('State parameter mismatch — authorization rejected for security.'));
                return;
              }

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(this.callbackHtml(true));
              clearTimeout(timeout);
              resolveCode(code);
            });
          });
        };

        const close = () => {
          try { server.close(); } catch { /* already closed */ }
        };

        resolve({ waitForCode, close });
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(
            `Port ${port} is already in use. Change the Redirect URI to use a different port, ` +
            `or close the application using port ${port}.`
          ));
        } else {
          reject(new Error(`Failed to start callback server: ${err.message}`));
        }
      });
    });
  }

  private callbackHtml(success: boolean, message?: string): string {
    const title = success ? 'Authentication Successful' : 'Authentication Failed';
    const body = success
      ? 'You can close this tab and return to VS Code.'
      : `${message || 'An error occurred.'}<br><br>Close this tab and try again in VS Code.`;
    const icon = success ? '&#10003;' : '&#10007;';
    const color = success ? '#4ec9b0' : '#f14c4c';

    return [
      '<!DOCTYPE html><html><head><title>', title, '</title></head>',
      '<body style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;',
      'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;',
      'background:#1e1e1e;color:#ccc;">',
      '<div style="text-align:center;max-width:480px;">',
      '<div style="font-size:48px;color:', color, ';margin-bottom:16px;">', icon, '</div>',
      '<h2 style="color:', color, ';margin:0 0 8px;">', title, '</h2>',
      '<p style="opacity:0.8;line-height:1.5;">', body, '</p>',
      '</div></body></html>',
    ].join('');
  }

  private async loadCachedTokens(): Promise<void> {
    try {
      const cached = await this.storage.getSecret(STORAGE_KEYS.TOKEN_CACHE);
      if (cached) {
        const entries: Record<string, TokenCacheEntry> = JSON.parse(cached);
        for (const [key, value] of Object.entries(entries)) {
          this.tokenCache.set(key, value);
        }
      }
    } catch { /* ignore corrupted cache */ }
  }

  private async persistTokenCache(): Promise<void> {
    const obj: Record<string, TokenCacheEntry> = {};
    for (const [key, value] of this.tokenCache.entries()) {
      obj[key] = value;
    }
    await this.storage.setSecret(STORAGE_KEYS.TOKEN_CACHE, JSON.stringify(obj));
  }

  clearCache(): void {
    this.tokenCache.clear();
  }
}
