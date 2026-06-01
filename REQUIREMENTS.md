# REQUIREMENTS — GI-SP REST & SOAP Client

> **Purpose of this file.** Single source of truth that future AI assistants (and developers) load **instead of** re-reading the whole codebase. Keep it up to date whenever architecture, models, message contracts, files, commands, or settings change.
>
> **Rule of thumb:** if a change would invalidate any "File map" row, message-type, model field, command, or setting listed here — update this file in the same commit.

---

## 1. Project Identity

| | |
|---|---|
| Display name | GI-SP REST & SOAP Client |
| Internal id | `gi-sp-rest-soap-client` (publisher: `sonu-panwar`) |
| Version | 0.1.0 — **Phase 1 (REST + SOAP)** |
| Release plan | Phase 1 = REST + SOAP. Phase 2 = GraphQL re-enabled. See [CHANGELOG.md](CHANGELOG.md). |
| Type | VS Code extension (Postman/Thunder-client–style REST client) |
| VS Code engine | `^1.85.0` |
| Node | 18+ |
| License | MIT |
| Activation | `onStartupFinished`, then auto-opens main panel |

---

## 1b. Documentation Map

| File | Audience | What's in it |
|---|---|---|
| [README.md](README.md) | End users on Marketplace | Pitch, features, FAQ, link hub |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End users (deep) | How-to for every feature, troubleshooting |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Contributors | Build, watch, architecture, conventions, 5-touch pattern |
| [docs/PUBLISHER_GUIDE.md](docs/PUBLISHER_GUIDE.md) | Publisher only | Apps Script licensing setup, pre-release checklist, packaging, vsce publish, maintenance |
| [CHANGELOG.md](CHANGELOG.md) | Everyone | Per-version notes, phase scope |
| **REQUIREMENTS.md** (this file) | **Future AI sessions** | **Single-load architectural snapshot** |
| [LICENSE](LICENSE) | Legal | MIT |

The user-facing docs (README, USER_GUIDE) avoid internal/dev jargon. The dev-facing docs (DEVELOPER_GUIDE, PUBLISHER_GUIDE) include the technical detail. This file is the densest — designed for an AI to read once instead of scanning the codebase.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│  VS Code Extension Host  (Node.js, TypeScript)             │
│  src/                                                      │
│   extension.ts  ──► DI: wires all services, registers cmds │
│   panels/MainPanel.ts  ──► WebviewPanel + message router   │
│   providers/SidebarProvider.ts ──► Activity-bar webview    │
│   services/* ──► business logic                            │
│   utils/* ──► HTML, interpolation                          │
└────────────────────┬───────────────────────────────────────┘
                     │  postMessage  (WebviewMessage ↔ ExtensionMessage)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Webview UI  (React 18 + Vite + Tailwind + Zustand)        │
│  webview-ui/src/                                           │
│   main.tsx → App.tsx → MainLayout / ActivationGate / Sidebar│
│   services/messageService.ts  ──► postMessage wrapper      │
│   hooks/useVsCodeMessage.ts   ──► receives ExtensionMessage│
│   store/*Store.ts             ──► Zustand state            │
│   components/{request,response,collections,...}            │
└────────────────────────────────────────────────────────────┘
```

**Build:** `npm run build` runs `webview-ui` (vite/tsc) then `esbuild.js` bundles `dist/extension.js`. The extension loads `webview-ui/dist/assets/index.{js,css}` into the webview via CSP-locked HTML in `utils/webviewUtils.ts`.

**Persistence:** all collections / environments / history / settings live in a single JSON file at `C:\RestApiTestData\GISP-data.json` (see `StorageService`). Only **secrets** (OAuth2 tokens, activation flag) go through VS Code `SecretStorage` → OS keychain.

---

## 3. File Map (responsibilities — one line each)

### Extension host — `src/`

| File | Responsibility |
|---|---|
| `extension.ts` | Activation entry. Instantiates every service, registers all `GISPRest.*` commands, registers `SidebarProvider`, auto-opens the main panel. |
| `panels/MainPanel.ts` | Singleton `WebviewPanel`. Routes every `WebviewMessage` → service call → `ExtensionMessage` response. Handles `sendRequest` (interpolation + auth headers + http call + history write). |
| `providers/SidebarProvider.ts` | Activity-bar `WebviewViewProvider`. Limited message router — most actions delegate to `GISPRest.open`. |
| `services/StorageService.ts` | File-based global storage (`C:\RestApiTestData\GISP-data.json`) + workspace memento + secret storage. Maps `STORAGE_KEYS.*` → JSON fields. |
| `services/HttpService.ts` | axios-based HTTP. Resolves headers / params / body / proxy / SSL / timeout / abort. Body types: json, raw, form-urlencoded, form-data (FormData), binary (base64 → Buffer), graphql. |
| `services/AuthService.ts` | All auth flows. OAuth2 client-credentials (axios + MSAL for `login.microsoftonline.com`), OAuth2 auth-code with PKCE S256 + state + local callback server on the redirect-URI port. Token cache in memory + `SecretStorage` (key `STORAGE_KEYS.TOKEN_CACHE`). |
| `services/CollectionService.ts` | CRUD on collections. Native JSON import/export + Postman v2.x import (`importPostmanCollection`). UUIDs via `uuid`. |
| `services/EnvironmentService.ts` | CRUD on environments + active-env toggle + `resolveVariables` delegating to `utils/variableInterpolation.ts`. |
| `services/HistoryService.ts` | Append-only history (newest first), capped by `GISPRest.maxHistoryEntries`. **Strips auth** before persisting. |
| `services/CurlService.ts` | Pure-function curl generator. |
| `services/AlCodeService.ts` | Business Central AL procedure generator (HttpClient + companion `AcquireAccessToken` for OAuth2 flows). |
| `services/ActivationService.ts` | Generates **two** 6-digit codes per request (`adminCode`, `userCode`). Emails BOTH to the publisher via nodemailer/SMTP (Gmail, `spanwar.ai@gmail.com`). Owner shares one — backend infers role from which code matched. 10-min expiry, 5 attempts max. On success → calls `LicenseService.registerActivation`. `getStatus()` queries the Sheet via `LicenseService` (with 24h offline cache). |
| `services/LicenseService.ts` | License check via a **Google Apps Script Web App** bound to a Google Sheet (the script owns the sheet credentials; the extension never touches Sheets API directly). `checkActivation(machineId)` GETs `SCRIPT_URL?action=check&token=...&machineId=...` and parses `{valid, role, expiryDate}`. `registerActivation(...)` GETs `?action=register&...` — the script appends a row or updates an existing one, setting `expiryDate = now + 30 days`. 24h offline cache in `SecretStorage` key `GISPRest.licenseCache`. Two embedded constants: `SCRIPT_URL` and `SHARED_TOKEN` (placeholders until publisher fills them in via [SETUP.md](SETUP.md)). |
| `shared/models.ts` | Canonical TypeScript types — see §5. |
| `shared/messages.ts` | `WebviewMessage` and `ExtensionMessage` discriminated unions — see §6. |
| `shared/constants.ts` | `DATA_DIR`, `DATA_FILE`, `STORAGE_KEYS`, `DEFAULT_*`, `CONTENT_TYPE_MAP`. |
| `utils/variableInterpolation.ts` | `{{var}}` resolver. Built-in dynamic vars: `$timestamp`, `$isoTimestamp`, `$randomInt`, `$guid`, `$randomUUID`. |
| `utils/webviewUtils.ts` | CSP-locked HTML for main panel & sidebar (loads `webview-ui/dist/assets/index.{js,css}`). |

### Webview — `webview-ui/src/`

| File | Responsibility |
|---|---|
| `main.tsx` | React entry. |
| `App.tsx` | Top-level router: sidebar vs main panel; gates main panel behind `ActivationGate` until `useUIStore.isActivated === true`. Calls `messageService.sendReady()` on mount. |
| `vscode.ts` | `acquireVsCodeApi()` wrapper. |
| `services/messageService.ts` | Typed methods that wrap `postMessage` — **the only place** the webview talks to the extension. |
| `hooks/useVsCodeMessage.ts` | Single `window.addEventListener('message', …)` that dispatches `ExtensionMessage` → the relevant Zustand store. |
| `hooks/useRequest.ts` | Send/cancel/generate-curl/generate-al wrapper around `messageService`. |
| `hooks/useEnvironmentVariables.ts` | Memoized active-env variables + local `interpolate(str)` for UI previews (does NOT include dynamic vars). |
| `store/requestStore.ts` | Open tabs (multi-tab requests), active tab id, loading state. Setters: `setMethod/Url/Headers/Params/Body/Auth`. |
| `store/responseStore.ts` | `responses: Record<requestId, ApiResponse>`, plus latest generated `curl` and `alCode`. |
| `store/collectionStore.ts` | List of collections (server-side state, mirrored). |
| `store/environmentStore.ts` | List of environments + `getActive()`. |
| `store/historyStore.ts` | List of history entries. |
| `store/uiStore.ts` | `isActivated`, sidebar/request/response tab selection, sidebar collapse, modals, **notifications queue**. |
| `types/index.ts` | Webview-side copies of `ApiRequest`/`KeyValue`/etc. **Must stay in sync** with `src/shared/models.ts`. |
| `utils/cn.ts` | Tailwind class-name joiner. |
| `utils/formatters.ts` | Formatters for response display (size, time, etc.). |
| `utils/curlParser.ts` | Parse pasted curl → ApiRequest (for the URL bar). |
| `components/ActivationGate.tsx` | 3-phase activation UI (idle / sending / sent+verifying). |
| `components/layout/MainLayout.tsx` | Sidebar + tab bar + split-pane (RequestPanel top, ResponsePanel bottom). Renders notifications. |
| `components/layout/Sidebar.tsx` | 3 tabs: Collections / History / Environments. Bottom row: Import/Export-all-data. |
| `components/layout/TabBar.tsx` | Open-request tabs. |
| `components/request/{UrlBar,RequestTabs,ParamsEditor,HeadersEditor,BodyEditor,AuthEditor,KeyValueTable}.tsx` | Request editing UI. |
| `components/response/{ResponseMeta,ResponseBody,ResponseHeaders,ResponsePanel}.tsx` | Response viewing UI. cURL & AL Code shown as response-panel tabs. |
| `components/collections/{CollectionList,CollectionForm,ImportExportModal}.tsx` | Collections sidebar + modals. |
| `components/environments/{EnvironmentManager,EnvironmentSelector,VariableEditor}.tsx` | Environment CRUD + variable table. |
| `components/history/HistoryList.tsx` | History sidebar list. |
| `components/common/{Button,Input,Select,Tabs,Modal,Spinner,Badge,EmptyState,CopyButton,JsonViewer,XmlViewer,CodeEditor}.tsx` | Generic UI primitives. |

---

## 4. Data Flow — "Send a request" (canonical example)

1. User clicks Send → `useRequest.send()` → `requestStore.setLoading(true, id)` → `messageService.sendRequest(request)`.
2. `MainPanel.handleSendRequest`:
   a. `post('requestProgress')`
   b. `environmentService.getActiveVariables()`
   c. `interpolateRequest(url, headers, params, body.content, envVars)`
   d. `authService.getAuthHeaders(request.auth)` (may trigger OAuth2 fetch)
   e. `authService.getApiKeyQueryParams(auth)` → merged into params if `addTo === 'query'`
   f. `httpService.sendRequest(...)` (axios, abortable via `cancelRequest`)
   g. `historyService.add(request, response)` — **auth stripped** before persisting
   h. `post('requestResult')` and refreshed `post('history')`
3. Webview `useVsCodeMessage` → `responseStore.setResponse(id, response)` + `requestStore.setLoading(false)`.

---

## 5. Canonical Models (`src/shared/models.ts`)

```ts
HttpMethod         = 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'HEAD'
RequestBodyType    = 'none'|'json'|'raw'|'form-data'|'form-urlencoded'|'binary'|'graphql'
AuthType           = 'none'|'basic'|'bearer'|'api-key'|'oauth2-client-credentials'|'oauth2-auth-code'|'oauth2-password'

KeyValue           { key, value, enabled, description? }
RequestBody        { type, content, formData?, graphql?{query,variables}, binaryFileName?, binarySize? }

AuthConfig (discriminated union):
  NoAuth                    { type:'none' }
  BasicAuth                 { type:'basic', username, password }
  BearerToken               { type:'bearer', token }
  ApiKeyAuth                { type:'api-key', key, value, addTo:'header'|'query' }
  OAuth2ClientCredentials   { type:'oauth2-client-credentials', clientId, clientSecret, tokenUrl, scope, resource?, accessToken?, expiresAt? }
  OAuth2AuthCode            { type:'oauth2-auth-code',         clientId, clientSecret, authUrl, tokenUrl, redirectUri, scope, resource?, accessToken?, refreshToken?, expiresAt? }
  OAuth2Password            { type:'oauth2-password',          tokenUrl, clientId, clientSecret, username, password, scope, resource?, accessToken?, refreshToken?, expiresAt? }

ApiRequest         { id, name, method, url, headers[], params[], body, auth, collectionId?, folderId? }
ApiResponse        { requestId, statusCode, statusText, headers, body, bodySize, time, contentType? }
Collection         { id, name, folders[], requests[], variables?, createdAt, updatedAt }
CollectionFolder   { id, name, requests[], folders[] }
Environment        { id, name, variables[], isActive }
HistoryEntry       { id, request (auth stripped), response (status/statusText/time/bodySize only), timestamp }
ExtensionSettings  { requestTimeout, maxHistoryEntries, followRedirects, sslVerification, maxResponseSize }
```

**Mirror in webview:** `webview-ui/src/types/index.ts` defines the same types (with a loose `AuthConfig`) plus UI-only types: `SidebarTab = 'collections'|'history'|'environments'`, `RequestTab = 'params'|'headers'|'body'|'auth'`, `ResponseTab = 'body'|'headers'|'curl'|'alcode'`.

---

## 6. Message Contracts (`src/shared/messages.ts`)

### Webview → Extension (`WebviewMessage`)

| Type | Payload |
|---|---|
| `webviewReady` | — |
| `requestActivationCode` | — |
| `verifyActivationCode` | `{code}` |
| `sendRequest` | `ApiRequest` |
| `cancelRequest` | `{requestId}` |
| `getCollections` / `getEnvironments` / `getHistory` | — |
| `saveCollection` | `Collection` |
| `deleteCollection` | `{id}` |
| `importCollection` | `{content}` |
| `exportCollection` | `{id}` |
| `saveRequest` | `{collectionId, request}` |
| `saveEnvironment` | `Environment` |
| `deleteEnvironment` | `{id}` |
| `setActiveEnvironment` | `{id|null}` |
| `clearHistory` | — |
| `deleteHistoryEntry` | `{id}` |
| `oauth2GetToken` | `AuthConfig` |
| `selectBinaryFile` | — |
| `generateCurl` / `generateAlCode` | `ApiRequest` |
| `exportAllData` / `importAllData` | — |
| `getSettings` / `saveSettings` | settings / `Partial<ExtensionSettings>` |

### Extension → Webview (`ExtensionMessage`)

| Type | Payload |
|---|---|
| `activationStatus` | `{activated, role:'admin'\|'user'\|null, expiryDate:string\|null}` |
| `activationCodeSent` | `{success, error?}` |
| `activationVerified` | `{success, role:'admin'\|'user'\|null, attemptsLeft}` |
| `requestResult` | `ApiResponse` |
| `requestError` | `{requestId, error}` |
| `requestProgress` | `{requestId, status}` |
| `collections` / `environments` / `history` | full list |
| `curlGenerated` | `{curl}` |
| `alCodeGenerated` | `{code}` |
| `settings` | `ExtensionSettings` |
| `notification` | `{level:'info'|'warning'|'error', message}` |
| `requestSaved` | `{success}` |
| `collectionExported` | `{content}` |
| `oauth2Token` | `{accessToken, expiresAt?, refreshToken?}` |
| `oauth2Error` | `{error}` |
| `binaryFileSelected` | `{fileName, content (base64), size}` |

**Rule:** every new feature requiring extension↔webview chatter adds (a) a `WebviewMessage` case, (b) optionally a paired `ExtensionMessage`, (c) a method in `webview-ui/src/services/messageService.ts`, (d) a switch case in `MainPanel.handleMessage`, (e) a switch case in `webview-ui/src/hooks/useVsCodeMessage.ts`.

---

## 7. Commands (`package.json` → `contributes.commands`)

| Command id | Title | Where registered |
|---|---|---|
| `GISPRest.open` | …: Open | `extension.ts` |
| `GISPRest.newRequest` | …: New Request | `extension.ts` (alias of open) |
| `GISPRest.saveRequest` | …: Save Request | `extension.ts` (alias of open) |
| `GISPRest.newCollection` | …: New Collection | `extension.ts` (uses `showInputBox`) |
| `GISPRest.newEnvironment` | …: New Environment | `extension.ts` (uses `showInputBox`) |
| `GISPRest.importCollection` | …: Import Collection | `extension.ts` (file dialog) |
| `GISPRest.exportCollection` | …: Export Collection | `extension.ts` (quick pick + save dialog) |
| `GISPRest.clearHistory` | …: Clear History | `extension.ts` (confirm modal) |
| `GISPRest.resetActivation` | …: Reset Activation | `extension.ts` — deletes secrets `GISPRest.activated` (legacy) / `GISPRest.role` / `GISPRest.licenseCache` / `GISPRest.tokenCache`, then offers a window reload. Use to start a clean activation flow after upgrading from the pre-licensing build. |

Views: activity-bar container id `GISPRest`, webview view id `GISPRest.sidebarView`.

---

## 8. Settings (`package.json` → `contributes.configuration`)

| Key | Default | Read by |
|---|---|---|
| `GISPRest.requestTimeout` | 30000 | `HttpService` |
| `GISPRest.maxHistoryEntries` | 500 | `HistoryService` |
| `GISPRest.followRedirects` | true | `HttpService` |
| `GISPRest.sslVerification` | true | `HttpService` |
| `GISPRest.maxResponseSize` | 10485760 | (declared; honored implicitly via response body capture) |

Also honored: `http.proxy` (from VS Code core) — `HttpService` parses and forwards to axios.

---

## 9. Storage Keys

```
DATA_DIR  = C:\RestApiTestData
DATA_FILE = C:\RestApiTestData\GISP-data.json   ← single JSON for collections / environments / history / activeEnvironment / settings

STORAGE_KEYS:
  COLLECTIONS         = 'GISPRest.collections'        (file)
  ENVIRONMENTS        = 'GISPRest.environments'       (file)
  HISTORY             = 'GISPRest.history'            (file)
  ACTIVE_ENVIRONMENT  = 'GISPRest.activeEnvironment'  (file, currently unused; isActive lives on Environment)
  SETTINGS            = 'GISPRest.settings'           (file)
  TOKEN_CACHE         = 'GISPRest.tokenCache'         (SecretStorage / OS keychain)

Plus ACTIVATION_KEY = 'GISPRest.activated' in SecretStorage.
```

---

## 10. OAuth2 Details

- **Client Credentials:** if `tokenUrl` host is `login.microsoftonline.com` or `login.microsoft.com` → MSAL (`@azure/msal-node`, `ConfidentialClientApplication.acquireTokenByClientCredential`). Else: plain `POST application/x-www-form-urlencoded` with `grant_type=client_credentials`. Optional `resource` (RFC 8707) appended.
- **Authorization Code:** PKCE S256 + random `state`. Opens browser via `vscode.env.openExternal`. **Spins up `http.createServer` on the redirect-URI port** (must be `localhost` / `127.0.0.1`; default port 8400, path `/callback`). 2-minute timeout. On callback: validates `state` (CSRF), POSTs `grant_type=authorization_code` with `code_verifier`. Refresh handled via `grant_type=refresh_token`.
- **Password (Resource Owner Password Credentials):** `POST application/x-www-form-urlencoded` with `grant_type=password` + `client_id`, optional `client_secret`, `username`, `password`, optional `scope`, optional `resource`. Cache key `pw:${clientId}:${username}:${tokenUrl}`. **Per-request UI form only** — no creds embedded anywhere.
- **Token caching:** key is `cc:${clientId}:${tokenUrl}`, `ac:${clientId}:${tokenUrl}`, or `pw:${clientId}:${username}:${tokenUrl}`. Cache entry stores `accessToken`, `expiresAt`, optional `refreshToken`. Persisted to `STORAGE_KEYS.TOKEN_CACHE` (secret).
- **History redaction:** `HistoryService.add` always overwrites `request.auth` with `{type:'none'}` before persisting.

---

## 11. Activation Flow (Important — Gates the Whole UI)

- On `webviewReady`, extension calls `ActivationService.getStatus(true)` → `LicenseService.checkActivation(vscode.env.machineId)` → reads the Google Sheet by `machineId`. If a row exists and `expiryDate` is in the future, extension posts `activationStatus {activated:true, role, expiryDate}`. Else `{activated:false, role:null, expiryDate:null}` and webview shows `ActivationGate`.
- `requestActivationCode` → `ActivationService.generateAndSendCode()` generates **two** 6-digit codes (`adminCode`, `userCode`) and emails BOTH to the publisher (`spanwar.ai@gmail.com`) via Gmail SMTP. Owner shares one of them with the user — the choice of which code = the choice of role.
- `verifyActivationCode` → matches input against `adminCode` or `userCode` to determine role. Up to 5 attempts, 10-minute expiry. On success: `LicenseService.registerActivation(machineId, hostname, username, role, code)` writes (or updates) a row in the Sheet with `expiryDate = now + 30 days`, also persists a cache entry in `SecretStorage[GISPRest.licenseCache]`. Webview unlocks.
- **Role-based UI gating:** `userRole === 'admin'` → full sidebar (Collections + History + Environments) + Import/Export data buttons. `userRole === 'user'` → sidebar shows **Collections tab only**; History, Environments, and the Import/Export bottom row are hidden. Both roles get the full URL bar + request editor + response viewer + cURL/AL code generation.
- **Expiry:** when the sheet row's `expiryDate` < now (next session, since startup re-checks), `getStatus` returns `activated:false` and the activation gate re-appears. Owner extends by editing `expiryDate` directly in the sheet.
- **Offline grace:** if Sheets is unreachable, `LicenseService` falls back to the cached license for up to 24h.
- SMTP credentials and the Google service account `client_email` / `private_key` are **embedded in the build** (in `ActivationService.ts` and `LicenseService.ts` respectively). Treat both files as sensitive when sharing diffs / commits / VSIXs.

---

## 12. Build, Run, Package

```bash
# Install (root + webview)
npm install
cd webview-ui && npm install && cd ..

# Dev
npm run watch              # esbuild extension watch
cd webview-ui && npm run dev   # vite watch (separate terminal)
# then press F5 in VS Code

# Production build
npm run build              # builds webview then bundles extension

# Package vsix
npm run package            # vsce package → gi-sp-rest-soap-client-<ver>.vsix
```

Bundled outputs:
- `dist/extension.js` (esbuild)
- `webview-ui/dist/assets/index.js` + `index.css` (vite, hashed)

---

## 13. Conventions & Constraints (don't re-derive these)

- **State direction:** Webview never owns persistent data — it always asks the extension. Stores are caches of server state.
- **Single source of truth for types:** `src/shared/models.ts`. Webview duplicates in `webview-ui/src/types/index.ts`; when adding fields, update **both** in the same change.
- **Adding a new endpoint/feature requires the 5-touch pattern** (see §6 last bullet). Skipping any step leaves it half-wired.
- **No secrets in `GISP-data.json`** — anything sensitive goes through `StorageService.setSecret`. History scrubs auth.
- **OAuth2 redirect URIs must be `localhost` / `127.0.0.1`** — enforced in `AuthService.fetchAuthCodeToken`.
- **Binary uploads** are read on the extension side (`MainPanel` `selectBinaryFile`), capped at **10 MB**, transferred as base64.
- **CSP:** webview has strict CSP (`script-src 'nonce-...'`). Don't add inline scripts or remote resources without updating `webviewUtils.ts`.
- **`MainPanel` is a singleton** — reopen calls `reveal()` instead of recreating.
- **Notifications** in the UI come from `ExtensionMessage` `notification` → `uiStore.addNotification`.

---

## 14. Common Enhancement Recipes

> Goal: when you ask for enhancement X, this section tells the assistant exactly which files to open. **No full-repo scan needed.**

### Add a new HTTP body type
1. `shared/models.ts` → extend `RequestBodyType`.
2. `webview-ui/src/types/index.ts` → mirror.
3. `webview-ui/src/components/request/BodyEditor.tsx` → add tab/editor.
4. `HttpService.sendRequest` → add `case` for serialization + content-type.
5. `CurlService.generate` and `AlCodeService.resolveBody` → cover new type.

### Add a new auth method
1. Add interface variant in `shared/models.ts` (`AuthType` + new `Auth*` interface).
2. Mirror in `webview-ui/src/types/index.ts`.
3. `AuthService.getAuthHeaders` (and `getApiKeyQueryParams` if it adds to query).
4. UI: `webview-ui/src/components/request/AuthEditor.tsx`.
5. `CurlService` (header injection) + `AlCodeService` (procedure + token helper if applicable).

### Add a new sidebar tab
1. `webview-ui/src/types/index.ts` → extend `SidebarTab`.
2. `webview-ui/src/components/layout/Sidebar.tsx` → add tab in `SIDEBAR_TABS` and render branch.
3. New component under `webview-ui/src/components/<tab>/`.
4. New store if it owns extension-mirrored state.

### Add a new VS Code command
1. `package.json` → `contributes.commands` entry.
2. `extension.ts` → `vscode.commands.registerCommand` + push to subscriptions.

### Add a new setting
1. `package.json` → `contributes.configuration.properties.GISPRest.<key>`.
2. Consumer reads via `vscode.workspace.getConfiguration('GISPRest').get('<key>', default)`.
3. If exposed to webview: extend `ExtensionSettings`, update `MainPanel.getSettings`/`saveSettings`.

### Add a new extension↔webview message
Use the **5-touch pattern** from §6.

### Change persistent shape (collections / environments / history)
1. Update `models.ts` (+ mirror in webview).
2. Update the matching service (`CollectionService`/`EnvironmentService`/`HistoryService`).
3. Consider migration — `StorageService.readFile` already spreads `{...EMPTY_DATA, ...parsed}` so additive changes are safe; deletions/renames need explicit migration.

### Hotfix a UI bug
- Symptom is in **rendering** → `webview-ui/src/components/...`.
- Symptom is in **state syncing** → `webview-ui/src/hooks/useVsCodeMessage.ts` or relevant store.
- Symptom is in **request/response data** → extension-side service.

---

## 15. Known Gaps / TODOs (update as encountered)

- AL Code binary body path has a `// TODO:` placeholder (`AlCodeService.mainProcedure`, body-type `binary`).
- `STORAGE_KEYS.ACTIVE_ENVIRONMENT` is declared but unused — `isActive` lives on each `Environment` instead.
- Postman import only covers raw JSON bodies (`extractPostmanRequests`).
- `interpolateRequest` does not currently interpolate `body.formData` keys/values or `body.graphql.query/variables` — only `body.content` (a known limitation; check before relying on env vars inside form/graphql).
- **GraphQL body type is hidden in Phase 1** but the backend code (request serialization, AL/cURL generation, type definitions) is fully intact. Re-enabling: add `{ value: 'graphql', label: 'GraphQL' }` back to `BODY_TYPES` in [webview-ui/src/components/request/BodyEditor.tsx](webview-ui/src/components/request/BodyEditor.tsx).

---

## 16. Licensing — Google Apps Script Web App (admin/user roles, 30-day periods)

**Architecture choice:** the extension talks to a Google Apps Script Web App, **not** the Sheets API directly. The Apps Script runs as the publisher's Google account, owns the sheet credentials, and exposes a simple HTTP interface. This avoids needing a GCP project, service account, or private key bundled in the VSIX. Cost: $0 forever (Apps Script Web Apps are in Google's always-free tier; 20,000 fetches/day quota — orders of magnitude over usage).

### Sheet structure (one tab named `Activations`)

| A: machineId | B: hostname | C: username | D: role | E: activationDate | F: expiryDate | G: usedCode |
|---|---|---|---|---|---|---|
| `vscode.env.machineId` of the user's machine | `os.hostname()` | `os.userInfo().username` | `admin` or `user` | ISO timestamp of activation | ISO timestamp of expiry (default `activationDate + 30 days`) | The 6-digit code that was used (audit only) |

Row 1 is the header. Data rows start at row 2.

### HTTP contract (extension ↔ Apps Script)

All requests are `GET` to `SCRIPT_URL` with a `token=SHARED_TOKEN` parameter. Apps Script responds with JSON.

| Query | Response |
|---|---|
| `?action=check&token=...&machineId=...` | `{valid:boolean, role:'admin'\|'user'\|null, expiryDate:string\|null}` |
| `?action=register&token=...&machineId=...&hostname=...&username=...&role=admin\|user&usedCode=...` | `{expiryDate:string}` — appends a row, OR overwrites the existing row matched on `machineId`. |
| (token mismatch) | `{error:'unauthorized'}` |

### Extending a user's access
Edit column F (`expiryDate`) directly in the sheet — set it to any future ISO timestamp. The next time the user's machine starts the extension, `checkActivation` reads the new value.

### Required publisher setup (one-time, before publishing)
See [SETUP.md](SETUP.md). Summary: paste the Apps Script code into the sheet's Apps Script editor, deploy as Web App ("Anyone" access, "Me" execute), copy the deployment URL + the shared token into `LicenseService.ts` lines 10–11.

### Offline / failure semantics
- First successful `checkActivation` writes `{role, expiryDate, lastVerifiedAt}` to `SecretStorage[GISPRest.licenseCache]`.
- If a later `checkActivation` call fails (network, quota, transient), `LicenseService` re-uses the cached license **only if** `Date.now() - lastVerifiedAt < 24h`. Beyond that → `activated:false`.
- If the publisher hasn't filled in `SCRIPT_URL`/`SHARED_TOKEN` yet, `LicenseService.isConfigured()` returns false and the extension falls back to the local cache (so activation still works for the publisher's own dev machine without a sheet).

### Security model
- `SHARED_TOKEN` is bundled into the VSIX. Anyone who unzips the VSIX gets the token + URL.
- Worst-case abuse: someone spams rows into the sheet. Recovery: in the Apps Script editor, change `TOKEN` and **deploy a new version** (Manage deployments → pencil → New version), then update `SHARED_TOKEN` in `LicenseService.ts` and rebuild.
- The deployment URL stays the same across versions, so users don't need to upgrade for a token rotation — but the next time their existing token is used it'll fail and the activation cache will expire after 24h.

---

## 17. How to Use This Document (for future AI assistants)

When the user asks for an enhancement / fix:

1. **Read only this file first.** Confirm the section that maps to the change (most often §3 file map or §14 recipes).
2. **Open just the listed files**, not the whole repo.
3. If you find that this doc is wrong or missing something — **update this file in the same change** so the next session pays the cost only once.
4. Skip re-reading `README.md`, `GUIDE.md`, `CHANGELOG.md` unless explicitly asked — they overlap with §1, §2, §11, §12 here.
