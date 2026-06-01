export const DATA_DIR = 'C:\\RestApiTestData';
export const DATA_FILE = 'C:\\RestApiTestData\\GISP-data.json';

export const DEFAULT_TIMEOUT = 30000;
export const MAX_HISTORY_ENTRIES = 500;
export const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

export const STORAGE_KEYS = {
  COLLECTIONS: 'GISPRest.collections',
  ENVIRONMENTS: 'GISPRest.environments',
  HISTORY: 'GISPRest.history',
  ACTIVE_ENVIRONMENT: 'GISPRest.activeEnvironment',
  SETTINGS: 'GISPRest.settings',
  TOKEN_CACHE: 'GISPRest.tokenCache',
} as const;

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'GISPREST/1.0',
  Accept: '*/*',
};

export const CONTENT_TYPE_MAP: Record<string, string> = {
  json: 'application/json',
  'form-urlencoded': 'application/x-www-form-urlencoded',
  'form-data': 'multipart/form-data',
  raw: 'text/plain',
  graphql: 'application/json',
};
