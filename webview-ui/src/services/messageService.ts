import vscode from '../vscode';
import type {
  ApiRequest,
  Collection,
  Environment,
  AuthConfig,
  ExtensionSettings,
} from '../types';

export const messageService = {
  sendReady() {
    vscode.postMessage({ type: 'webviewReady' });
  },

  requestActivationCode() {
    vscode.postMessage({ type: 'requestActivationCode' });
  },

  verifyActivationCode(code: string) {
    vscode.postMessage({ type: 'verifyActivationCode', payload: { code } });
  },

  sendRequest(request: ApiRequest) {
    vscode.postMessage({ type: 'sendRequest', payload: request });
  },

  cancelRequest(requestId: string) {
    vscode.postMessage({ type: 'cancelRequest', payload: { requestId } });
  },

  getCollections() {
    vscode.postMessage({ type: 'getCollections' });
  },

  saveCollection(collection: Collection) {
    vscode.postMessage({ type: 'saveCollection', payload: collection });
  },

  deleteCollection(id: string) {
    vscode.postMessage({ type: 'deleteCollection', payload: { id } });
  },

  importCollection(content: string) {
    vscode.postMessage({ type: 'importCollection', payload: { content } });
  },

  exportCollection(id: string) {
    vscode.postMessage({ type: 'exportCollection', payload: { id } });
  },

  saveRequest(collectionId: string, request: ApiRequest) {
    vscode.postMessage({ type: 'saveRequest', payload: { collectionId, request } });
  },

  getEnvironments() {
    vscode.postMessage({ type: 'getEnvironments' });
  },

  saveEnvironment(environment: Environment) {
    vscode.postMessage({ type: 'saveEnvironment', payload: environment });
  },

  deleteEnvironment(id: string) {
    vscode.postMessage({ type: 'deleteEnvironment', payload: { id } });
  },

  setActiveEnvironment(id: string | null) {
    vscode.postMessage({ type: 'setActiveEnvironment', payload: { id } });
  },

  getHistory() {
    vscode.postMessage({ type: 'getHistory' });
  },

  clearHistory() {
    vscode.postMessage({ type: 'clearHistory' });
  },

  deleteHistoryEntry(id: string) {
    vscode.postMessage({ type: 'deleteHistoryEntry', payload: { id } });
  },

  oauth2GetToken(auth: AuthConfig) {
    vscode.postMessage({ type: 'oauth2GetToken', payload: auth });
  },

  generateCurl(request: ApiRequest) {
    vscode.postMessage({ type: 'generateCurl', payload: request });
  },

  generateAlCode(request: ApiRequest) {
    vscode.postMessage({ type: 'generateAlCode', payload: request });
  },

  selectBinaryFile() {
    vscode.postMessage({ type: 'selectBinaryFile' });
  },

  exportAllData() {
    vscode.postMessage({ type: 'exportAllData' });
  },

  importAllData() {
    vscode.postMessage({ type: 'importAllData' });
  },

  getSettings() {
    vscode.postMessage({ type: 'getSettings' });
  },

  saveSettings(settings: Partial<ExtensionSettings>) {
    vscode.postMessage({ type: 'saveSettings', payload: settings });
  },
};
