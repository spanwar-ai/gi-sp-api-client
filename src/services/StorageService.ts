import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { DATA_DIR, DATA_FILE } from '../shared/constants';

interface DataFile {
  version: string;
  collections: unknown;
  environments: unknown;
  history: unknown;
  activeEnvironment: unknown;
  settings: unknown;
}

const KEY_TO_FIELD: Record<string, keyof Omit<DataFile, 'version'>> = {
  'GISPRest.collections': 'collections',
  'GISPRest.environments': 'environments',
  'GISPRest.history': 'history',
  'GISPRest.activeEnvironment': 'activeEnvironment',
  'GISPRest.settings': 'settings',
};

const EMPTY_DATA: DataFile = {
  version: '1.0',
  collections: [],
  environments: [],
  history: [],
  activeEnvironment: null,
  settings: {},
};

export class StorageService {
  constructor(
    private _globalState: vscode.Memento,
    private workspaceState: vscode.Memento,
    private secrets: vscode.SecretStorage
  ) {}

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch { /* will surface on first write */ }
  }

  private async readFile(): Promise<DataFile> {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...EMPTY_DATA, ...parsed };
    } catch { /* corrupted or missing — return defaults */ }
    return { ...EMPTY_DATA };
  }

  private async writeFile(data: DataFile): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ── Global (file-based) ───────────────────────────

  async getGlobal<T>(key: string): Promise<T | undefined> {
    const field = KEY_TO_FIELD[key];
    if (!field) return undefined;
    const data = await this.readFile();
    return data[field] as T;
  }

  async setGlobal<T>(key: string, value: T): Promise<void> {
    const field = KEY_TO_FIELD[key];
    if (!field) return;
    const data = await this.readFile();
    (data as any)[field] = value;
    await this.writeFile(data);
  }

  async removeGlobal(key: string): Promise<void> {
    const field = KEY_TO_FIELD[key];
    if (!field) return;
    const data = await this.readFile();
    (data as any)[field] = (EMPTY_DATA as any)[field];
    await this.writeFile(data);
  }

  // ── Workspace (VS Code memento — unchanged) ───────

  async getWorkspace<T>(key: string): Promise<T | undefined> {
    return this.workspaceState.get<T>(key);
  }

  async setWorkspace<T>(key: string, value: T): Promise<void> {
    await this.workspaceState.update(key, value);
  }

  // ── Secrets (OS keychain — unchanged) ─────────────

  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  async setSecret(key: string, value: string): Promise<void> {
    await this.secrets.store(key, value);
  }

  async deleteSecret(key: string): Promise<void> {
    await this.secrets.delete(key);
  }
}
