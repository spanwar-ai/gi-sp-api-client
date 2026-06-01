import type {
  ApiRequest,
  ApiResponse,
  Collection,
  Environment,
  HistoryEntry,
  ExtensionSettings,
} from './models';

export type WebviewMessage =
  | { type: 'webviewReady' }
  // Activation
  | { type: 'requestActivationCode' }
  | { type: 'verifyActivationCode'; payload: { code: string } }
  // Requests
  | { type: 'sendRequest'; payload: ApiRequest }
  | { type: 'cancelRequest'; payload: { requestId: string } }
  // Collections
  | { type: 'getCollections' }
  | { type: 'saveCollection'; payload: Collection }
  | { type: 'deleteCollection'; payload: { id: string } }
  | { type: 'importCollection'; payload: { content: string } }
  | { type: 'exportCollection'; payload: { id: string } }
  | { type: 'saveRequest'; payload: { collectionId: string; request: ApiRequest } }
  // Environments
  | { type: 'getEnvironments' }
  | { type: 'saveEnvironment'; payload: Environment }
  | { type: 'deleteEnvironment'; payload: { id: string } }
  | { type: 'setActiveEnvironment'; payload: { id: string | null } }
  // History
  | { type: 'getHistory' }
  | { type: 'clearHistory' }
  | { type: 'deleteHistoryEntry'; payload: { id: string } }
  // Auth
  | { type: 'oauth2GetToken'; payload: ApiRequest['auth'] }
  // Binary file
  | { type: 'selectBinaryFile' }
  // Utilities
  | { type: 'generateCurl'; payload: ApiRequest }
  | { type: 'generateAlCode'; payload: ApiRequest }
  | { type: 'exportAllData' }
  | { type: 'importAllData' }
  | { type: 'getSettings' }
  | { type: 'saveSettings'; payload: Partial<ExtensionSettings> };

export type UserRole = 'admin' | 'user';

export type ExtensionMessage =
  | { type: 'activationStatus'; payload: { activated: boolean; role: UserRole | null; expiryDate: string | null } }
  | { type: 'activationCodeSent'; payload: { success: boolean; error?: string } }
  | { type: 'activationVerified'; payload: { success: boolean; role: UserRole | null; attemptsLeft: number } }
  | { type: 'requestResult'; payload: ApiResponse }
  | { type: 'requestError'; payload: { requestId: string; error: string } }
  | { type: 'requestProgress'; payload: { requestId: string; status: string } }
  | { type: 'collections'; payload: Collection[] }
  | { type: 'environments'; payload: Environment[] }
  | { type: 'history'; payload: HistoryEntry[] }
  | { type: 'curlGenerated'; payload: { curl: string } }
  | { type: 'alCodeGenerated'; payload: { code: string } }
  | { type: 'settings'; payload: ExtensionSettings }
  | { type: 'notification'; payload: { level: 'info' | 'warning' | 'error'; message: string } }
  | { type: 'requestSaved'; payload: { success: boolean } }
  | { type: 'collectionExported'; payload: { content: string } }
  | { type: 'oauth2Token'; payload: { accessToken: string; expiresAt?: number; refreshToken?: string } }
  | { type: 'oauth2Error'; payload: { error: string } }
  | { type: 'binaryFileSelected'; payload: { fileName: string; content: string; size: number } };
