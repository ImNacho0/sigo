# Generador de Dossier de Inteligencia Operativa (PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-dependency printable intelligence dossier feature for RED SIGO using CSS print media styles.

**Architecture:** Create a hidden print-only React component `DossierReport` rendered in `App.tsx`. Expose an `onPrintDossier` callback in `SearchResultsModal` which triggers print flow via `window.print()` after updating React state.

**Tech Stack:** React 19, TypeScript 5.9, CSS Print Media Queries.

## Global Constraints

- **No React Router** — keep boolean-flag navigation.
- **No animation libraries** — only standard CSS transitions.
- **No state managers** — keep all state in `App.tsx`.
- **Match CJK/text style** — use monospaced text where appropriate to maintain Mossad console aesthetics.
- **Diagnostics green** — `lsp_diagnostics` must have 0 errors or warnings.

---

### Task 1: Print CSS Styles Definition

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: None
- Produces: CSS classes `.dossier-print-only`, `.dossier-watermark`, and `@media print` rules.

- [ ] **Step 1: Read existing CSS variables and configurations**
  Ensure we understand the root styling.
- [ ] **Step 2: Add print CSS rules to index.css**
  Append the following CSS code block to the end of `frontend/src/index.css`:

```css
/* ── REGLES DE IMPRESIÓN DEL DOSSIER ── */
@media print {
  /* Ocultar el contenedor de la aplicación y modales */
  #root > :not(#dossier-print-root),
  .app-container,
  .modal-backdrop,
  header,
  button,
  svg {
    display: none !important;
  }

  /* Forzar visualización de nuestro contenedor de impresión */
  #dossier-print-root {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    z-index: 99999;
  }

  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }

  body {
    background: white !important;
    color: black !important;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .dossier-page {
    page-break-after: always;
    position: relative;
    min-height: 250mm;
  }

  .dossier-page:last-child {
    page-break-after: avoid;
  }

  .dossier-section {
    page-break-inside: avoid;
    margin-bottom: 25px;
  }
}

/* Regla para ocultar por defecto en pantalla */
@media screen {
  #dossier-print-root {
    display: none !important;
  }
}
```

- [ ] **Step 3: Run css validation check**
  Run: `bun run build` in the `frontend` folder to make sure Vite bundles successfully.
  Expected: build passes.
- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add frontend/src/index.css
  git commit -m "style: add CSS print media styles for dossier printing"
  ```

---

### Task 2: Create Dossier Report Component

**Files:**
- Create: `frontend/src/components/DossierReport.tsx`

**Interfaces:**
- Consumes: `activeDossierTarget` details containing:
  - `nombre`: string
  - `fecha_nacimiento`: string
  - `edad`: number
  - `nuc`: string
  - `relacion`: string
  - `direccion`: string
  - `codigo_postal`: string
  - `localizacion`: string
  - `years`: string[]
  - `convivientes`: Array<{ nombre: string, fecha_nacimiento: string, edad: number, relacion: string, nuc: string }>
- Produces: React Component `<DossierReport activeTarget={...} />`

- [ ] **Step 1: Write DossierReport.tsx component**
  Create `frontend/src/components/DossierReport.tsx` with the following contents:

```tsx
import React from 'react';

interface Cohabitant {
    nombre: string;
    fecha_nacimiento: string;
    edad: number | string;
    relacion: string;
    nuc: string;
}

interface DossierTarget {
    nombre: string;
    fecha_nacimiento: string;
    edad: number | string;
    nuc: string;
    relacion: string;
    direccion: string;
    codigo_postal: string;
    localizacion: string;
    years: string[];
    convivientes: Cohabitant[];
}

interface DossierReportProps {
    activeTarget: DossierTarget | null;
}

export const DossierReport: React.FC<DossierReportProps> = ({ activeTarget }) => {
    if (!activeTarget) return null;

    const currentTimestamp = new Date().toLocaleString('es-ES');
    const licenseId = localStorage.getItem('operator_key') || 'RS-UNKNOWN-OPERATOR';

    return (
        <div style={{ padding: '20px', color: '#000', backgroundColor: '#fff', fontSize: '12px', lineHeight: '1.5' }}>
            {/* MARCA DE AGUA DIAGONAL */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontSize: '60px',
                fontWeight: 900,
                color: 'rgba(220, 38, 38, 0.08)',
                zIndex: -1,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
            }}>
                CONFIDENCIAL / RESERVADO
            </div>

            {/* SECCIÓN 1: CABECERA */}
            <div className="dossier-section" style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SERVICIO DE INTELIGENCIA OPERATIVA</h1>
                    <h2 style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#333' }}>GOBIERNO DE ESPAÑA · MINISTERIO DEL INTERIOR</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', border: '2.5px solid #dc2626', color: '#dc2626', padding: '3px 8px', display: 'inline-block', borderRadius: '4px' }}>
                        USO EXCLUSIVO POLICIAL
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: DATOS DEL SUJETO */}
            <div className="dossier-section" style={{ marginBottom: '25px' }}>
                <h3 style={{ textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>I. FICHA DE IDENTIDAD DEL OBJETIVO</h3>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    {/* Silueta de Foto */}
                    <div style={{ width: '100px', height: '120px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
                        <span style={{ fontSize: '9px', color: '#666', textAlign: 'center', fontWeight: 'bold' }}>EXPEDIENTE<br/>FOTOGRÁFICO</span>
                    </div>
                    {/* Campos de datos */}
                    <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '11px' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '150px' }}>NOMBRE COMPLETO:</td>
                                <td style={{ padding: '4px 0', textTransform: 'uppercase' }}>{activeTarget.nombre}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>FECHA DE NACIMIENTO:</td>
                                <td style={{ padding: '4px 0' }}>{activeTarget.fecha_nacimiento || 'NO CONSTA'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>EDAD DE CONTROL:</td>
                                <td style={{ padding: '4px 0' }}>{activeTarget.edad ? `${activeTarget.edad} años` : 'NO CONSTA'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>IDENTIFICADOR NUC:</td>
                                <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>{activeTarget.nuc || 'SIN CLASIFICAR'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>RELACIÓN CON EL NÚCLEO:</td>
                                <td style={{ padding: '4px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>{activeTarget.relacion || 'SUJETO PRINCIPAL'}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>DOMICILIO REGISTRADO:</td>
                                <td style={{ padding: '4px 0', textTransform: 'uppercase' }}>{activeTarget.direccion}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>MUNICIPIO / PROVINCIA:</td>
                                <td style={{ padding: '4px 0', textTransform: 'uppercase' }}>{activeTarget.localizacion || `CP ${activeTarget.codigo_postal}`}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECCIÓN 3: CONVIVIENTES / NÚCLEO FAMILIAR */}
            <div className="dossier-section" style={{ marginBottom: '25px' }}>
                <h3 style={{ textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>II. COHABITANTES Y VÍNCULOS EN EL DOMICILIO</h3>
                {activeTarget.convivientes && activeTarget.convivientes.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '11px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1.5px solid #000' }}>
                                <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold' }}>NOMBRE</th>
                                <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold', width: '120px' }}>RELACIÓN</th>
                                <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold', width: '100px' }}>NACIMIENTO</th>
                                <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold', width: '60px' }}>EDAD</th>
                                <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'bold', width: '130px', fontFamily: 'monospace' }}>NUC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTarget.convivientes.map((conv, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '6px 0', textTransform: 'uppercase' }}>{conv.nombre}</td>
                                    <td style={{ padding: '6px 0', textTransform: 'uppercase', fontWeight: conv.relacion ? 'bold' : 'normal' }}>{conv.relacion || 'COHABITANTE'}</td>
                                    <td style={{ padding: '6px 0' }}>{conv.fecha_nacimiento || '—'}</td>
                                    <td style={{ padding: '6px 0' }}>{conv.edad || '—'}</td>
                                    <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{conv.nuc || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>No se han detectado convivientes adicionales vinculados a esta dirección en la base de datos de control.</p>
                )}
            </div>

            {/* SECCIÓN 4: HISTORIAL DE REGISTROS CENSALES */}
            <div className="dossier-section" style={{ marginBottom: '25px' }}>
                <h3 style={{ textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>III. HISTORIAL DE CENSOS REGISTRADOS</h3>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    {activeTarget.years && activeTarget.years.map((year, idx) => (
                        <div key={idx} style={{ border: '1px solid #000', padding: '5px 15px', borderRadius: '4px', backgroundColor: '#f9fafb', fontWeight: 'bold', fontSize: '11px' }}>
                            AÑO CENSAL: {year}
                        </div>
                    ))}
                </div>
            </div>

            {/* SECCIÓN 5: METADATOS DE SEGURIDAD / CONTROL DE COPIAS */}
            <div className="dossier-section" style={{ borderTop: '2px solid #000', paddingTop: '10px', marginTop: '40px', fontSize: '9px', color: '#555', fontFamily: 'monospace' }}>
                <div>FECHA DE EXTRACCIÓN: {currentTimestamp}</div>
                <div>AUTORIZACIÓN LICENCIA OPERADOR: {licenseId}</div>
                <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                    ADVERTENCIA: La información contenida en este dossier es estrictamente confidencial. Queda prohibida su difusión o reproducción no autorizada conforme a la Ley de Secretos Oficiales.
                </div>
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Validate compiler**
  Run: `bun run build` in `frontend` folder to make sure there are no TypeScript compiler errors.
  Expected: compiler passes successfully.
- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add frontend/src/components/DossierReport.tsx
  git commit -m "feat: implement DossierReport component with confidentiality watermark"
  ```

---

### Task 3: Integrate state and component into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `<DossierReport activeTarget={activeDossierTarget} />`
- Produces: Print trigger callback and active state in `App.tsx`.

- [ ] **Step 1: Check existing imports and layout in App.tsx**
  Identify import section and bottom rendering area.
- [ ] **Step 2: Add import and state to App.tsx**
  Add the following import under other imports (around line 15):
  ```typescript
  import { DossierReport } from './components/DossierReport';
  ```
  Add the following state declaration in the `App` component body (around line 43):
  ```typescript
  const [activeDossierTarget, setActiveDossierTarget] = useState<any>(null);
  ```
- [ ] **Step 3: Add print dossier handler in App.tsx**
  Add this method in `App` component before the `return` statement:
  ```typescript
  const handlePrintDossier = (target: any) => {
    setActiveDossierTarget(target);
    // Yield a frame to let React mount and render the #dossier-print-root element
    setTimeout(() => {
      window.print();
      // Reset state after browser print dialog closes
      setActiveDossierTarget(null);
    }, 100);
  };
  ```
- [ ] **Step 4: Pass callback to SearchResultsModal in App.tsx**
  Locate `<SearchResultsModal ... />` inside `return` of `App.tsx` and pass the new prop `onPrintDossier={handlePrintDossier}`.
- [ ] **Step 5: Render DossierReport component at the bottom of the DOM**
  Insert the following element just inside the outer fragment (`<> ... </>`) at the bottom of the component:
  ```tsx
  <div id="dossier-print-root">
    <DossierReport activeTarget={activeDossierTarget} />
  </div>
  ```
- [ ] **Step 6: Verify build**
  Run: `bun run build` in `frontend`
  Expected: build succeeds.
- [ ] **Step 7: Commit changes**
  Run:
  ```bash
  git add frontend/src/App.tsx
  git commit -m "feat: integrate DossierReport component and print handler in App.tsx"
  ```

---

### Task 4: Add Print Button in SearchResultsModal.tsx

**Files:**
- Modify: `frontend/src/components/SearchResultsModal.tsx`

**Interfaces:**
- Consumes: `onPrintDossier` prop from parent `App.tsx`
- Produces: Trigger button "DESCARGAR DOSSIER" in active resident view.

- [ ] **Step 1: Update SearchResultsModalProps interface**
  Add the callback to `SearchResultsModalProps` interface around line 40:
  ```typescript
  onPrintDossier?: (target: any) => void;
  ```
- [ ] **Step 2: Add Print button next to "INVESTIGAR EN RED" button**
  Locate the action block inside `SearchResultsModal.tsx` (around lines 2341-2378). Find the `return` statement that renders the `<button>` for `"INVESTIGAR EN RED"`.
  Replace the whole action block container from:
  ```tsx
  return (
      <button
          onClick={() => addPerson(activeResident.nombre, activeResident.nombre)}
          style={{
              width: '100%',
              background: 'rgba(255, 42, 95, 0.05)',
              ...
          }}
          ...
      >
          <Activity size={12} /> INVESTIGAR EN RED
      </button>
  );
  ```
  to include the "GENERAR DOSSIER" button as a flex row:
  ```tsx
  return (
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
              onClick={() => addPerson(activeResident.nombre, activeResident.nombre)}
              style={{
                  flex: 1,
                  background: 'rgba(255, 42, 95, 0.05)',
                  border: '1px solid rgba(255, 42, 95, 0.3)',
                  color: '#ff2a5f',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'JetBrains Mono', monospace"
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 42, 95, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 42, 95, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 42, 95, 0.3)';
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 42, 95, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 42, 95, 0.3)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
          >
              <Activity size={12} /> INVESTIGAR EN RED
          </button>
          
          <button
              onClick={() => {
                  if (onPrintDossier) {
                      onPrintDossier({
                          nombre: activeResident.nombre,
                          fecha_nacimiento: activeResident.fecha_nacimiento,
                          edad: activeResident.edad,
                          nuc: activeResident.nuc,
                          relacion: activeResident.relacion || 'SUJETO PRINCIPAL',
                          direccion: dir.direccion,
                          codigo_postal: dir.codigo_postal,
                          localizacion: cpMap[dir.codigo_postal] || '',
                          years: dir.years,
                          convivientes: dir.personas
                      });
                  }
              }}
              style={{
                  flex: 1,
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: 'var(--accent-cyan)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'JetBrains Mono', monospace"
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
          >
              <Database size={12} /> GENERAR DOSSIER
          </button>
      </div>
  );
  ```

- [ ] **Step 3: Destructure onPrintDossier from props**
  Locate the props destructuring block in the definition of the `SearchResultsModal` component (around line 366). Add `onPrintDossier` to the destructured props:
  ```typescript
  const { results, query, country, onClose, isClosing, onReady, isHidden, onPrintDossier } = props;
  ```
- [ ] **Step 4: Verify build**
  Run: `bun run build` in the `frontend` folder
  Expected: build succeeds.
- [ ] **Step 5: Run rebuild_frontend script**
  Verify local `static/` generation by running: `scripts\rebuild_frontend.bat` (uses bun internally).
  Expected: build completes, files copied.
- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add frontend/src/components/SearchResultsModal.tsx
  git commit -m "feat: add GENERAR DOSSIER button and print trigger inside SearchResultsModal"
  ```
