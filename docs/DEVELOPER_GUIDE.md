# Developer Guide

Everything a contributor needs to build, run, and extend this extension. For day-to-day product usage see [USER_GUIDE.md](USER_GUIDE.md). For shipping a new release see [PUBLISHER_GUIDE.md](PUBLISHER_GUIDE.md). For the architectural reference snapshot consumed by AI tooling see [REQUIREMENTS.md](../REQUIREMENTS.md).

---

## Prerequisites

- Node.js **18+**
- VS Code **1.85+**
- npm (bundled with Node)

---

## Quick start

```bash
git clone <repo-url>
cd AavamiRestApi

# Install dependencies (both root and webview)
npm install
cd webview-ui && npm install && cd ..

# Build everything once
npm run build

# Open in VS Code, press F5 to launch the Extension Development Host
```

In the Extension Development Host: `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: Open**.

---

## Dev workflow (watch mode)

Two terminals running in parallel:

```bash
# Terminal 1 — extension host watch (esbuild)
npm run watch

# Terminal 2 — webview watch (vite)
cd webview-ui && npm run dev
```

Then F5 to launch the dev host. Extension-host code changes hot-reload automatically. Webview UI changes require closing and re-opening the panel.

---

## Repository layout

```
AavamiRestApi/
├── src/                          # Extension host (Node.js + TypeScript)
│   ├── extension.ts              # Activation, DI, command registration
│   ├── panels/MainPanel.ts       # Main webview panel + message router
│   ├── providers/                # Activity-bar sidebar
│   ├── services/                 # Business logic (HTTP, Auth, License, …)
│   ├── shared/                   # Models, message contracts, constants
│   └── utils/                    # Interpolation, webview HTML
│
├── webview-ui/                   # React frontend (Vite + Tailwind + Zustand)
│   └── src/
│       ├── App.tsx               # Root component
│       ├── components/           # Layout, request, response, modals, etc.
│       ├── store/                # Zustand stores (one per concern)
│       ├── hooks/                # useRequest, useVsCodeMessage, …
│       ├── services/             # messageService — postMessage wrapper
│       ├── types/                # Mirror of src/shared/models.ts
│       └── utils/                # Formatters, curl parser, classnames
│
├── docs/                         # Developer + user + publisher docs
├── resources/                    # Icons
├── package.json                  # Extension manifest
├── esbuild.js                    # Extension bundler config
└── REQUIREMENTS.md               # Internal architecture snapshot
```

---

## Architecture

Two processes, one message contract:

```
┌────────────────────────────────────────────────────────────┐
│  Extension Host (Node.js)                                  │
│  src/                                                      │
│    extension.ts → wires services, registers commands        │
│    panels/MainPanel.ts → WebviewPanel + message router      │
│    services/*.ts → HTTP, Auth, License, Storage, …          │
└────────────────────┬───────────────────────────────────────┘
                     │ postMessage  (typed WebviewMessage ↔ ExtensionMessage)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Webview UI (React)                                        │
│  webview-ui/src/                                           │
│    services/messageService.ts → typed postMessage wrapper   │
│    hooks/useVsCodeMessage.ts → dispatches to Zustand stores │
│    store/*Store.ts → state                                  │
│    components/*.tsx → UI                                    │
└────────────────────────────────────────────────────────────┘
```

**State direction:** webview never persists anything. It asks the extension on every relevant action; the extension reads/writes the local file (`C:\RestApiTestData\gi-sp-rest-soap-client-data.json`) and the OS keychain (`SecretStorage`), then replies. Webview stores are caches, not source of truth.

For a full breakdown of every file's responsibility, see [REQUIREMENTS.md §3](../REQUIREMENTS.md).

---

## How requests flow (canonical "Send" example)

1. UI: `useRequest.send()` → `messageService.sendRequest(request)`.
2. Extension `MainPanel.handleSendRequest`:
   1. Posts `requestProgress`.
   2. Resolves environment variables in URL/headers/params/body.
   3. Resolves auth headers via `AuthService.getAuthHeaders` (may trigger OAuth2 fetch).
   4. Merges API-key query params if applicable.
   5. Calls `HttpService.sendRequest` (axios, abortable).
   6. Appends to history (auth scrubbed) via `HistoryService.add`.
   7. Posts `requestResult` + refreshed `history`.
3. UI `useVsCodeMessage` → `responseStore.setResponse(id, response)`.

---

## Adding new functionality — the 5-touch pattern

Every extension↔webview feature requires:

1. **Add to message contract** — [src/shared/messages.ts](../src/shared/messages.ts) (`WebviewMessage` and/or `ExtensionMessage`).
2. **Add to typed wrapper** — [webview-ui/src/services/messageService.ts](../webview-ui/src/services/messageService.ts).
3. **Handle in extension** — switch case in [src/panels/MainPanel.ts](../src/panels/MainPanel.ts) `handleMessage`.
4. **Handle in webview** — switch case in [webview-ui/src/hooks/useVsCodeMessage.ts](../webview-ui/src/hooks/useVsCodeMessage.ts).
5. **Render in UI** — call the message in a component / hook.

Missing any of these silently breaks the feature.

See [REQUIREMENTS.md §14](../REQUIREMENTS.md) for concrete recipes per feature type (new body type, new auth method, new sidebar tab, new VS Code command, new setting).

---

## Build commands

| Command | What it does |
|---|---|
| `npm run build` | Full production build (webview + extension) |
| `npm run build:webview` | Webview only (tsc + vite) |
| `npm run build:extension` | Extension only (esbuild) |
| `npm run watch` | Watch mode for the extension |
| `cd webview-ui && npm run dev` | Watch mode for the webview |
| `npm run lint` | ESLint on `src/` |
| `npm run package` | Package as `.vsix` via `vsce` |

---

## Type safety

- Models: [src/shared/models.ts](../src/shared/models.ts) is the source of truth.
- Webview mirrors them in [webview-ui/src/types/index.ts](../webview-ui/src/types/index.ts) — **update both together** when adding fields.
- Discriminated unions on `AuthType`, `RequestBodyType`, `WebviewMessage`, `ExtensionMessage` give exhaustiveness checks in every switch.

Run both type-checks before opening a PR:

```bash
npx tsc --noEmit          # extension host
cd webview-ui && npx tsc --noEmit   # webview
```

---

## Phase 1 scope notes

GraphQL is hidden from the UI but the backend code (request serialization, AL/cURL generation, type definitions) is fully intact. Re-enabling for Phase 2 = adding one line back to `BODY_TYPES` in [webview-ui/src/components/request/BodyEditor.tsx](../webview-ui/src/components/request/BodyEditor.tsx).

See [CHANGELOG.md](../CHANGELOG.md) for the canonical phase scope.

---

## Conventions

- **No business logic in panels/providers.** Move it to a service.
- **No secrets in the data file.** Anything sensitive goes through `StorageService.setSecret` (SecretStorage → OS keychain).
- **History never stores auth.** `HistoryService.add` strips auth before persisting; do not undo this.
- **OAuth2 redirect URIs must be localhost.** Enforced in `AuthService.fetchAuthCodeToken`.
- **Binary body cap is 10 MB.** Set in `MainPanel.selectBinaryFile`.
- **CSP is locked.** No inline scripts or remote resources in the webview HTML — see [src/utils/webviewUtils.ts](../src/utils/webviewUtils.ts).
- **`MainPanel` is a singleton.** Reopen → `reveal()`, never recreate.

---

## Tests

Currently none. Adding tests is the top engineering priority before Phase 2. Recommended starting points (Vitest):

- `AuthService` — header generation for every auth type
- `HttpService.sendRequest` — body serialization for every body type, header merging, query param construction
- `EnvironmentService.resolveVariables` — `{{var}}` interpolation, dynamic variables, missing-variable behavior
- `CollectionService.importPostmanCollection` — known-good Postman v2 fixtures

---

## CI/CD

Not yet set up. Recommended GitHub Actions workflow:

1. Install dependencies (root + webview)
2. `npx tsc --noEmit` in both directories
3. `npm run build`
4. (Once tests exist) `npm test`

A single workflow file (~30 lines) catches the most common regressions.

---

## Coding style

- TypeScript strict mode
- `prettier` config follows project defaults
- No comments unless the WHY is non-obvious — let well-named identifiers do the explaining
- Prefer editing existing files over creating new ones
- Match the existing import order: stdlib → third-party → local (relative)

---

## Releasing

Building and shipping is a separate concern. See [PUBLISHER_GUIDE.md](PUBLISHER_GUIDE.md) for the full pre-release checklist, packaging, and Marketplace publishing.
