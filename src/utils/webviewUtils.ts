import * as vscode from 'vscode';
import * as crypto from 'crypto';

export function getNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function getUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  pathSegments: string[]
): vscode.Uri {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathSegments));
}

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const stylesUri = getUri(webview, extensionUri, ['webview-ui', 'dist', 'assets', 'index.css']);
  const scriptUri = getUri(webview, extensionUri, ['webview-ui', 'dist', 'assets', 'index.js']);
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;" />
    <link rel="stylesheet" type="text/css" href="${stylesUri}" />
    <title>GI-SP REST & SOAP Client</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

export function getSidebarContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const stylesUri = getUri(webview, extensionUri, ['webview-ui', 'dist', 'assets', 'index.css']);
  const scriptUri = getUri(webview, extensionUri, ['webview-ui', 'dist', 'assets', 'index.js']);
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;" />
    <link rel="stylesheet" type="text/css" href="${stylesUri}" />
    <title>GI-SP REST & SOAP Client</title>
  </head>
  <body>
    <div id="root" data-view="sidebar"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}
