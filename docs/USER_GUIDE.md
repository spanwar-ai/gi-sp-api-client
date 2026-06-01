# User Guide — GI-SP REST & SOAP Client

> A complete how-to for using the extension. If you only want a quick overview, see the [README](../README.md).

---

## Table of contents

1. [First-time activation](#first-time-activation)
2. [Sending a request](#sending-a-request)
3. [Working with SOAP](#working-with-soap)
4. [Authentication](#authentication)
5. [Collections](#collections)
6. [Environments and variables](#environments-and-variables)
7. [Request history](#request-history)
8. [Generating cURL and AL code](#generating-curl-and-al-code)
9. [Settings](#settings)
10. [Commands](#commands)
11. [Troubleshooting](#troubleshooting)

---

## First-time activation

1. After install, the panel auto-opens with an **Activation** screen.
2. Click **Request Activation Code**. The publisher receives an email with **two** 6-digit codes (Admin and User).
3. Contact the publisher (`spanwar.ai@gmail.com`) and receive one of the codes:
   - **Admin code** → full sidebar (Collections + History + Environments)
   - **User code** → Collections-only sidebar
4. Enter the code and click **Activate**.
5. Your activation is valid for **30 days**. The publisher can extend it.

Activation is **per-machine** — a fresh install on a new computer needs a new code.

If you ever need to start over: `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: Reset Activation** → click **Reset** → reload window.

---

## Sending a request

1. The panel opens with a default `GET` request.
2. Type a URL in the address bar (e.g. `https://api.github.com/users/octocat`).
3. Pick a method from the dropdown (`GET`, `POST`, `PUT`, etc.).
4. Click **Send**.

The response shows in the bottom pane:
- Status code, response time, body size, content type
- Tabs for **Body**, **Headers**, **cURL**, **AL Code**

### Tabs in the request editor

| Tab | What it does |
|---|---|
| **Params** | Query string parameters (`?key=value`). Per-row enable/disable. |
| **Headers** | Request headers. Per-row enable/disable. |
| **Body** | Pick a body type (JSON, Raw / XML / SOAP / Text, Form URL Encoded, Form Data, Binary). |
| **Auth** | Pick an auth method (see [Authentication](#authentication) below). |

### Multiple requests at once

The tab bar at the top of the request panel lets you keep multiple requests open simultaneously. Click `+` to add a tab, click the `×` on a tab to close it.

---

## Working with SOAP

SOAP is HTTP `POST` with an XML body. The extension supports SOAP first-class:

1. Set method to **POST**.
2. **Body** tab → pick **Raw / XML / SOAP / Text**.
3. Click **Insert SOAP envelope** — a clean SOAP 1.1 envelope appears, ready for you to fill in.
4. Add the `SOAPAction` header in the **Headers** tab:
   - Key: `SOAPAction`
   - Value: `"http://example.com/MyOperation"` (with quotes — most SOAP servers expect them)
5. Set the `Content-Type` header to `text/xml; charset=utf-8` (or `application/soap+xml` for SOAP 1.2).
6. Send.

The response viewer pretty-prints XML automatically.

---

## Authentication

Click the **Auth** tab and pick from the dropdown:

| Method | Use it when |
|---|---|
| **No Auth** | Public endpoints |
| **Basic Auth** | Legacy systems, internal tools |
| **Bearer Token** | You already have a token (JWT, etc.) |
| **API Key** | The API uses a simple key in a header or query parameter |
| **OAuth2 — Client Credentials** | Server-to-server with no user; e.g. Azure AD app-only |
| **OAuth2 — Authorization Code** | Interactive sign-in; browser opens and captures the redirect |
| **OAuth2 — Password** | Legacy or private IdPs that still allow ROPC grant |

### OAuth2 — Client Credentials

Fill in: `Client ID`, `Client Secret`, `Token URL`, `Scope`, optional `Resource`. The first request fetches a token automatically. Microsoft endpoints (`login.microsoftonline.com`) use MSAL under the hood.

### OAuth2 — Authorization Code

Fill in: `Client ID`, `Client Secret` (optional for public clients), `Authorization URL`, `Token URL`, `Redirect URI`, `Scope`. Click **Get Token** — a browser opens. After you sign in, you'll be redirected back and the token is captured. Uses PKCE (S256) + a random `state` for CSRF protection. Redirect URI must be `localhost` / `127.0.0.1`.

### OAuth2 — Password

Fill in: `Token URL`, `Client ID`, `Client Secret` (optional), `Username`, `Password`, `Scope`, optional `Resource`. The extension POSTs `grant_type=password` and caches the resulting token.

### Token expiry

The Auth tab shows live status:
- **Active — expires in 45m**
- **Expiring soon — 3m left** (warning)
- **Expired** (red)
- **Token acquired** (no expiry returned)

Click **Get New Token** to refresh, or **Clear Token** to discard.

---

## Collections

Open the **Collections** sidebar tab (left side, both Admin and User roles).

### Create a collection
- Click the **+** in the Collections panel, OR
- Run `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: New Collection**.

### Save a request to a collection
- With a request open, click the **Save** icon next to the URL bar.
- Pick the destination collection.

### Import / export
- Import Postman v2 collections or our native JSON format: `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: Import Collection**.
- Export any collection: `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: Export Collection**.

**Note:** Postman import currently covers raw JSON bodies only — form data, auth, and folder hierarchy from Postman are not fully imported.

### Click any saved request
Loads it into a new request tab.

---

## Environments and variables

> Admin role only.

Define different sets of variables for **Dev**, **Staging**, **Production**, etc. Reference them anywhere in URL, headers, query params, or body with `{{variableName}}`.

### Create an environment
- Open the **Environments** sidebar tab.
- Click **+** to create a new environment.
- Add variables (e.g. `baseUrl` = `https://api-dev.example.com`).
- Click the radio button next to a name to make it active.

### Use a variable
Anywhere you'd type a value, type `{{baseUrl}}` instead. At send-time, the active environment's value is substituted.

### Built-in dynamic variables (no environment needed)

| Variable | Substituted with |
|---|---|
| `{{$timestamp}}` | Current Unix milliseconds |
| `{{$isoTimestamp}}` | Current ISO-8601 timestamp |
| `{{$randomInt}}` | A random integer 0–999999 |
| `{{$guid}}` / `{{$randomUUID}}` | A random UUID v4 |

### Known limitation
Variables are only interpolated inside `body.content` (the raw text body). They are **not** interpolated inside Form Data field values or GraphQL query/variables (Phase 2 feature). Workaround: use the raw body type if you need variable interpolation.

---

## Request history

> Admin role only.

Open the **History** sidebar tab. Every request you send appears (newest first), up to 500 entries (configurable). Click any entry to reload that request into a new tab.

History never stores authentication credentials — auth is automatically scrubbed before being persisted.

Clear history: `Ctrl+Shift+P` → **GI-SP REST & SOAP Client: Clear History**.

---

## Generating cURL and AL code

After sending a request, the response panel offers two code-generation tabs:

### cURL
Click **Generate cURL** — copy the equivalent shell command. Includes all headers, query params, body, and auth.

### AL Code (Business Central)
Click **Generate AL Code** — get a ready-to-paste AL procedure with:
- `HttpClient` / `HttpRequestMessage` / `HttpResponseMessage` setup
- All headers, auth, and body pre-filled
- A companion `AcquireAccessToken` procedure for OAuth2 flows (Client Credentials, Authorization Code, or Password — picks the right shape based on your auth config)
- Proper `SecretText` usage for sensitive values

This is the unique feature for Business Central / Microsoft Dynamics 365 developers.

---

## Settings

Open VS Code Settings (`Ctrl+,`) → search "GI-SP REST & SOAP Client".

| Setting | Default | Description |
|---|---|---|
| `aavamiRest.requestTimeout` | `30000` | Request timeout in milliseconds |
| `aavamiRest.maxHistoryEntries` | `500` | Maximum history entries kept |
| `aavamiRest.followRedirects` | `true` | Follow HTTP 3xx redirects |
| `aavamiRest.sslVerification` | `true` | Verify SSL certificates |
| `aavamiRest.maxResponseSize` | `10485760` | Max response body size (bytes; default 10 MB) |

VS Code's built-in `http.proxy` setting is also honored.

---

## Commands

All commands are accessible via `Ctrl+Shift+P` → type "GI-SP REST & SOAP Client".

| Command | What it does |
|---|---|
| `GI-SP REST & SOAP Client: Open` | Open the main panel |
| `GI-SP REST & SOAP Client: New Request` | Open a new request tab |
| `GI-SP REST & SOAP Client: Save Request` | Save current request to a collection |
| `GI-SP REST & SOAP Client: New Collection` | Create a new collection |
| `GI-SP REST & SOAP Client: New Environment` | Create a new environment |
| `GI-SP REST & SOAP Client: Import Collection` | Import JSON / Postman v2 |
| `GI-SP REST & SOAP Client: Export Collection` | Export a collection to JSON |
| `GI-SP REST & SOAP Client: Clear History` | Delete all history entries |
| `GI-SP REST & SOAP Client: Reset Activation` | Clear cached license; useful when switching machines |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Activation gate keeps showing | Cached license expired or backend unreachable | Run **Reset Activation**, reload, request fresh code |
| "Could not reach the mail server" on activation request | Your network blocks SMTP (port 465) | Try a different network (mobile hotspot) or contact your IT team |
| OAuth2 Authorization Code: "Port already in use" | Another app is using the redirect URI's port | Change the Redirect URI port (e.g. `http://localhost:8401/callback`) |
| OAuth2 token expired but auto-refresh fails | Cached refresh token is invalid | Click **Get New Token** to re-authenticate |
| Variables aren't being substituted | Variable is inside Form Data or GraphQL (Phase 2) | Switch to raw body type, or wait for Phase 2 |
| Postman collection imported but body looks wrong | Postman's complex bodies aren't fully mapped | Edit the body manually after import |
| Sidebar tabs missing | You activated with the User code | Re-activate with the Admin code |
| Response too large | Response exceeds `maxResponseSize` | Increase the setting, or ask the API for pagination |
