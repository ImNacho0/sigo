# PROJECT KNOWLEDGE BASE — RED SIGO

**Generated:** 2026-05-29
**Commit:** `932f328` on `master`
**Span:** ES/EN — Guía para agentes de IA

## OVERVIEW

RED SIGO: plataforma de inteligencia operativa con búsqueda multi-país, indexación de datos y panel de control. 4 componentes Go/Python/React que se comunican por HTTP en localhost. Stack: Go (net/http stdlib), Python Flask, React 19 + Vite 7 + TypeScript 5.9, Elasticsearch 8.x, Tor Onion routing.

## STRUCTURE

```
sigo/
├── process-manager/   # Go — Orquestador (índice, inicia procesos). Puerto 8081. 4 .go files.
├── server/            # Go — Servidor web + licencias + proxy. Puerto 80/8082. 15 .go files.
├── api/               # Python Flask — API de búsqueda ES. Puerto 5000. 1 file (app.py, 603 lines).
├── frontend/          # React+Vite+TS — SPA con mapa, búsqueda, chat. 18 src/ files, 7.4k lines.
├── configs/           # config.json (procesos), licenses.json (licencias).
├── scripts/           # build_release.bat, start_all.bat, toggle_tor.bat, rebuild_frontend.bat.
├── tor/               # Binario Tor, torrc, hidden services.
├── web/               # HTML/JS/CSS del panel del Process Manager.
├── static/            # GENERADO — frontend compilado (no editar).
└── release/           # GENERADO — distribución (no versionar).
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Entender la app | `frontend/src/App.tsx` | Entry point, state, routing |
| Añadir/modificar UI | `frontend/src/components/` | 18 componentes modales/paneles |
| Añadir país búsqueda | `api/app.py` + `server/handlers_proxy.go` + `frontend/src/data/` | ES index → Go proxy → mapa |
| Búsqueda avanzada (ES) | `server/handlers_advanced.go` | SSE stream, ES directo, caché |
| Proxy / gateway unificado | `server/handlers_proxy.go` | `handleGateway` enruta todo |
| Licencias/quotas | `server/manager_license.go` | Carga, verifica, consume |
| Chat IA | `server/handlers_chat.go` + `server/manager_chat.go` | Historial, SSE streaming |
| Auth | `server/handlers_auth.go` | Cookie UCO_SESSION + Bearer |
| Panel administración | `server/admin_handlers.go` | CRUD licencias |
| Stats | `server/handlers_stats.go` | Elasticsearch aggregations |
| Discord logging | `server/discord_logger.go` | Webhooks para search + chat |
| Config server | `server/config.go` | .env loading, TOR client, global cache |
| Indexer (goroutine) | `process-manager/indexer.go` | Importa JSON/CSV/JSONL a ES |
| WebSocket broadcast | `process-manager/main.go` | Stats + procesos + descargas |

## CODE MAP

| Symbol | Type | File | Role |
|--------|------|------|------|
| `App` | React.FC | `frontend/src/App.tsx` | Root SPA component, all state |
| `Login` | Component | `frontend/src/components/Login.tsx` | Auth gate (shown when unauthenticated) |
| `Header` | Component | `frontend/src/components/Header.tsx` | Top bar, menus, settings |
| `VulnerabilityMap` | Component | `frontend/src/components/VulnerabilityMap.tsx` | Mapa interactivo de países |
| `StatisticsPanel` | Component | `frontend/src/components/StatisticsPanel.tsx` | Panel lateral de stats |
| `SearchResultsModal` | Component | `frontend/src/components/SearchResultsModal.tsx` | SSE consumer + resultados búsqueda |
| `SearchWidget` | Component | `frontend/src/components/SearchWidget.tsx` | Input de búsqueda |
| `ProfileView` | Component | `frontend/src/components/ProfileView.tsx` | Perfil/licencia del operador |
| `main()` | func | `server/server.go` | HTTP server init + route registration |
| `handleGateway` | handler | `server/handlers_proxy.go` | Universal dispatch: quota check → route |
| `proxyRequest` | func | `server/handlers_proxy.go` | Forward to Flask + cache |
| `handleAdvancedSearch` | handler | `server/handlers_advanced.go` | SSE advanced search (ES direct) |
| `handleLogin` | handler | `server/handlers_auth.go` | Password-based auth for login page |
| `main()` | func | `process-manager/main.go` | Process manager orchestrator + WS |
| `NewProcessManager` | type | `process-manager/manager.go` | Process lifecycle management |
| `runIndexer` | func | `process-manager/indexer.go` | ES indexing goroutine |

## CRITICAL RULES

1. **Nunca commitear `.env`** — contiene credenciales reales.
2. **Nunca commitear `configs/licenses.json`** con datos reales.
3. **`static/` es generado** — se reconstruye con `scripts\build_release.bat`. No editar.
4. **`release/` es generado** — distribución. No versionar.
5. **`node_modules/` nunca se versiona**.

## GO MODULES

Dos módulos Go independientes:
- `process-manager/` → módulo `process-manager` (go.mod propio)
- `server/` → módulo `red-sigo/server` (go.mod propio)

Compilación separada: `cd process-manager && go build .` / `cd server && go build .`

## DEPENDENCIES

```
process-manager  →  inicia  →  server.exe
process-manager  →  inicia  →  python api/app.py
process-manager  →  inicia  →  scripts/toggle_tor.bat
process-manager  →  ejecuta →  indexer (goroutine, POST /api/stats/invalidate)
server           →  proxy   →  http://127.0.0.1:5000 (Flask)
server           →  auth    →  Bearer token compartido con API
server           →  ES direct → advanced-search (ES_HOST/USER/PASSWD)
```

## ENVIRONMENT (.env)

| Var | Used By | Purpose |
|-----|---------|---------|
| ES_HOST, ES_USER, ES_PASSWD | api/app.py, server/config.go | Elasticsearch connection |
| INDEX_NAME | api/app.py + indexer | ES index name |
| AUTHORIZED_TOKENS | api/app.py | JSON array of Bearer tokens |
| GEMINI_API_KEY | api/app.py, server/*.go | Google Gemini AI |
| DISCORD_SEARCH_WEBHOOK | api/app.py, server/config.go | Search audit logging |
| DISCORD_CHAT_WEBHOOK | server/config.go | Chat audit logging |
| BACKEND_BEARER_TOKEN | server/config.go | Default if no AUTHORIZED_TOKENS |
| BACKEND_LISTEN_ADDR | server/config.go | Listen address (default 0.0.0.0:8080) |

Nota: `server/config.go` tiene defaults hardcodeados para varios valores. Para hacerlos dinámicos, modificar usando `os.Getenv()`.

## CONVENTIONS

- **Go**: Sin frameworks HTTP (stdlib `net/http`). `gorilla/websocket` para WS en PM. `golang.org/x/net/proxy` para TOR server.
- **Python**: Flask + python-dotenv + elasticsearch-py. CORS abierto. Gemini AI via `google.generativeai`.
- **Frontend**: React 19, Vite 7, TypeScript 5.9, sin state manager externo. CSS-in-JS via style objects + `index.css`. Sin router (todo en App.tsx con estado booleano). `pnpm` para gestión de paquetes (no npm).
- **Paths**: Siempre relativos a la raíz del proyecto. Procesos se lanzan desde la raíz.
- **Cache**: `globalCache` FIFO 200 entradas. Clave = `"proxy:{url}:{body}"` para proxy, prefijo `"arg:"` para Argentina, `"padron:"` para padrón.
- **Logging**: Discord webhooks para auditoría de búsquedas y chat. `log.Printf` para consola.
- **Errores**: Respuestas JSON con `{"text": "❌ ..."}` o `{"error": "..."}`. Códigos HTTP estándar.
- **Auth**: Cookie `UCO_SESSION` o header `Authorization: Bearer`. Server auth first, then proxy to Flask.
- **CSS**: Sistema de variables `--vuln-critical`, `--vuln-high`, `--vuln-medium`, `--vuln-safe` para niveles de riesgo.

## ANTI-PATTERNS (THIS PROJECT)

Estas reglas son específicas para este proyecto — NO son consejos genéricos:

1. **No mezclar estilos** — Usar objetos `style={{}}` inline o clases de `index.css`, no ambos en el mismo componente.
2. **No añadir state managers** — El estado vive en `App.tsx`. Props drilling es intencional. No Redux, no Zustand.
3. **No eliminar animaciones de cierre** — Patrón `isClosing → setTimeout → close` es consistente en todos los modales.
4. **No cachear errores** — `globalCache.Set` solo en status 200.
5. **No cambiar puertos** — Ver tabla de puertos. Cada servicio tiene puerto fijo.
6. **No editar `static/`** — Es generado por Vite. Editar `frontend/src/`.
7. **No usernames/passwords en config** — Solo keys, tokens, y variables de entorno.
8. **No eliminar el branding de Israel/Mossad** — Logos y texto "Operated by HaMossad" son parte del diseño.
9. **No asumir que handleSearchArg es igual a los otros** — Es el único handler con server-side parsing del raw_data. Los demás usan `proxyRequest`.
10. **No añadir frameworks HTTP al server Go** — Mantener net/http stdlib para coherencia.
11. **No hardcodear rutas de archivos** — Usar `filepath.Join(execDir(), ...)` o `filepath.Join("..", ...)`.

## REPOSITORY MANAGEMENT

Dos repositorios:
1. **Source** (`sigo`) — Código fuente completo, documentación técnica.
2. **Release** (`sigo-release`) — Solo binarios `.exe`, frontend compilado, scripts.

**Auto-deploy**: GitHub Action en `sigo-release`: push a `master` → empaqueta `.zip` → crea/actualiza "Latest Release".

### Publicar nueva versión
1. `scripts\build_release.bat` → genera/actualiza `release/`.
2. Copiar `release/` al repo de release.
3. `git push` en `sigo-release` → activa auto-deploy.

## PORTS

| Puerto | Servicio | Componente |
|--------|----------|------------|
| 80 | Server Go (principal) | `server/` |
| 5000 | API Flask | `api/` |
| 5173 | Frontend Vite (dev) | `frontend/` |
| 8081 | Process Manager | `process-manager/` |
| 8082 | Admin Panel | `server/` |
| 9050 | Tor SOCKS Proxy | `tor/` |
| 9200 | Elasticsearch | externo |

## ADVANCED SEARCH (ESPAÑA)

`POST /gateway` con `target: "advanced-search"` y body `{"query":"..."}` → SSE stream.

- **Costo**: `AdvancedSearchCost` = 3 unidades de `UsedSearch` (atómico, `CheckQuotaAdvanced`).
- **Orquestación**: 100% Go (`handlers_advanced.go`). ES directo vía `_msearch`. Fase padrón llama a Python `/padronesp`.
- **SSE events**: `quota`, `person`, `phase`, `log`, `tab`, `error`, `done`.
- **Consumer**: `frontend/src/components/SearchResultsModal.tsx::runAdvancedSearchSSE`.
- **Caché**: Cada sub-query se escribe en `globalCache`. Clave compartida con `proxyRequest` → cache HIT en búsquedas manuales posteriores.

## ADD NEW COUNTRY

1. `api/app.py`: Nueva ruta `/searchXXX` → índice ES (usar nombre alias como index, ej: `"mexico"`).
2. `server/handlers_proxy.go`: Nuevo case `"searchXXX"` en `handleGateway` + función `handleSearchXXX`.
3. `server/server.go`: Registrar ruta legacy `/api/searchXXX` en mux.
4. `frontend/src/data/mockData.ts`: Añadir entrada `VulnerabilityData` con id, coordenadas, stats.
   `frontend/src/components/SearchWidget.tsx`: Añadir `'id': 'searchXXX'` al mapa de targets.
5. `web/app.js`: Añadir `<option value="alias">País</option>` en el selector `#alias-selector` del panel de indexación (el indexer usa este alias como nombre del ES alias sobre `spaindb`).
6. `server/handlers_stats.go`: Añadir el alias en `statsAliasToCountry`, `statsAliasOrder` y el id en `expectedCountries`.
   `api/app.py`: Añadir `"alias": "id"` en `alias_to_region` dentro de `get_stats()`.

## COMMANDS

```bash
# Build todo (Go + frontend)
scripts\build_release.bat

# Development (4 ventanas)
scripts\start_all.bat

# Manual
python api/app.py                      # API
cd server && go run .                  # Server
cd process-manager && go run .         # Process Manager
cd frontend && npm run dev             # Frontend (hot reload)
```
