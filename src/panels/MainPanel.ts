import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { getWebviewContent } from '../utils/webviewUtils';
import type { WebviewMessage, ExtensionMessage } from '../shared/messages';
import type { HttpService } from '../services/HttpService';
import type { AuthService } from '../services/AuthService';
import type { CollectionService } from '../services/CollectionService';
import type { EnvironmentService } from '../services/EnvironmentService';
import type { HistoryService } from '../services/HistoryService';
import type { CurlService } from '../services/CurlService';
import type { AlCodeService } from '../services/AlCodeService';
import type { ActivationService } from '../services/ActivationService';
import { interpolateRequest } from '../utils/variableInterpolation';
import { DATA_DIR, DATA_FILE } from '../shared/constants';

export class MainPanel {
  private static instance: MainPanel | undefined;
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
    private httpService: HttpService,
    private authService: AuthService,
    private collectionService: CollectionService,
    private environmentService: EnvironmentService,
    private historyService: HistoryService,
    private curlService: CurlService,
    private alCodeService: AlCodeService,
    private activationService: ActivationService
  ) {
    this.panel = panel;
    this.panel.webview.html = getWebviewContent(this.panel.webview, this.extensionUri);
    this.setupMessageListener();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    httpService: HttpService,
    authService: AuthService,
    collectionService: CollectionService,
    environmentService: EnvironmentService,
    historyService: HistoryService,
    curlService: CurlService,
    alCodeService: AlCodeService,
    activationService: ActivationService
  ): MainPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (MainPanel.instance) {
      MainPanel.instance.panel.reveal(column);
      return MainPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      'aavamiRest.mainPanel',
      'GI-SP REST & SOAP Client',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist')],
      }
    );

    MainPanel.instance = new MainPanel(
      panel, extensionUri, httpService, authService,
      collectionService, environmentService, historyService, curlService, alCodeService,
      activationService
    );
    return MainPanel.instance;
  }

  private post(message: ExtensionMessage): void {
    try {
      this.panel.webview.postMessage(message);
    } catch {
      // Panel may have been disposed
    }
  }

  private setupMessageListener(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          await this.handleMessage(message);
        } catch (error: any) {
          this.post({
            type: 'notification',
            payload: { level: 'error', message: error.message || 'An error occurred' },
          });
        }
      },
      null,
      this.disposables
    );
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case 'webviewReady': {
        const status = await this.activationService.getStatus(true);
        this.post({
          type: 'activationStatus',
          payload: {
            activated: status.activated,
            role: status.role,
            expiryDate: status.expiryDate,
          },
        });
        if (status.activated) {
          await this.sendInitialData();
        }
        return;
      }

      // ── Activation ────────────────────────────────
      case 'requestActivationCode':
        try {
          await this.activationService.generateAndSendCode();
          this.post({ type: 'activationCodeSent', payload: { success: true } });
        } catch (err: any) {
          this.post({ type: 'activationCodeSent', payload: { success: false, error: err.message } });
        }
        return;

      case 'verifyActivationCode': {
        const result = await this.activationService.verifyCode(msg.payload.code);
        this.post({
          type: 'activationVerified',
          payload: {
            success: result.success,
            role: result.role,
            attemptsLeft: result.attemptsLeft,
          },
        });
        if (result.success) {
          await this.sendInitialData();
        }
        return;
      }

      // ── Requests ──────────────────────────────────
      case 'sendRequest':
        return this.handleSendRequest(msg);

      case 'cancelRequest':
        this.httpService.cancelRequest(msg.payload.requestId);
        return;

      // ── Collections ───────────────────────────────
      case 'getCollections':
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        return;

      case 'saveCollection':
        await this.collectionService.save(msg.payload);
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        return;

      case 'deleteCollection':
        await this.collectionService.delete(msg.payload.id);
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        return;

      case 'saveRequest':
        await this.collectionService.addRequest(msg.payload.collectionId, msg.payload.request);
        this.post({ type: 'requestSaved', payload: { success: true } });
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        return;

      case 'importCollection':
        await this.collectionService.importCollection(msg.payload.content);
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        this.post({ type: 'notification', payload: { level: 'info', message: 'Collection imported successfully' } });
        return;

      case 'exportCollection': {
        const exported = await this.collectionService.exportCollection(msg.payload.id);
        this.post({ type: 'collectionExported', payload: { content: exported } });
        return;
      }

      // ── Environments ──────────────────────────────
      case 'getEnvironments':
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        return;

      case 'saveEnvironment':
        await this.environmentService.save(msg.payload);
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        return;

      case 'deleteEnvironment':
        await this.environmentService.delete(msg.payload.id);
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        return;

      case 'setActiveEnvironment':
        await this.environmentService.setActive(msg.payload.id);
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        return;

      // ── History ────────────────────────────────────
      case 'getHistory':
        this.post({ type: 'history', payload: await this.historyService.getAll() });
        return;

      case 'clearHistory':
        await this.historyService.clear();
        this.post({ type: 'history', payload: [] });
        return;

      case 'deleteHistoryEntry':
        await this.historyService.delete(msg.payload.id);
        this.post({ type: 'history', payload: await this.historyService.getAll() });
        return;

      // ── Auth ───────────────────────────────────────
      case 'oauth2GetToken':
        try {
          const tokenResult = await this.authService.acquireOAuth2Token(msg.payload);
          this.post({ type: 'oauth2Token', payload: tokenResult });
        } catch (error: any) {
          this.post({ type: 'oauth2Error', payload: { error: error.message } });
        }
        return;

      // ── Binary file ─────────────────────────────────
      case 'selectBinaryFile': {
        const maxSize = 10 * 1024 * 1024; // 10 MB
        try {
          const picked = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            openLabel: 'Select File',
          });
          if (picked?.[0]) {
            const raw = await vscode.workspace.fs.readFile(picked[0]);
            if (raw.byteLength > maxSize) {
              this.post({ type: 'notification', payload: { level: 'error', message: `File too large (${(raw.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` } });
              return;
            }
            const base64 = Buffer.from(raw).toString('base64');
            const fileName = picked[0].path.split('/').pop() || 'file';
            this.post({ type: 'binaryFileSelected', payload: { fileName, content: base64, size: raw.byteLength } });
          }
        } catch (err: any) {
          this.post({ type: 'notification', payload: { level: 'error', message: 'Failed to read file: ' + err.message } });
        }
        return;
      }

      // ── Utilities ──────────────────────────────────
      case 'generateCurl': {
        const authHeaders = await this.authService.getAuthHeaders(msg.payload.auth);
        const curl = this.curlService.generate(msg.payload, authHeaders);
        this.post({ type: 'curlGenerated', payload: { curl } });
        return;
      }

      case 'generateAlCode': {
        const alCode = this.alCodeService.generate(msg.payload);
        this.post({ type: 'alCodeGenerated', payload: { code: alCode } });
        return;
      }

      // ── Data Import / Export ───────────────────────
      case 'exportAllData': {
        try {
          const content = await fs.readFile(DATA_FILE, 'utf-8').catch(() => '');
          if (!content) {
            this.post({ type: 'notification', payload: { level: 'warning', message: 'No data file found yet. Send a request or save a collection first.' } });
            return;
          }
          const saveUri = await vscode.window.showSaveDialog({
            filters: { 'JSON Files': ['json'] },
            defaultUri: vscode.Uri.file('gi-sp-rest-soap-client-data.json'),
          });
          if (saveUri) {
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf-8'));
            this.post({ type: 'notification', payload: { level: 'info', message: 'Data exported successfully' } });
          }
        } catch (err: any) {
          this.post({ type: 'notification', payload: { level: 'error', message: 'Export failed: ' + err.message } });
        }
        return;
      }

      case 'importAllData': {
        try {
          const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'JSON Files': ['json'] },
          });
          if (fileUri?.[0]) {
            const raw = await vscode.workspace.fs.readFile(fileUri[0]);
            const text = Buffer.from(raw).toString('utf-8');
            const data = JSON.parse(text);
            if (!data.version) data.version = '1.0';
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
            await this.sendInitialData();
            this.post({ type: 'notification', payload: { level: 'info', message: 'Data imported successfully' } });
          }
        } catch (err: any) {
          this.post({ type: 'notification', payload: { level: 'error', message: 'Import failed: ' + err.message } });
        }
        return;
      }

      case 'getSettings': {
        const cfg = vscode.workspace.getConfiguration('aavamiRest');
        this.post({
          type: 'settings',
          payload: {
            requestTimeout: cfg.get<number>('requestTimeout', 30000),
            maxHistoryEntries: cfg.get<number>('maxHistoryEntries', 500),
            followRedirects: cfg.get<boolean>('followRedirects', true),
            sslVerification: cfg.get<boolean>('sslVerification', true),
            maxResponseSize: cfg.get<number>('maxResponseSize', 10485760),
          },
        });
        return;
      }

      case 'saveSettings': {
        const settings = vscode.workspace.getConfiguration('aavamiRest');
        for (const [key, value] of Object.entries(msg.payload)) {
          await settings.update(key, value, vscode.ConfigurationTarget.Global);
        }
        return;
      }
    }
  }

  private async sendInitialData(): Promise<void> {
    const [collections, environments, history] = await Promise.all([
      this.collectionService.getAll(),
      this.environmentService.getAll(),
      this.historyService.getAll(),
    ]);
    this.post({ type: 'collections', payload: collections });
    this.post({ type: 'environments', payload: environments });
    this.post({ type: 'history', payload: history });
  }

  private async handleSendRequest(
    msg: Extract<WebviewMessage, { type: 'sendRequest' }>
  ): Promise<void> {
    const request = msg.payload;

    this.post({
      type: 'requestProgress',
      payload: { requestId: request.id, status: 'Sending...' },
    });

    const envVariables = await this.environmentService.getActiveVariables();

    const resolved = interpolateRequest(
      request.url,
      request.headers,
      request.params,
      request.body.content,
      envVariables
    );

    const authHeaders = await this.authService.getAuthHeaders(request.auth);

    const apiKeyParams = this.authService.getApiKeyQueryParams(request.auth);
    if (Object.keys(apiKeyParams).length > 0) {
      for (const [key, value] of Object.entries(apiKeyParams)) {
        resolved.params.push({ key, value, enabled: true });
      }
    }

    try {
      const response = await this.httpService.sendRequest(
        request,
        resolved.url,
        resolved.headers,
        resolved.params,
        resolved.bodyContent,
        authHeaders
      );

      await this.historyService.add(request, response);
      this.post({ type: 'requestResult', payload: response });
      this.post({ type: 'history', payload: await this.historyService.getAll() });
    } catch (error: any) {
      this.post({
        type: 'requestError',
        payload: { requestId: request.id, error: error.message },
      });
    }
  }

  private dispose(): void {
    MainPanel.instance = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}
