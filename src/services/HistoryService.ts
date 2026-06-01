import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import type { HistoryEntry, ApiRequest, ApiResponse } from '../shared/models';
import { STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../shared/constants';
import type { StorageService } from './StorageService';

export class HistoryService {
  constructor(private storage: StorageService) {}

  async getAll(): Promise<HistoryEntry[]> {
    return (await this.storage.getGlobal<HistoryEntry[]>(STORAGE_KEYS.HISTORY)) || [];
  }

  async add(request: ApiRequest, response: ApiResponse): Promise<HistoryEntry> {
    const entries = await this.getAll();

    const entry: HistoryEntry = {
      id: uuidv4(),
      request: {
        ...request,
        auth: { type: 'none' }, // never persist secrets in history
      },
      response: {
        statusCode: response.statusCode,
        statusText: response.statusText,
        time: response.time,
        bodySize: response.bodySize,
      },
      timestamp: new Date().toISOString(),
    };

    entries.unshift(entry);

    const maxEntries = vscode.workspace
      .getConfiguration('aavamiRest')
      .get<number>('maxHistoryEntries', MAX_HISTORY_ENTRIES);

    if (entries.length > maxEntries) {
      entries.length = maxEntries;
    }

    await this.storage.setGlobal(STORAGE_KEYS.HISTORY, entries);
    return entry;
  }

  async delete(id: string): Promise<void> {
    const entries = await this.getAll();
    const filtered = entries.filter((e) => e.id !== id);
    await this.storage.setGlobal(STORAGE_KEYS.HISTORY, filtered);
  }

  async clear(): Promise<void> {
    await this.storage.setGlobal(STORAGE_KEYS.HISTORY, []);
  }
}
