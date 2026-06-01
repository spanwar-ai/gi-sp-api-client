import * as vscode from 'vscode';
import { getSidebarContent } from '../utils/webviewUtils';
import type { WebviewMessage, ExtensionMessage } from '../shared/messages';
import type { CollectionService } from '../services/CollectionService';
import type { EnvironmentService } from '../services/EnvironmentService';
import type { HistoryService } from '../services/HistoryService';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private collectionService: CollectionService,
    private environmentService: EnvironmentService,
    private historyService: HistoryService
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'dist')],
    };

    webviewView.webview.html = getSidebarContent(webviewView.webview, this.extensionUri);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      try {
        await this.handleMessage(message);
      } catch (error: any) {
        this.post({
          type: 'notification',
          payload: { level: 'error', message: error.message || 'An error occurred' },
        });
      }
    });
  }

  private post(message: ExtensionMessage): void {
    this.view?.webview.postMessage(message);
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case 'webviewReady': {
        const [collections, environments, history] = await Promise.all([
          this.collectionService.getAll(),
          this.environmentService.getAll(),
          this.historyService.getAll(),
        ]);
        this.post({ type: 'collections', payload: collections });
        this.post({ type: 'environments', payload: environments });
        this.post({ type: 'history', payload: history });
        break;
      }

      case 'getCollections':
        this.post({ type: 'collections', payload: await this.collectionService.getAll() });
        break;

      case 'getEnvironments':
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        break;

      case 'setActiveEnvironment':
        await this.environmentService.setActive(msg.payload.id);
        this.post({ type: 'environments', payload: await this.environmentService.getAll() });
        break;

      case 'getHistory':
        this.post({ type: 'history', payload: await this.historyService.getAll() });
        break;

      default:
        vscode.commands.executeCommand('GISPRest.open');
        break;
    }
  }
}
