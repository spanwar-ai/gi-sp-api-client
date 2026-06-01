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

export type UserRole = 'admin' | 'user';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  type: RequestBodyType;
  content: string;
  formData?: KeyValue[];
  graphql?: { query: string; variables: string };
  binaryFileName?: string;
  binarySize?: number;
}

export interface AuthConfig {
  type: AuthType;
  [key: string]: any;
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

export type SidebarTab = 'collections' | 'history' | 'environments';
export type RequestTab = 'params' | 'headers' | 'body' | 'auth';
export type ResponseTab = 'body' | 'headers' | 'curl' | 'alcode';

export function createDefaultRequest(): ApiRequest {
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { type: 'none', content: '' },
    auth: { type: 'none' },
  };
}
