import React, { useState, useEffect, useMemo } from 'react';
import { useRequestStore } from '../../store/requestStore';
import { messageService } from '../../services/messageService';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Spinner } from '../common/Spinner';
import type { AuthType, AuthConfig } from '../../types';

const AUTH_TYPES: Array<{ value: AuthType; label: string }> = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2-client-credentials', label: 'OAuth2 — Client Credentials' },
  { value: 'oauth2-auth-code', label: 'OAuth2 — Authorization Code' },
  { value: 'oauth2-password', label: 'OAuth2 — Password' },
];

type TokenStatus = 'none' | 'active' | 'expiring' | 'expired';

function getTokenStatus(auth: AuthConfig): { status: TokenStatus; label: string } {
  const token = auth.accessToken as string | undefined;
  const expiresAt = auth.expiresAt as number | undefined;

  if (!token) {
    return { status: 'none', label: 'No token' };
  }
  if (!expiresAt) {
    return { status: 'active', label: 'Token acquired' };
  }

  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) {
    return { status: 'expired', label: 'Token expired' };
  }

  const minutes = Math.floor(remaining / 60000);
  const timeLabel = minutes > 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;

  if (remaining < 300000) {
    return { status: 'expiring', label: `Expiring soon — ${timeLabel} left` };
  }

  return { status: 'active', label: `Active — expires in ${timeLabel}` };
}

const STATUS_BADGE: Record<TokenStatus, 'default' | 'success' | 'warning' | 'error'> = {
  none: 'default',
  active: 'success',
  expiring: 'warning',
  expired: 'error',
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-vscode-fg opacity-50 mb-2">
      {children}
    </h4>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-vscode-input-border rounded-md p-3">
      <SectionHeader>{title}</SectionHeader>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-vscode-fg opacity-40 -mt-1">{children}</p>;
}

export function AuthEditor() {
  const { getActiveRequest, setAuth } = useRequestStore();
  const request = getActiveRequest();
  const [isGettingToken, setIsGettingToken] = useState(false);

  const auth = request?.auth ?? { type: 'none' as AuthType };

  useEffect(() => {
    if (!isGettingToken) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === 'oauth2Token' || msg?.type === 'oauth2Error') {
        setIsGettingToken(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isGettingToken]);

  const tokenStatus = useMemo(() => getTokenStatus(auth), [auth.accessToken, auth.expiresAt]);

  if (!request) return null;

  const updateAuth = (updates: Partial<AuthConfig>) => {
    setAuth({ ...auth, ...updates } as AuthConfig);
  };

  const handleChangeType = (newType: AuthType) => {
    const defaults: Record<string, AuthConfig> = {
      'none': { type: 'none' },
      'basic': { type: 'basic', username: '', password: '' },
      'bearer': { type: 'bearer', token: '' },
      'api-key': { type: 'api-key', key: '', value: '', addTo: 'header' },
      'oauth2-client-credentials': {
        type: 'oauth2-client-credentials', clientId: '', clientSecret: '',
        tokenUrl: '', scope: '', resource: '',
      },
      'oauth2-auth-code': {
        type: 'oauth2-auth-code', clientId: '', clientSecret: '',
        authUrl: '', tokenUrl: '', redirectUri: 'http://localhost:8400/callback',
        scope: '', resource: '',
      },
      'oauth2-password': {
        type: 'oauth2-password', tokenUrl: '', clientId: '', clientSecret: '',
        username: '', password: '', scope: '', resource: '',
      },
    };
    setAuth(defaults[newType] || { type: newType });
  };

  const handleGetToken = () => {
    setIsGettingToken(true);
    messageService.oauth2GetToken(auth);
  };

  const handleClearToken = () => {
    updateAuth({ accessToken: undefined, expiresAt: undefined, refreshToken: undefined });
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <Select
        label="Authorization"
        options={AUTH_TYPES}
        value={auth.type}
        onChange={(e) => handleChangeType(e.target.value as AuthType)}
        className="w-72"
      />

      {/* ── No Auth ─────────────────────────── */}
      {auth.type === 'none' && (
        <p className="text-xs text-vscode-fg opacity-40 italic">
          This request will be sent without any authentication headers.
        </p>
      )}

      {/* ── Basic Auth ──────────────────────── */}
      {auth.type === 'basic' && (
        <Section title="Credentials">
          <Input
            label="Username"
            value={auth.username || ''}
            onChange={(e) => updateAuth({ username: e.target.value })}
            placeholder="Enter username"
            autoComplete="off"
          />
          <Input
            label="Password"
            type="password"
            value={auth.password || ''}
            onChange={(e) => updateAuth({ password: e.target.value })}
            placeholder="Enter password"
            autoComplete="off"
          />
          <FieldHint>Sent as Base64-encoded Authorization header</FieldHint>
        </Section>
      )}

      {/* ── Bearer Token ────────────────────── */}
      {auth.type === 'bearer' && (
        <Section title="Token">
          <Input
            label="Bearer Token"
            value={auth.token || ''}
            onChange={(e) => updateAuth({ token: e.target.value })}
            placeholder="Paste your bearer token"
            autoComplete="off"
          />
          <FieldHint>Sent as: Authorization: Bearer &lt;token&gt;</FieldHint>
        </Section>
      )}

      {/* ── API Key ─────────────────────────── */}
      {auth.type === 'api-key' && (
        <Section title="API Key">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Key"
              value={auth.key || ''}
              onChange={(e) => updateAuth({ key: e.target.value })}
              placeholder="X-API-Key"
            />
            <Input
              label="Value"
              value={auth.value || ''}
              onChange={(e) => updateAuth({ value: e.target.value })}
              placeholder="your-api-key"
              autoComplete="off"
            />
          </div>
          <Select
            label="Add To"
            options={[
              { value: 'header', label: 'Header' },
              { value: 'query', label: 'Query Parameter' },
            ]}
            value={auth.addTo || 'header'}
            onChange={(e) => updateAuth({ addTo: e.target.value })}
            className="w-48"
          />
        </Section>
      )}

      {/* ── OAuth2 Client Credentials ───────── */}
      {auth.type === 'oauth2-client-credentials' && (
        <>
          <Section title="Configuration">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Client ID"
                value={auth.clientId || ''}
                onChange={(e) => updateAuth({ clientId: e.target.value })}
                placeholder="your-client-id"
              />
              <Input
                label="Client Secret"
                type="password"
                value={auth.clientSecret || ''}
                onChange={(e) => updateAuth({ clientSecret: e.target.value })}
                placeholder="your-client-secret"
                autoComplete="off"
              />
            </div>
            <Input
              label="Token URL"
              value={auth.tokenUrl || ''}
              onChange={(e) => updateAuth({ tokenUrl: e.target.value })}
              placeholder="https://auth.example.com/oauth2/token"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Scope"
                value={auth.scope || ''}
                onChange={(e) => updateAuth({ scope: e.target.value })}
                placeholder="api://app/.default"
              />
              <div>
                <Input
                  label="Resource"
                  value={auth.resource || ''}
                  onChange={(e) => updateAuth({ resource: e.target.value })}
                  placeholder="https://api.example.com"
                />
                <FieldHint>Optional — target resource identifier (RFC 8707)</FieldHint>
              </div>
            </div>
          </Section>

          <TokenSection
            status={tokenStatus}
            isLoading={isGettingToken}
            onGetToken={handleGetToken}
            onClearToken={handleClearToken}
          />
        </>
      )}

      {/* ── OAuth2 Authorization Code ───────── */}
      {auth.type === 'oauth2-auth-code' && (
        <>
          <Section title="Configuration">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Client ID"
                value={auth.clientId || ''}
                onChange={(e) => updateAuth({ clientId: e.target.value })}
                placeholder="your-client-id"
              />
              <Input
                label="Client Secret"
                type="password"
                value={auth.clientSecret || ''}
                onChange={(e) => updateAuth({ clientSecret: e.target.value })}
                placeholder="Optional for public clients"
                autoComplete="off"
              />
            </div>
            <Input
              label="Authorization URL"
              value={auth.authUrl || ''}
              onChange={(e) => updateAuth({ authUrl: e.target.value })}
              placeholder="https://auth.example.com/oauth2/authorize"
            />
            <Input
              label="Token URL"
              value={auth.tokenUrl || ''}
              onChange={(e) => updateAuth({ tokenUrl: e.target.value })}
              placeholder="https://auth.example.com/oauth2/token"
            />
            <Input
              label="Redirect URI"
              value={auth.redirectUri || ''}
              onChange={(e) => updateAuth({ redirectUri: e.target.value })}
              placeholder="http://localhost:8400/callback"
            />
            <FieldHint>
              Must be a localhost URI. A temporary server will listen here for the callback.
            </FieldHint>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Scope"
                value={auth.scope || ''}
                onChange={(e) => updateAuth({ scope: e.target.value })}
                placeholder="openid profile email"
              />
              <div>
                <Input
                  label="Resource"
                  value={auth.resource || ''}
                  onChange={(e) => updateAuth({ resource: e.target.value })}
                  placeholder="https://api.example.com"
                />
                <FieldHint>Optional — target resource identifier (RFC 8707)</FieldHint>
              </div>
            </div>
          </Section>

          <TokenSection
            status={tokenStatus}
            isLoading={isGettingToken}
            onGetToken={handleGetToken}
            onClearToken={handleClearToken}
            hasRefreshToken={!!auth.refreshToken}
          />
        </>
      )}

      {/* ── OAuth2 Password Grant ───────────── */}
      {auth.type === 'oauth2-password' && (
        <>
          <Section title="Configuration">
            <Input
              label="Token URL"
              value={auth.tokenUrl || ''}
              onChange={(e) => updateAuth({ tokenUrl: e.target.value })}
              placeholder="https://auth.example.com/oauth2/token"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Client ID"
                value={auth.clientId || ''}
                onChange={(e) => updateAuth({ clientId: e.target.value })}
                placeholder="your-client-id"
              />
              <Input
                label="Client Secret"
                type="password"
                value={auth.clientSecret || ''}
                onChange={(e) => updateAuth({ clientSecret: e.target.value })}
                placeholder="your-client-secret"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Username"
                value={auth.username || ''}
                onChange={(e) => updateAuth({ username: e.target.value })}
                placeholder="resource-owner-username"
                autoComplete="off"
              />
              <Input
                label="Password"
                type="password"
                value={auth.password || ''}
                onChange={(e) => updateAuth({ password: e.target.value })}
                placeholder="resource-owner-password"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Scope"
                value={auth.scope || ''}
                onChange={(e) => updateAuth({ scope: e.target.value })}
                placeholder="api.read api.write"
              />
              <div>
                <Input
                  label="Resource"
                  value={auth.resource || ''}
                  onChange={(e) => updateAuth({ resource: e.target.value })}
                  placeholder="https://api.example.com"
                />
                <FieldHint>Optional — target resource identifier (RFC 8707)</FieldHint>
              </div>
            </div>
            <FieldHint>
              Sent as: grant_type=password with client_id, client_secret, username, password.
            </FieldHint>
          </Section>

          <TokenSection
            status={tokenStatus}
            isLoading={isGettingToken}
            onGetToken={handleGetToken}
            onClearToken={handleClearToken}
            hasRefreshToken={!!auth.refreshToken}
          />
        </>
      )}
    </div>
  );
}

function TokenSection({
  status,
  isLoading,
  onGetToken,
  onClearToken,
  hasRefreshToken,
}: {
  status: { status: TokenStatus; label: string };
  isLoading: boolean;
  onGetToken: () => void;
  onClearToken: () => void;
  hasRefreshToken?: boolean;
}) {
  return (
    <div className="border border-vscode-input-border rounded-md p-3">
      <SectionHeader>Token</SectionHeader>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant={STATUS_BADGE[status.status]}>{status.label}</Badge>
        {hasRefreshToken && status.status !== 'none' && (
          <Badge variant="info">Refresh token available</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onGetToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner size="sm" />
              Waiting for login...
            </span>
          ) : (
            status.status === 'none' ? 'Get Token' : 'Get New Token'
          )}
        </Button>
        {status.status !== 'none' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearToken}
            disabled={isLoading}
          >
            Clear Token
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-[10px] text-vscode-fg opacity-40 mt-2">
          A browser window has been opened. Complete the login there, then return here.
        </p>
      )}
    </div>
  );
}
