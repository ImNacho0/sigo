# AGENTS.md — server/ (Go Web Server)

**15 .go files, 3038 lines. Module: `red-sigo/server`**

## OVERVIEW

Servidor web Go (stdlib `net/http`, sin frameworks). Sirve el SPA compilado desde `static/`, proxy a Flask API, gestiona licencias/quotas, chat IA, búsqueda avanzada SSE, panel admin. Tor integrado via `golang.org/x/net/proxy`.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Route registration | `server.go` | `ServeMux.HandleFunc` — all routes here |
| Add new search country | `handlers_proxy.go` | Add case in `handleGateway` switch |
| Modify proxy/cache | `handlers_proxy.go` | `proxyRequest`, `handleSearchArg` (special) |
| Modify license/quota | `manager_license.go` | Load, verify, consume, atomic |
| Advanced search (ES) | `handlers_advanced.go` | SSE stream, `_msearch`, caching |
| Chat AI | `handlers_chat.go` + `manager_chat.go` | History, SSE streaming |
| Auth | `handlers_auth.go` | Cookie + Bearer, login page |
| Admin CRUD | `admin_handlers.go` | List/create/update/delete licenses |
| Stats | `handlers_stats.go` | ES aggregations, cache |
| Discord logging | `discord_logger.go` | Webhook POST for search + chat |
| Config/env | `config.go` | .env loading, TOR client, `globalCache` |
| Helpers | `helpers.go` + `advanced_helpers.go` | Age calc, name inference, classification |
| Bridge test | `bridge_test.go` | Integration test for Discord bridge |

## CODE MAP

| Symbol | Type | File | Role |
|--------|------|------|------|
| `main()` | func | `server.go` | Init Tor, license, stats cache, start admin, register routes |
| `handleGateway` | handler | `handlers_proxy.go` | Universal dispatch: quota check → route |
| `proxyRequest` | func | `handlers_proxy.go` | Forward POST to Flask + cache read/write + Discord log |
| `handleSearchArg` | handler | `handlers_proxy.go` | Special: server-side `raw_data` JSONL parsing |
| `handlePadronGeneric` | handler | `handlers_proxy.go` | Generic padrón handler with report generation |
| `handleAdvancedSearch` | handler | `handlers_advanced.go` | SSE advanced search, ES `_msearch` |
| `handleLogin` | handler | `handlers_auth.go` | Password-based auth, sets UCO_SESSION cookie |
| `handleAuthStatus` | handler | `handlers_auth.go` | Returns current license data |
| `handleChatStream` | handler | `handlers_chat.go` | SSE streaming chat with Gemini |
| `handleStats` | handler | `handlers_stats.go` | ES aggregation → cached JSON |
| `LicenseManager` | type | `manager_license.go` | Loads/verifies/quota checks |

## HANDLER PATTERN

```go
func handleSearchXxx(w http.ResponseWriter, r *http.Request) {
    proxyRequest(w, r, BackendURL+"/searchxxx")
}
```

**Exception**: `handleSearchArg` does NOT use `proxyRequest`. It manually calls Python API, parses `raw_data` JSONL lines, normalizes keys, caches with `"arg:"` prefix, and logs to Discord. All other country handlers use `proxyRequest`.

**Gateway**: `POST /gateway` with JSON `{target: "searchXX", data: {...}}`. Checks quota, routes to handler. `advanced-search` gets atomic `CheckQuotaAdvanced` (3 units) then SSE stream.

## CACHE SYSTEM

- `globalCache` (FIFO, 200 entries) in `config.go` (`APICache` type).
- Cache key patterns:
  - Proxy: `"proxy:{targetURL}:{body}"` — set only on 200 OK
  - Argentina: `"arg:{body}"` — server-side parsed
  - Padrón: `"padron:{nombre}"` — padron data
  - Advanced: shared prefix — cache HIT on subsequent manual search
- Cache HIT returns `X-Cache: HIT` header + Discord log as goroutine.

## QUOTA SYSTEM

- `licenseManager.CheckQuota(key, isPadron)` — deducts 1 search or 1 padrón unit
- `licenseManager.CheckQuotaAdvanced(key, cost)` — atomic, 3 units default
- 403 before any processing if insufficient quota
- Reset handled by `manager_license.go`

## TOR INTEGRATION

- SOCKS5 proxy on `127.0.0.1:9050`
- Client created in `initTorClient()` → `torClient` with 180s timeout
- `getHttpClient(url)` returns Tor client for `.onion` URLs, default for direct
- All outgoing requests to Flask API use Tor

## CONVENTIONS

- **Route registration**: All routes in `server.go` `main()`. Every new route gets a `HandleFunc` entry and a handler file.
- **Content-Type detection**: Extension-based, WebP registered in `init()`.
- **Bridge test**: `bridge_test.go` does a live POST to the Discord bridge endpoint.
- **Helper files**: `helpers.go` (age calc, demographics) and `advanced_helpers.go` (name variants, relationship inference).

## ANTI-PATTERNS

- **No caching on error** — `globalCache.Set` only on 200 OK.
- **`handleSearchArg` is unique** — only handler with server-side `raw_data` JSONL parsing. All other countries use `proxyRequest`. Don't copy its pattern.
- **No hardcoded file paths** — use `filepath.Join(execDir(), ...)` or `".."`.
- **No hardcoded license data** — only keys, tokens, env vars.
