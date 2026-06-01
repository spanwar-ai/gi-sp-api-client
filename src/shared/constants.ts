export const DATA_DIR = 'C:\\RestApiTestData';
export const DATA_FILE = 'C:\\RestApiTestData\\aavami-data.json';

export const DEFAULT_TIMEOUT = 30000;
export const MAX_HISTORY_ENTRIES = 500;
export const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

export const STORAGE_KEYS = {
  COLLECTIONS: 'aavamiRest.collections',
  ENVIRONMENTS: 'aavamiRest.environments',
  HISTORY: 'aavamiRest.history',
  ACTIVE_ENVIRONMENT: 'aavamiRest.activeEnvironment',
  SETTINGS: 'aavamiRest.settings',
  TOKEN_CACHE: 'aavamiRest.tokenCache',
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'AavamiREST/1.0',
  Accept: '*/*',
};

export const CONTENT_TYPE_MAP: Record<string, string> = {
  json: 'application/json',
  'form-urlencoded': 'application/x-www-form-urlencoded',
  'form-data': 'multipart/form-data',
  raw: 'text/plain',
  graphql: 'application/json',
};
