# RED SIGO

Sistema de inteligencia y gestión operativa. Plataforma unificada para búsqueda, indexación y análisis de datos con soporte multi-país.

## Arquitectura

```
RED_SIGO/
├── process-manager/    # Go - Orquestador principal (puerto 8081)
├── server/             # Go - Servidor web + admin panel (puerto 80/8082)
├── api/                # Python Flask - API Gateway (puerto 5000)
├── frontend/           # React + Vite + TypeScript - SPA
├── configs/            # Configuración compartida
├── scripts/            # Scripts de utilidad (build, start, tor)
├── tor/                # Servicio Tor (hidden services)
├── web/                # UI del Process Manager
└── .env                # Variables de entorno (no versionado)
```

### Componentes

| Componente | Lenguaje | Puerto | Descripción |
|---|---|---|---|
| **Process Manager** | Go | 8081 | Orquestador que inicia/detiene server, API, TOR e indexer. WebSocket para stats en tiempo real. |
| **Server** | Go | 80 (+ 8082 admin) | Servidor web que sirve el SPA, gestiona licencias, proxea al API, soporta TOR. |
| **API Gateway** | Python/Flask | 5000 | Backend de búsqueda contra Elasticsearch. Soporte para 6 países, IA con Gemini, stats. |
| **Frontend** | React/TS | 5173 (dev) | SPA con mapa interactivo, búsqueda multi-país, chat IA, panel de administración. |
| **Indexer** | Go (interno) | - | Goroutine dentro del Process Manager. Indexa JSON/CSV/TXT/JSONL a Elasticsearch. |

### Flujo de comunicación

```
Process Manager (8081)
  ├── Inicia → server.exe (80)
  ├── Inicia → python api/app.py (5000)
  ├── Inicia → toggle_tor.bat
  └── Ejecuta → Indexer (goroutine interna)
                  └── Notifica → server/api/stats/invalidate

Server (80) ──proxy──→ API Gateway (5000) ──query──→ Elasticsearch (9200)
```

## Requisitos

- **Go** 1.25+
- **Node.js** 18+ (con npm)
- **Python** 3.10+ (con pip)
- **Elasticsearch** 8.x (accesible via red)

## Setup

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/YOUR_ORG/RED_SIGO.git
   cd RED_SIGO
   ```

2. Copiar y configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales reales
   ```

3. Instalar dependencias del API:
   ```bash
   pip install -r api/requirements.txt
   ```

4. Instalar dependencias del frontend:
   ```bash
   cd frontend && npm install && cd ..
   ```

5. Compilar todo:
   ```bash
   scripts\build_release.bat
   ```

## Uso

### Producción (compilado)

Ejecutar `process-manager.exe` desde la carpeta raíz. El Process Manager:
- Inicia `server.exe` automáticamente
- Inicia el API Gateway (Python)
- Panel de control en `http://localhost:8081`

### Desarrollo

```bash
scripts\start_all.bat
```

Lanza todos los servicios en ventanas separadas con hot-reload donde aplique.

### Build

```bash
scripts\build_release.bat
```

Compila los binarios Go, construye el frontend con Vite, y ensambla todo en `release/`.

## Estructura de configuración

- `configs/config.json` — Definición de procesos para el Process Manager
- `configs/licenses.json` — Licencias de usuario (quotas, roles, tipos)
- `.env` — Variables de entorno (Elasticsearch, Discord webhooks, API keys)

## Licencia

Proyecto privado. Todos los derechos reservados.
