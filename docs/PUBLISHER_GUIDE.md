# Publisher Guide

Everything you do **as the publisher** that an end user never sees:
1. [One-time Apps Script setup](#part-1--prepare-the-sheet-1-min) (licensing backend)
2. [Pre-release checklist](#pre-release-checklist) (run before every shipped build)
3. [Packaging a `.vsix`](#packaging-a-vsix)
4. [Publishing to the VS Code Marketplace](#publishing-to-the-vs-code-marketplace)
5. [Maintenance — extending users, rotating the token, redeploying the script](#maintenance)

---

## Licensing setup (one-time)

100% free forever. No GCP project, no service account, no JSON key file. ~5 minutes.

> ## Who runs this guide?
>
> **YOU (the publisher), ONCE, on YOUR machine.** That's it.
>
> When you finish, you run `npm run build` and the resulting `.vsix` has everything baked in. End users:
> - **Do NOT** run PowerShell.
> - **Do NOT** open Apps Script or the sheet.
> - **Do NOT** need a Google account.
> - **Do NOT** even know the Apps Script URL exists.
>
> They install the `.vsix`, click **Request Activation Code**, you email them a 6-digit code, they enter it. Done. A new row appears in your sheet automatically with their machine's unique ID and a 30-day expiry. Repeat for every new machine — same `.vsix`, same flow.
>
> If you ever change the script URL or token, you must `npm run build` and redistribute the `.vsix`. Otherwise, ship once, never touch setup again.

---

## Part 1 — Prepare the sheet (1 min)

1. Open your sheet: https://docs.google.com/spreadsheets/d/1QXcfLsUhLvucPBEsVDBHSP5NGYXeTVC7awSuuASV7fA/edit
2. Rename the bottom tab to **`Activations`** (exact name, case-sensitive).
3. In row 1, paste these 7 headers (one per column, A through G):

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `machineId` | `hostname` | `username` | `role` | `activationDate` | `expiryDate` | `usedCode` |

That's it for the sheet.

---

## Part 2 — Generate a shared token (10 seconds)

Open a terminal in VS Code and run:

```powershell
[Convert]::ToBase64String((1..32 | %{ Get-Random -Maximum 256 })) -replace '[^a-zA-Z0-9]',''
```

Copy the output. This is your **SHARED_TOKEN** — a random string only the extension and the script will know.

(Or just type 40 random characters yourself. Doesn't matter as long as it's hard to guess.)

---

## Part 3 — Paste the script into Apps Script (2 min)

1. Still in the sheet → menu **Extensions → Apps Script**.
2. Delete the placeholder `function myFunction()` code.
3. Paste this whole block:

```javascript
const SHEET_ID = '1QXcfLsUhLvucPBEsVDBHSP5NGYXeTVC7awSuuASV7fA';
const TAB = 'Activations';
const TOKEN = '3bCfRu2Rvr0Gzt72cXnlMuiMEluJXKeYXeMWv2nRLns'; // <-- same value as in LicenseService.ts
const DEFAULT_VALIDITY_DAYS = 30;

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== TOKEN) {
    return out({ error: 'unauthorized' });
  }
  const action = e.parameter.action;
  if (action === 'check') return out(handleCheck(e.parameter.machineId || ''));
  if (action === 'register') return out(handleRegister(e.parameter));
  return out({ error: 'unknown action' });
}

function handleCheck(machineId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sheet) return { error: 'tab not found: ' + TAB };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === machineId) {
      const role = rows[i][3] === 'admin' ? 'admin' : 'user';
      const expiryDate = toIso(rows[i][5]);
      const valid = expiryDate && new Date(expiryDate).getTime() > Date.now();
      return { valid: !!valid, role: role, expiryDate: expiryDate };
    }
  }
  return { valid: false, role: null, expiryDate: null };
}

function handleRegister(p) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sheet) return { error: 'tab not found: ' + TAB };
  const role = p.role === 'admin' ? 'admin' : 'user';
  const now = new Date();
  const expiry = new Date(now.getTime() + DEFAULT_VALIDITY_DAYS * 86400000);
  const newRow = [
    p.machineId || '',
    p.hostname || '',
    p.username || '',
    role,
    now.toISOString(),
    expiry.toISOString(),
    p.usedCode || '',
  ];
  const rows = sheet.getDataRange().getValues();
  let found = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.machineId)) {
      found = i + 1;
      break;
    }
  }
  if (found > 0) {
    sheet.getRange(found, 1, 1, 7).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
  }
  return { expiryDate: expiry.toISOString() };
}

function toIso(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Replace `PASTE_YOUR_SHARED_TOKEN_HERE` with the token from Part 2.
5. Save (Ctrl+S). Name the project anything, e.g. `aavami-license`.

---

## Part 4 — Deploy as Web App (1 min)

1. Top-right blue **Deploy → New deployment**.
2. Gear icon next to "Select type" → **Web app**.
3. Settings:
   - **Description:** `aavami-rest-license-v1` (anything)
   - **Execute as:** **Me** (your Google account — the script needs access to the sheet)
   - **Who has access:** **Anyone** (the TOKEN is what gates real access, not Google auth)
4. **Deploy**.
5. First time → click **Authorize access** → pick your account → "Advanced → Go to <project> (unsafe)" → **Allow** (safe; this is your own script accessing your own sheet).
6. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy.../exec`).

---

## Part 5 — Paste the 2 values into LicenseService.ts (30 sec)

Open [src/services/LicenseService.ts](src/services/LicenseService.ts), lines 10–11:

```ts
const SCRIPT_URL = '__PASTE_APPS_SCRIPT_WEBAPP_URL_HERE__';
const SHARED_TOKEN = '__PASTE_SHARED_TOKEN_HERE__';
```

Replace with:
- **`SCRIPT_URL`** → the URL from Part 4 step 6.
- **`SHARED_TOKEN`** → the same token you used in the script (Part 3).

---

## Part 6 — Rebuild and test (30 sec)

```bash
npm run build
```

Then in the dev host (F5 window):
1. Command palette → **GI-SP REST & SOAP Client: Reset Activation** → Reload Window.
2. The activation gate appears → **Request Activation Code**.
3. Check `spanwar.ai@gmail.com` inbox — email has **two codes** (Admin + User).
4. Enter the **admin code** → activated → full UI (sidebar with Collections / History / Environments).
5. Open the sheet → a new row appears with your `machineId`, `role = admin`, `expiryDate` 30 days from now.
6. Run **Reset Activation** again, then re-activate with the **user code** instead → sidebar should be hidden (Request + Response only).

---

## Extending a user's period

1. Open the sheet.
2. Find their row by `machineId`.
3. Edit column F (`expiryDate`) to any future ISO timestamp, e.g. `2027-01-01T00:00:00.000Z`.
4. Next time the user opens VS Code, the extension reads the new value.

---

## Updating the script later

Every time you change the Apps Script code, you must **deploy a new version** to make it live:
- **Deploy → Manage deployments → pencil icon next to the active deployment → Version: New version → Deploy.**

The URL stays the same — you do NOT need to update `LicenseService.ts` again.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Activation says "Code expired" immediately | Network blocked the Apps Script URL | Check the Output panel in dev host. Apps Script URLs sometimes get blocked by corporate proxies. |
| `unauthorized` response | `TOKEN` in the script doesn't match `SHARED_TOKEN` in TS | Make sure both have the same exact string. |
| `tab not found: Activations` | Tab is named differently in the sheet | Rename the tab to exactly `Activations`. |
| Activation succeeds but no row appears | Script wasn't redeployed after edits | Manage deployments → New version → Deploy. |
| `Authorization required` HTML in response | First-run auth wasn't completed | Open the Apps Script editor → click Run on `doGet` once to trigger the consent screen. |

---

## Security model

- The Web App URL is **the secret**. Anyone who has it AND the token can write rows. The token is bundled into your VSIX, so anyone who unzips the VSIX gets it.
- Worst case: someone abuses the script to spam your sheet. Recovery: deploy a new version with a new token, rebuild the extension.
- Daily quota for Apps Script Web Apps: 20,000 URL fetches per day on consumer accounts — orders of magnitude more than this extension needs.

---

## Pre-release checklist

Run through this before every shipped build:

- [ ] `npm install` is clean in both root and `webview-ui/`
- [ ] `npx tsc --noEmit` passes in both root and `webview-ui/`
- [ ] `npm run build` succeeds with no warnings
- [ ] Reload the dev host (F5), run **Reset Activation**, do a full activation round-trip with both admin and user codes
- [ ] Smoke-test 1 OAuth2 flow (e.g. Authorization Code against a known IdP)
- [ ] Bump version in `package.json` (root) and `webview-ui/package.json`
- [ ] Add a [CHANGELOG.md](../CHANGELOG.md) entry under the new version
- [ ] Commit and tag: `git tag v0.1.0 && git push --tags`

---

## Packaging a `.vsix`

```bash
npm run package
```

Produces `gi-sp-rest-soap-client-<version>.vsix` in the project root. To install locally for testing:

```bash
code --install-extension gi-sp-rest-soap-client-0.1.0.vsix --force
```

Then reload VS Code. The extension activates on startup.

---

## Publishing to the VS Code Marketplace

### One-time setup
1. Create a publisher at https://marketplace.visualstudio.com/manage (free).
2. Get a Personal Access Token from https://dev.azure.com (the Marketplace uses Azure DevOps PATs). Scope: **Marketplace (Publish)**.
3. Install vsce: `npm install -g @vscode/vsce`.
4. Log in: `vsce login sonu-panwar` — paste the PAT when asked.

### Every release
```bash
# Build first
npm run build

# Publish (bumps the version on the Marketplace using the version in package.json)
vsce publish
```

The new version goes live within a few minutes. If the Marketplace rejects the upload, check:
- `repository` / `bugs` URLs are reachable (recommended in `package.json`)
- `icon` path exists (resources/icon.png — already there)
- `displayName`, `description`, `categories` are filled in
- No file in the package exceeds 10 MB
- No private keys are accidentally bundled (the Apps Script token is acceptable; an Azure / GCP private key is not)

### Phased rollout convention

| Marketplace version | What it represents |
|---|---|
| `0.1.x` | Phase 1 — REST + SOAP |
| `0.2.x` | Phase 2 — GraphQL re-enabled |
| `0.x.x` | Future protocol additions (WebSocket, gRPC, …) |
| `1.0.0` | First stable release with all planned protocols |

---

## Maintenance

### Extending a user's 30-day window
1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/1QXcfLsUhLvucPBEsVDBHSP5NGYXeTVC7awSuuASV7fA/edit).
2. Find their row by `machineId` or `hostname`.
3. Edit column F (`expiryDate`) to any future ISO timestamp, e.g. `2027-01-01T00:00:00.000Z`.

That's it. Next time the user opens VS Code, the extension reads the new value (within 24 hours offline-grace, immediately if online).

### Rotating the shared token
1. Apps Script editor → change the `TOKEN` constant → **Deploy → Manage deployments → pencil → New version → Deploy**.
2. Update `SHARED_TOKEN` in [src/services/LicenseService.ts](../src/services/LicenseService.ts) to match.
3. `npm run build && vsce publish` to ship a new version.

Existing users on the old token will get `unauthorized` on their next sheet check; their cache expires after 24h, at which point they re-activate on the new build.

### Rotating the SMTP password
1. Generate a new app password at https://myaccount.google.com/apppasswords for `spanwar.ai@gmail.com`.
2. Update `SMTP_PASSWORD` in [src/services/ActivationService.ts](../src/services/ActivationService.ts).
3. `npm run build && vsce publish`.

### Revoking a specific user
1. Find their row in the Google Sheet.
2. Set `expiryDate` to a past date (e.g. `2020-01-01T00:00:00.000Z`).
3. On their next sheet check (next session, or after 24h if they're offline), the extension will revert to the activation gate.
