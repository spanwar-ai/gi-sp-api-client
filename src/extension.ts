import * as vscode from 'vscode';
import { StorageService } from './services/StorageService';
import { HttpService } from './services/HttpService';
import { AuthService } from './services/AuthService';
import { CollectionService } from './services/CollectionService';
import { EnvironmentService } from './services/EnvironmentService';
import { HistoryService } from './services/HistoryService';
import { CurlService } from './services/CurlService';
import { AlCodeService } from './services/AlCodeService';
import { ActivationService } from './services/ActivationService';
import { LicenseService } from './services/LicenseService';
import { MainPanel } from './panels/MainPanel';
import { SidebarProvider } from './providers/SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  const storageService = new StorageService(
    context.globalState,
    context.workspaceState,
    context.secrets
  );

  const httpService = new HttpService();
  const authService = new AuthService(storageService);
  const collectionService = new CollectionService(storageService);
  const environmentService = new EnvironmentService(storageService);
  const historyService = new HistoryService(storageService);
  const curlService = new CurlService();
  const alCodeService = new AlCodeService();
  const licenseService = new LicenseService(storageService);
  const activationService = new ActivationService(storageService, licenseService);

  const openPanel = () => {
    MainPanel.createOrShow(
      context.extensionUri,
      httpService, authService, collectionService,
      environmentService, historyService, curlService, alCodeService,
      activationService
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('GISPRest.open', openPanel),
    vscode.commands.registerCommand('GISPRest.newRequest', openPanel),
    vscode.commands.registerCommand('GISPRest.saveRequest', openPanel),

    vscode.commands.registerCommand('GISPRest.newCollection', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter collection name',
        placeHolder: 'My Collection',
      });
      if (name) {
        await collectionService.create(name);
        vscode.window.showInformationMessage(`Collection "${name}" created`);
      }
    }),

    vscode.commands.registerCommand('GISPRest.newEnvironment', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter environment name',
        placeHolder: 'Development',
      });
      if (name) {
        await environmentService.create(name);
        vscode.window.showInformationMessage(`Environment "${name}" created`);
      }
    }),

    vscode.commands.registerCommand('GISPRest.importCollection', async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'JSON Files': ['json'] },
      });
      if (fileUri?.[0]) {
        const content = await vscode.workspace.fs.readFile(fileUri[0]);
        const text = Buffer.from(content).toString('utf8');
        try {
          await collectionService.importCollection(text);
          vscode.window.showInformationMessage('Collection imported successfully');
        } catch (e: any) {
          vscode.window.showErrorMessage(`Import failed: ${e.message}`);
        }
      }
    }),

    vscode.commands.registerCommand('GISPRest.exportCollection', async () => {
      const collections = await collectionService.getAll();
      if (collections.length === 0) {
        vscode.window.showWarningMessage('No collections to export');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        collections.map((c) => ({ label: c.name, id: c.id })),
        { placeHolder: 'Select collection to export' }
      );

      if (selected) {
        const json = await collectionService.exportCollection(selected.id);
        const saveUri = await vscode.window.showSaveDialog({
          filters: { 'JSON Files': ['json'] },
          defaultUri: vscode.Uri.file(`${selected.label}.json`),
        });
        if (saveUri) {
          await vscode.workspace.fs.writeFile(saveUri, Buffer.from(json, 'utf8'));
          vscode.window.showInformationMessage('Collection exported successfully');
        }
      }
    }),

    vscode.commands.registerCommand('GISPRest.clearHistory', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Clear all request history?',
        { modal: true },
        'Clear'
      );
      if (confirm === 'Clear') {
        await historyService.clear();
        vscode.window.showInformationMessage('History cleared');
      }
    }),

    vscode.commands.registerCommand('GISPRest.resetActivation', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Reset activation? This clears the cached license, role, and OAuth2 tokens. You will be asked to re-activate.',
        { modal: true },
        'Reset'
      );
      if (confirm !== 'Reset') return;

      // Legacy + current keys — clear them all so a fresh activation flow runs.
      await storageService.deleteSecret('GISPRest.activated');
      await storageService.deleteSecret('GISPRest.role');
      await storageService.deleteSecret('GISPRest.licenseCache');
      await storageService.deleteSecret('GISPRest.tokenCache');

      const reload = await vscode.window.showInformationMessage(
        'Activation reset. Reload the window to re-activate.',
        'Reload Window'
      );
      if (reload === 'Reload Window') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    })
  );

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    collectionService,
    environmentService,
    historyService
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('GISPRest.sidebarView', sidebarProvider)
  );

  // Auto-open the main panel when the extension activates
  openPanel();
}

export function deactivate() {}
