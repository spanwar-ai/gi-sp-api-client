# GI-SP REST & SOAP Client

> **A REST + SOAP + OAuth2 API client for Visual Studio Code.** A Postman / Thunder Client / Insomnia alternative — fully inside your editor, with first-class support for Microsoft Dynamics 365 Business Central AL code generation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue.svg)](https://code.visualstudio.com/)
[![Phase](https://img.shields.io/badge/release-Phase%201%20%E2%80%94%20alpha-orange.svg)](#release-phases)

---

## Release phases

This extension ships in phases — narrow scope first, expanded protocols in later releases:

| Phase | Version | Scope |
|---|---|---|
| **Phase 1 (you are here)** | `0.1.x` | **REST + SOAP**, OAuth2 (3 flows), collections, environments, history, cURL + AL code generation |
| Phase 2 (planned) | `0.2.x` | GraphQL body type + query/variables editors |
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

1. Click the extension icon in the Activity Bar (or open the Command Palette → `GI-SP REST & SOAP Client: Open`).
2. On first run you'll see a one-time activation screen — click **Request Activation Code** to email the publisher; you'll receive a 6-digit code to unlock.
3. Type a URL → pick a method → hit **Send**. That's it.
4. Save useful requests into a Collection. Define environments (Dev / Staging / Prod) and reference variables with `{{baseUrl}}`, `{{apiKey}}`, etc.

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
- Built-in dynamic variables: `$timestamp`, `$isoTimestamp`, `$randomInt`, `$guid`, `$randomUUID`

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
| `GI-SP REST & SOAP Client: Open` | Open the main panel |
| `GI-SP REST & SOAP Client: New Request` | New request tab |
| `GI-SP REST & SOAP Client: Save Request` | Save current request to a collection |
| `GI-SP REST & SOAP Client: New Collection` | Create a collection |
| `GI-SP REST & SOAP Client: New Environment` | Create an environment |
| `GI-SP REST & SOAP Client: Import Collection` | Import JSON / Postman v2 |
| `GI-SP REST & SOAP Client: Export Collection` | Export a collection to JSON |
| `GI-SP REST & SOAP Client: Clear History` | Delete all history entries |
| `GI-SP REST & SOAP Client: Reset Activation` | Clear cached license; useful when switching machines |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `GISPRest.requestTimeout` | `30000` | Request timeout in milliseconds |
| `GISPRest.maxHistoryEntries` | `500` | Maximum history entries kept |
| `GISPRest.followRedirects` | `true` | Follow HTTP 3xx redirects |
| `GISPRest.sslVerification` | `true` | Verify SSL certificates |
| `GISPRest.maxResponseSize` | `10485760` | Max response body size (bytes; default 10 MB) |

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

| Audience | Doc |
|---|---|
| **End users** | [User Guide](docs/USER_GUIDE.md) — how to send requests, set up auth, use collections, etc. |
| **Contributors** | [Developer Guide](docs/DEVELOPER_GUIDE.md) — build, architecture, conventions |
| **Publisher (one person)** | [Publisher Guide](docs/PUBLISHER_GUIDE.md) — licensing setup, packaging, marketplace publish |
| **Release notes** | [CHANGELOG](CHANGELOG.md) |

---

## FAQ

**Q: Why do I need an activation code?**
A: This extension is owner-distributed. You request a code from the publisher (the email arrives within minutes). The activation is valid for 30 days and can be extended.

**Q: Why two codes (Admin vs User)?**
A: Admin gets the full sidebar (Collections, History, Environments). User gets Collections only — useful when you want to share saved requests with teammates but keep their own request history separate.

**Q: Does this work offline?**
A: Yes — for 24 hours after the last successful license check. After that, the activation gate reappears and you'll need network connectivity to re-verify.

**Q: Does my data leave my machine?**
A: No. All requests, responses, and collections stay local at `C:\RestApiTestData\gi-sp-rest-soap-client-data.json`. OAuth2 tokens go to the OS keychain (never the file). The only network call this extension makes (other than your own API requests) is a small activation check to a Google Apps Script the publisher controls — it sends only your machine ID, hostname, and OS username.

**Q: Where's GraphQL?**
A: Hidden in Phase 1 (this release). Scheduled for Phase 2 — the backend code is already in place; only the UI dropdown is gated.

**Q: Will Postman collections import?**
A: Yes — `Import Collection` accepts Postman v2 JSON. Note: complex Postman features (auth, folder hierarchy, environments) are partially mapped; raw JSON bodies and basic structure work.

**Q: Can I extend a user's 30-day window?**
A: Yes — the publisher edits one cell in a Google Sheet. See the [Publisher Guide](docs/PUBLISHER_GUIDE.md#maintenance).

---

## License

[MIT](LICENSE) © GI-SP (Sonu Panwar)

---

## Issues, ideas, contributions

Open an issue or PR on the project repository. For activation issues or licensing, contact the publisher at `spanwar.ai@gmail.com`.
