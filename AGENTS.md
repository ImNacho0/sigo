# AGENTS.md — RED SIGO

Guía para agentes de IA que trabajen en este repositorio.

## Visión general

RED SIGO es una plataforma de búsqueda e indexación de datos con 4 componentes principales, cada uno en su propia carpeta raíz. Los componentes se comunican por HTTP en localhost.

## Estructura del proyecto

```
process-manager/   → Go. Orquestador. Compila a process-manager.exe. Puerto 8081.
server/            → Go. Servidor web + licencias. Compila a server.exe. Puerto 80 (+8082 admin).
api/               → Python Flask. API de búsqueda. Puerto 5000.
frontend/          → React + Vite + TypeScript. SPA servido por server.exe desde static/.
configs/           → config.json (procesos), licenses.json (licencias).
scripts/           → build_release.bat, start_all.bat, toggle_tor.bat.
tor/               → Binario Tor, torrc, hidden services.
web/               → HTML/JS/CSS del panel del Process Manager.
```

## Reglas críticas

1. **Nunca commitear `.env`** — contiene credenciales reales. Solo `.env.example` va al repo.
2. **Nunca commitear `configs/licenses.json`** con datos reales — contiene tokens de usuarios.
3. **`static/` es generado** — se reconstruye con `scripts\build_release.bat`. No editar directamente.
4. **`release/` es generado** — carpeta de distribución. No versionar.
5. **`node_modules/` nunca se versiona**.

## Módulos Go

Hay dos módulos Go independientes:

- `process-manager/` → módulo `process-manager` (go.mod propio)
- `server/` → módulo `red-sigo/server` (go.mod propio)

Cada uno se compila por separado: `cd process-manager && go build .` / `cd server && go build .`

## Dependencias entre componentes

```
process-manager  →  inicia  →  server.exe (command: "./server.exe")
process-manager  →  inicia  →  api/app.py (command: "python api\app.py")
process-manager  →  inicia  →  scripts\toggle_tor.bat
process-manager  →  ejecuta →  indexer (goroutine interna)
indexer          →  POST    →  http://127.0.0.1:80/api/stats/invalidate
server           →  proxy   →  http://127.0.0.1:5000 (API Flask)
server           →  auth    →  Bearer token compartido con API
```

## Variables de entorno (.env)

```
ES_HOST, ES_USER, ES_PASSWD     → Elasticsearch (usado por API + Indexer)
INDEX_NAME                       → Nombre del índice ES
AUTHORIZED_TOKENS               → JSON array de tokens Bearer (API)
GEMINI_API_KEY                   → Google Gemini (API + Server)
DISCORD_*_WEBHOOK               → Webhooks de Discord (Server + Process Manager)
```

Nota: El servidor Go (`server/config.go`) tiene algunos valores hardcodeados como constantes. Para hacerlos dinámicos, modificar `config.go` para usar `os.Getenv()`.

## Convenciones de código

- **Go**: Sin frameworks HTTP externos (stdlib `net/http`). El server usa `golang.org/x/net/proxy` para TOR.
- **Python**: Flask + python-dotenv. Elasticsearch client oficial.
- **Frontend**: React 19, Vite 7, TypeScript 5.9. Sin state manager externo.
- **Paths**: Siempre relativos a la raíz del proyecto. Los procesos se lanzan desde la raíz.

## Puertos

| Puerto | Servicio |
|--------|----------|
| 80 | Server Go (principal) |
| 5000 | API Flask |
| 5173 | Frontend Vite (dev) |
| 8081 | Process Manager |
| 8082 | Admin Panel (Go) |
| 9050 | Tor SOCKS Proxy |
| 9200 | Elasticsearch |

## Añadir un nuevo país de búsqueda

1. En `api/app.py`: Añadir nueva ruta `/searchXXX` apuntando al índice ES correspondiente.
2. En `server/handlers_proxy.go`: Añadir handler y case en `handleGateway`.
3. En `server/server.go`: Registrar la nueva ruta en el mux.
4. En `frontend/src/data/`: Añadir datos de la región al mapa.
5. Indexar datos en Elasticsearch usando el Process Manager.

## Cómo compilar

```bash
scripts\build_release.bat
```

## Cómo ejecutar en desarrollo

```bash
scripts\start_all.bat
```

O manualmente:
```bash
# Terminal 1: API
python api\app.py

# Terminal 2: Server
cd server && go run .

# Terminal 3: Process Manager
cd process-manager && go run .

# Terminal 4: Frontend (hot reload)
cd frontend && npm run dev
```
