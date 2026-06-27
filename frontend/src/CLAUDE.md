# AGENTS.md — frontend/src (React + Vite + TypeScript)

<<<<<<< HEAD
**23 source files, 18 components, 3 subdirectories**

## OVERVIEW

Frontend SPA: mapa interactivo de vulnerabilidad por país, búsqueda multi-país, chat IA, panel de administración, generador de documentos. Todo el estado vive en `App.tsx` (no Redux/Zustand). Comunicación con `server/` via `fetch()`.
=======
**18 source files, 7454 lines, 14 components, 3 subdirectories**

## OVERVIEW

Frontend SPA: mapa interactivo de vulnerabilidad por país, búsqueda multi-país, chat IA, panel de administración. Todo el estado vive en `App.tsx` (no Redux/Zustand). Comunicación con `server/` via `fetch()`.
>>>>>>> origin/master

## STRUCTURE

```
src/
<<<<<<< HEAD
├── components/       # 18 componentes (modales, paneles, mapa, fichas)
├── data/             # Datos mock + coordenadas país + CP + datos aleatorios
├── assets/           # Branding, banderas, imágenes por país (ES, MX, ...)
=======
├── components/       # 14 componentes (modales, paneles, mapa)
├── data/             # Datos mock + coordenadas país (chileData.ts, mockData.ts)
├── assets/           # Branding, banderas, imágenes por país
>>>>>>> origin/master
├── App.tsx           # Root component → todo el estado + routing booleano
├── main.tsx          # Entry point (ReactDOM.createRoot)
└── index.css         # Variables CSS globales + animaciones
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Añadir feature/state | `App.tsx` | Añadir useState, props a componente hijo |
| Nuevo modal/panel | `components/` + `App.tsx` | Seguir patrón isClosing→setTimeout |
| Añadir país al mapa | `data/mockData.ts` | Añadir VulnerabilityData, coordenadas |
| Búsqueda multi-país | `SearchResultsModal.tsx` | SSE consumer + Select all + search flow |
| Chat UI | `EnciclopediaModal.tsx` | Chat IA con backend SSE |
| Mapa | `VulnerabilityMap.tsx` | SVG map, hover, click, highlight |
| Stats | `StatisticsPanel.tsx` | Panel lateral con métricas |
| Login/Auth | `Login.tsx` | Password gate, operator_key |
<<<<<<< HEAD
| Búsqueda por CP | `CpLookupPanel.tsx` | Lookup código postal → filas del index |
| Generador DNI/MRZ | `DNIGenerator.tsx` | DNI español con MRZ ICAO TD1 |
| Ficha TA.1 censado | `FichaCensado.tsx` | Formulario Seg. Social TA.1 imprimible |
| Modelo 030 | `Modelo030.tsx` | Declaración censal Agencia Tributaria |
| Selector de ficha | `FichaSelector.tsx` | Elige entre TA.1 y Modelo 030 |
| Datos CP | `data/cpData.ts` + `data/cp/` | Map CP→provincia, localidad, filas |
| Datos aleatorios | `data/randomData.ts` | Generadores de NIF, tel, dirección, etc. |
| Datos México | `data/mexicoData.ts` | Datos geográficos MX |
=======
>>>>>>> origin/master

## COMPONENT MAP

| Component | Type | Role | State from App |
|-----------|------|------|----------------|
| `Login` | Gate | Password auth → sets cookie | `onLoginSuccess` callback |
| `LoadingScreen` | Splash | Fullscreen loader w/ animation | `loading` bool |
| `Header` | Nav | Top bar, search, settings | `licenseName`, `licenseRole` |
| `VulnerabilityMap` | View | SVG interactive country map | `selectedRegionId`, `compareWithId` |
| `StatisticsPanel` | Panel | Side panel: docs, leaks, last scan | `region`, `compareWithId` |
| `SearchResultsModal` | Modal | Search UI + SSE results | — (self-contained fetch) |
| `SearchWidget` | Input | Search input box | `placeholder`, `onSearch` |
| `ProfileView` | Modal | License/profile settings | `profileData`, `licenseName` |
| `AboutModal` | Modal | Info/about screen | `isClosing` |
| `EnciclopediaModal` | Modal | Chat IA with history | — (self-contained) |
| `MossadModal` | Modal | Agency branding/info | — |
| `LogoutModal` | Modal | Confirm logout | `isClosing` |
| `CyberArc` | Visual | Decorative UI element | — |
<<<<<<< HEAD
| `CpLookupPanel` | Panel | Lookup CP → localidades/filas del index | `cp`, `prov`, `pob`, `rows` |
| `DNIGenerator` | Tool | Genera DNI+MRZ ICAO TD1 imprimible | — (self-contained) |
| `FichaCensado` | Tool | Formulario TA.1 Seg. Social imprimible | — (self-contained) |
| `Modelo030` | Tool | Formulario Modelo 030 AEAT imprimible | — (self-contained) |
| `FichaSelector` | Modal | Elige entre TA.1 y Modelo 030 | `onPick`, `onClose` |
=======
>>>>>>> origin/master

## STATE MANAGEMENT

- **Single source**: All state in `App.tsx` as `useState` hooks.
- **Props drilling**: Intentional. No context, no external state.
- **Auth**: `isAuthenticated`, `licenseName`, `licenseRole`, `licenseType` passed down.
- **Map interaction**: `selectedRegionId`, `selectedRegionData`, `compareWithId`.
- **Modal pattern**: `showX` boolean + `isClosingX` boolean + `setTimeout` cleanup.

## MODAL ANIMATION PATTERN

Every modal follows this exact pattern:

```
isClosing → setTimeout(250-400ms) → close state reset
```

Props: `isClosing` (boolean) + `onClose` (callback). The modal renders a CSS class transition on `isClosing`, then `App.tsx` removes it from DOM after timeout.

## SEARCH FLOW

1. User types query in `SearchWidget`
2. `SearchResultsModal` opens, calls `POST /gateway` with `{target: "searchXX", data: {query}}`
3. `server/` proxy forwards to `api/` Flask → Elasticsearch
4. Response rendered as person cards with `ai-scroll-container`

**Advanced Search**: SSE stream from `POST /gateway` with `target: "advanced-search"`. Events: `quota`, `person`, `phase`, `log`, `tab`, `error`, `done`.

## CONVENTIONS

- **Imports**: Relative paths. Components in `./components/X`.
- **Types**: `interface` over `type`. Mock data in `data/mockData.ts`.
- **Assets**: Imported directly (`import logo from './assets/x.png'`). Vite handles bundling.
- **Animations**: CSS transitions + `isClosing` timers in App.tsx. No animation libraries.
- **Map data**: Country polygons in `data/chileData.ts`, vulnerability metadata in `data/mockData.ts`.
<<<<<<< HEAD
- **CP data**: `data/cpData.ts` exports `cpMap` (CP → {prov, pob}); raw CSVs en `data/cp/`. Assets en `public/cp_data/` y `public/cp_locations.json`.
- **Random data**: `data/randomData.ts` — generadores de NIF, teléfono, dirección, email, identidad, municipios.
- **México data**: `data/mexicoData.ts` — datos geográficos MX para estadísticas.
=======
>>>>>>> origin/master

## ANTI-PATTERNS

- **No React Router** — routing is boolean flags in App.tsx.
- **No animation libraries** — CSS transitions only.
- **No self-contained state** — modals that fetch their own data (SearchResults, Enciclopedia) are exceptions; everything else gets state via props.
