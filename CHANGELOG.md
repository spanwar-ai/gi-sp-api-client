# Changelog

## 0.1.0 — Phase 1 (REST + SOAP)

First publicly-shipped phase. Scope: REST + SOAP API testing with full auth, collections, environments, and code generation. GraphQL support is implemented internally but hidden from the UI — scheduled for Phase 2.

### Core
- REST API testing with GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **SOAP support** via Raw / XML body type with a one-click envelope template
- Split-pane layout: request editor (top) + response viewer (bottom)
- Tabbed interface for multiple concurrent requests

### Request Body
- JSON, Raw / XML / SOAP / Text, Form URL Encoded
- Form Data with proper multipart/form-data encoding
- Binary file upload (up to 10 MB, file picker integration)

### Authentication
- No Auth, Basic Auth, Bearer Token, API Key (header or query)
- OAuth2 Client Credentials (standard + MSAL for Microsoft endpoints)
- OAuth2 Authorization Code with PKCE (S256) and CSRF state protection
- OAuth2 Resource Owner Password grant (for legacy / private IdPs)
- Local callback server for auth code redirect capture
- Optional `resource` parameter (RFC 8707) on all OAuth2 flows
- Token status display with expiry countdown
- Token cache in OS keychain via VS Code SecretStorage

### Collections & environments
- Create, save, delete collections with folder structure
- Save requests to collections from the URL bar
- Import / export collections (native JSON + Postman v2 format)
- Multiple named environments with variable interpolation (`{{var}}`)
- Switch active environment from the sidebar
- Built-in dynamic variables: `$timestamp`, `$isoTimestamp`, `$randomInt`, `$guid`, `$randomUUID`

### Code generation
- cURL command generation
- AL Code (Business Central) procedure generation with `HttpClient`, OAuth2 token acquisition helpers, and `SecretText` usage

### Data & history
- Automatic request history (up to 500 entries, configurable)
- File-based storage at `C:\RestApiTestData\gi-sp-rest-soap-client-data.json`
- Async (non-blocking) file I/O
- Import / Export all data via sidebar buttons

### Activation & roles (publisher-distributed builds)
- One-time activation gate; publisher emails 6-digit code
- Two role tiers — **Admin** (full sidebar) and **User** (Collections-only sidebar)
- License tracked centrally via Google Apps Script Web App + Google Sheet
- 30-day validity per machine, extendable from the sheet
- 24-hour offline grace period

### Hidden in Phase 1 (still implemented, will surface in Phase 2)
- GraphQL body type editor

## Future phases

- **Phase 2:** GraphQL body type + query / variables editors
- **Future:** WebSocket, gRPC, request scripting (under consideration)
