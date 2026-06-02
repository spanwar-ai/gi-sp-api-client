# GI-SP API Client

> **A REST + SOAP + OAuth2 API client for Visual Studio Code.** A Postman / Thunder Client / Insomnia alternative — fully inside your editor, with first-class support for Microsoft Dynamics 365 Business Central AL code generation.

![Main panel — request editor and response viewer](resources/screenshots/Main%20Screen%20after%20activation.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue.svg)](https://code.visualstudio.com/)
[![Phase](https://img.shields.io/badge/release-Phase%201.5%20%E2%80%94%20beta-orange.svg)](#release-phases)

---

## Release phases

This extension ships in phases — narrow scope first, expanded protocols in later releases:

| Phase | Version | Scope |
|---|---|---|
| Phase 1 | `0.1.x` | REST + SOAP, OAuth2 (3 flows), collections, environments, history, cURL + AL code generation |
| **Phase 1.5 (you are here)** | `0.2.x` | Adds 1-month trial activation, environment-level auth, License Status panel, expiry warning banner, status-bar widget |
| Phase 2 (planned) | `0.3.x` | GraphQL body type + query/variables editors |
| Future | `0.x` | WebSocket, gRPC, request scripting (under consideration) |

---

## Why this extension?

- **Built into VS Code** — no second app, no context switch, no Electron-on-top-of-Electron.
- **REST + SOAP** in one tool — REST with full method / body / header control, SOAP via the Raw / XML body with a one-click envelope template.
- **Real OAuth2** — Client Credentials (with MSAL for Microsoft endpoints), Authorization Code with PKCE + state, and **Resource Owner Password grant** — the one nobody else implements.
- **Business Central / AL code generation** — turn any working request into a copy-paste-ready AL `HttpClient` procedure, including a companion `AcquireAccessToken` for OAuth2 flows.
- **Collections and environments** that survive restarts (file-based storage, not memento), with `{{variable}}` interpolation everywhere.
- **Multipart uploads, binary uploads, Postman import** — and a real cURL generator.
- **Private by default** — every request, response, and secret stays on your machine. No telemetry. OAuth2 tokens live in the OS keychain via VS Code SecretStorage.

---

## Quick start

1. Click the extension icon in the Activity Bar (or open the Command Palette → `GI-SP API Client: Open`).
2. On first run you'll see the activation screen. Pick one:
   - **Activate Trial Version (1 Month)** — instant, no email, no code required. Grants `user`-role access for 30 days. One trial per machine.
   - **Request Activation Code** — email the publisher to receive a 6-digit code (`Admin` or `User` role).

   ![Activation screen — trial vs activation code](resources/screenshots/Activation%20Screen.png)
3. Type a URL → pick a method → hit **Send**. That's it.
4. Save useful requests into a Collection. Define environments (Dev / Staging / Prod) and reference variables with `{{baseUrl}}`, `{{apiKey}}`, etc.
5. Watch the bottom-right status bar — `🔑 GI-SP: <role> · <days>d` tells you how long until your license expires. Click it for the License Status panel.

---

## Features

### HTTP requests (REST + SOAP)
- All methods: **GET / POST / PUT / PATCH / DELETE / OPTIONS / HEAD**
- Body types: **JSON, Raw / XML / SOAP / Text, Form URL Encoded, Form Data (multipart), Binary file upload** (up to 10 MB)
- **One-click SOAP envelope template** inserted into the Raw editor when starting a new request — handle SOAPAction via a standard header row
- Headers and query params with per-row enable/disable toggles
- Honors VS Code's `http.proxy` setting
- Configurable timeout, SSL verification, and redirect behavior

### Authentication (6 methods)
| Method | Notes |
|---|---|
| **No Auth** | — |
| **Basic Auth** | Username + password, Base64-encoded |
| **Bearer Token** | Paste a token |
| **API Key** | Header or query parameter |
| **OAuth2 — Client Credentials** | Plain token POST, or MSAL for `login.microsoftonline.com` |
| **OAuth2 — Authorization Code** | Browser flow with PKCE (S256) + state, local callback server |
| **OAuth2 — Password Grant** | Resource Owner Password Credentials — for legacy/private IdPs |

Optional `resource` parameter (RFC 8707) on every OAuth2 flow. Token status with live expiry countdown. All tokens cached in the OS keychain.

### Collections & environments
- Folder structure inside collections
- Save any open request to a collection in one click
- Import / export collections in **native JSON** or **Postman v2** format
- Multiple named environments — variables defined once, reused everywhere with `{{var}}`
- **Environment-level auth** — bake Bearer / API Key / OAuth2 credentials into Dev / Staging / Prod once; auto-applied to any request that doesn't override (request-level auth always wins)
- **Environment selector on the URL bar** (admin only) — switch active environment without opening the sidebar
- Built-in dynamic variables: `$timestamp`, `$isoTimestamp`, `$randomInt`, `$guid`, `$randomUUID`

![Environment editor — default OAuth2 Client Credentials auth](resources/screenshots/Enviorment%20with%20Auth2.0.png)

### License & activation
- **Activate Trial Version** — instant 1-month `user`-role trial; one-time per machine
- **License Status panel** — shows role, plan (Trial / Activated), expiry date, country, city, and activation code used. Open from the status bar or via `GI-SP API Client: View License`
- **Status bar widget** — `🔑 GI-SP: <role> · <days>d`, turns orange ≤7 days, red ≤3
- **Expiry warning banner** — appears at the top of the main panel when ≤7 days remain
- 30-day validity per machine; the publisher can extend any time by editing the central sheet
- 24-hour offline grace period

### Response viewer
- JSON tree view with collapse / expand
- XML pretty-printing
- Headers table
- Status code, response time, body size at a glance
- One-click copy to clipboard

### Code generation
- **cURL** — copy the exact request as a `curl` command
- **AL Code (Business Central)** — generate a complete AL procedure with:
  - `HttpClient` / `HttpRequestMessage` / `HttpResponseMessage` setup
  - Headers, auth, and body pre-filled
  - Companion `AcquireAccessToken` procedure for OAuth2 (covers all 3 flows)
  - `SecretText` used correctly for sensitive values

![AL Code tab — Generate AL Code button](resources/screenshots/Generate%20AL%20Code.png)

### History
- Automatic, up to 500 entries (configurable)
- Click to reload any past request into a new tab
- Auth credentials **never** persisted in history

### Data storage
- Local file at `C:\RestApiTestData\<your-data>.json` — easy to back up, sync, or share
- **Import / Export all data** buttons in the sidebar
- OAuth2 tokens isolated in `SecretStorage` (OS keychain), never written to the file

---

## Commands (Command Palette → `Ctrl+Shift+P`)

| Command | What it does |
|---|---|
| `GI-SP API Client: Open` | Open the main panel |
| `GI-SP API Client: New Request` | New request tab |
| `GI-SP API Client: Save Request` | Save current request to a collection |
| `GI-SP API Client: New Collection` | Create a collection |
| `GI-SP API Client: New Environment` | Create an environment |
| `GI-SP API Client: Import Collection` | Import JSON / Postman v2 |
| `GI-SP API Client: Export Collection` | Export a collection to JSON |
| `GI-SP API Client: Clear History` | Delete all history entries |
| `GI-SP API Client: View License` | Open the License Status panel |
| `GI-SP API Client: Reset Activation` | Clear cached license; useful when switching machines |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `giSpApi.requestTimeout` | `30000` | Request timeout in milliseconds |
| `giSpApi.maxHistoryEntries` | `500` | Maximum history entries kept |
| `giSpApi.followRedirects` | `true` | Follow HTTP 3xx redirects |
| `giSpApi.sslVerification` | `true` | Verify SSL certificates |
| `giSpApi.maxResponseSize` | `10485760` | Max response body size (bytes; default 10 MB) |

---

## Privacy & security

- **No telemetry.** No analytics. No phone-home except the one-time activation check.
- **OAuth2 tokens** stored in OS keychain via VS Code SecretStorage (Windows Credential Manager, macOS Keychain, Linux Secret Service).
- **PKCE (S256) + state** on the Authorization Code flow — protection against code interception and CSRF.
- **Localhost-only redirect URIs** on OAuth2 callbacks.
- **Content Security Policy** enforced on every webview.
- **History never stores auth credentials** — auth is stripped before persisting.

---

## Requirements

- Visual Studio Code **1.85** or newer
- Internet access on first activation (then offline-friendly for 24h)

---

## Documentation

| | |
|---|---|
| 📖 | [User Guide](docs/USER_GUIDE.md) — how to send requests, set up auth, use collections, etc. |
| 📝 | [Release notes](CHANGELOG.md) — what changed in each version |

---

## FAQ

**Q: How do I try it without contacting the publisher?**
A: Click **Activate Trial Version** on first launch. You get 30 days of `user`-role access, instantly, no email exchange. One trial per machine — after it expires, you'll need a real code.

**Q: Why do I need an activation code (after the trial)?**
A: This extension is owner-distributed. You request a code from the publisher (the email arrives within minutes). The activation is valid for 30 days and can be extended.

**Q: Why two codes (Admin vs User)?**
A: Admin gets the full sidebar (Collections, History, Environments). User gets Collections only — useful when you want to share saved requests with teammates but keep their own request history separate.

**Q: I activated my environment with OAuth2 but my request shows "No Auth" in the Auth tab — why does it still work?**
A: Environment-level auth auto-applies when a request's own auth is "No Auth". An **Env** badge appears in the Auth tab while this is happening. Set any auth on the request itself to override.

**Q: Does this work offline?**
A: Yes — for 24 hours after the last successful license check. After that, the activation gate reappears and you'll need network connectivity to re-verify.

**Q: Does my data leave my machine?**
A: No. All requests, responses, and collections stay local at `C:\RestApiTestData\gi-sp-api-client-data.json`. OAuth2 tokens go to the OS keychain (never the file). The only network calls this extension makes (other than your own API requests) are: (1) a small activation check to a Google Apps Script the publisher controls — sending only machine ID, hostname, and OS username; and (2) for trial activation only, a one-time `ipapi.co` lookup to record country / city of the activation.

**Q: Where's GraphQL?**
A: Hidden in Phase 1.5 (this release). Scheduled for Phase 2 — the backend code is already in place; only the UI dropdown is gated.

**Q: Will Postman collections import?**
A: Yes — `Import Collection` accepts Postman v2 JSON. Note: complex Postman features (auth, folder hierarchy, environments) are partially mapped; raw JSON bodies and basic structure work.

**Q: Can I extend my 30-day window?**
A: Yes — email the publisher at **`spdynamics365@gmail.com`** with your machine ID (visible in the License Status panel) and ask for an extension. The publisher updates it on their side; your access continues without you having to re-activate.

---

## License

[MIT](LICENSE) © GI-SP (Sonu Panwar)

---

## Issues, ideas, contributions

Open an issue or PR on the project repository. For activation issues, license extensions, or any licensing questions, email the publisher at **`spdynamics365@gmail.com`**.
