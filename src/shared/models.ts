export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type RequestBodyType =
  | 'none'
  | 'json'
  | 'raw'
  | 'form-data'
  | 'form-urlencoded'
  | 'binary'
  | 'graphql';

export type AuthType =
  | 'none'
  | 'basic'
  | 'bearer'
  | 'api-key'
  | 'oauth2-client-credentials'
  | 'oauth2-auth-code'
  | 'oauth2-password';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface NoAuth {
  type: 'none';
}

export interface BasicAuth {
  type: 'basic';
  username: string;
  password: string;
}

export interface BearerToken {
  type: 'bearer';
  token: string;
}

export interface ApiKeyAuth {
  type: 'api-key';
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

export interface OAuth2ClientCredentials {
  type: 'oauth2-client-credentials';
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope: string;
  resource?: string;
  accessToken?: string;
  expiresAt?: number;
}

export interface OAuth2AuthCode {
  type: 'oauth2-auth-code';
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string;
  resource?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface OAuth2Password {
  type: 'oauth2-password';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  scope: string;
  resource?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export type AuthConfig =
  | NoAuth
  | BasicAuth
  | BearerToken
  | ApiKeyAuth
  | OAuth2ClientCredentials
  | OAuth2AuthCode
  | OAuth2Password;

export interface RequestBody {
  type: RequestBodyType;
  content: string;
  formData?: KeyValue[];
  graphql?: { query: string; variables: string };
  binaryFileName?: string;
  binarySize?: number;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  collectionId?: string;
  folderId?: string;
}

export interface ApiResponse {
  requestId: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  time: number;
  contentType?: string;
}

export interface Collection {
  id: string;
  name: string;
  folders: CollectionFolder[];
  requests: ApiRequest[];
  variables?: KeyValue[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: ApiRequest[];
  folders: CollectionFolder[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  isActive: boolean;
}

export interface HistoryEntry {
  id: string;
  request: ApiRequest;
  response: Pick<ApiResponse, 'statusCode' | 'statusText' | 'time' | 'bodySize'>;
  timestamp: string;
}

export interface ExtensionSettings {
  requestTimeout: number;
  maxHistoryEntries: number;
  followRedirects: boolean;
  sslVerification: boolean;
  maxResponseSize: number;
}

export function createDefaultRequest(): ApiRequest {
  return {
    id: '',
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { type: 'none', content: '' },
    auth: { type: 'none' },
  };
}
