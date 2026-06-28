# SPEC-2026-06-28: Generador de Dossier de Inteligencia Operativa (PDF)

## 1. Overview
El **Generador de Dossier de Inteligencia Operativa** es una funcionalidad que permite a los operadores de RED SIGO exportar toda la información de un objetivo de búsqueda (datos personales, empadronados, historial geográfico y relaciones inferidas) en un documento PDF imprimible de alta fidelidad, con formato oficial de inteligencia y marca de agua confidencial.

---

## 2. Architecture & Design Principles

### 2.1 Zero-Dependency Print Engine
Para evitar añadir librerías pesadas en el frontend (como `jspdf` o `pdfmake`) que incrementen el bundle, introduzcan problemas de fuentes o requieran layouts complejos en Canvas, se implementará mediante **CSS Print Media Queries (`@media print`)**.
* **Mecanismo:**
  1. Un nuevo componente React `DossierReport.tsx` se renderiza al final del árbol del DOM en `App.tsx`.
  2. En pantalla (`screen`), este componente tiene un estilo `display: none` para no afectar la SPA.
  3. Al presionar "Descargar Dossier", se cargan los datos del objetivo activo en el estado global y se invoca `window.print()`.
  4. Mediante CSS `@media print`, ocultamos toda la SPA (mapa, barra de navegación, menús, modales) y mostramos únicamente el componente de dossier con sus estilos específicos de maquetación, paginación y fuentes.

---

## 3. UI/UX & Layout Structure

### 3.1 Puntos de Entrada en la UI
* Se incorporará un botón **"Generar Dossier"** (con icono de documento/descarga `📄`) en la vista de detalles de objetivos dentro de:
  - `SearchResultsModal.tsx` (después de realizar búsquedas locales o avanzadas/padron).

### 3.2 Diseño del Dossier Imprimible
El dossier se maquetará emulando un documento clasificado oficial:
1. **Cabecera Clasificada:**
   - Logotipo oficial o escudo (Escudo de España del proyecto).
   - Títulos de nivel gubernamental: "MINISTERIO DEL INTERIOR" y "SERVICIO DE INTELIGENCIA OPERATIVA".
   - Etiqueta de seguridad superior: "DOCUMENTO CLASIFICADO - USO EXCLUSIVO POLICIAL".
2. **Marca de Agua Confidencial:**
   - Una marca de agua diagonal con texto semi-transparente "CONFIDENCIAL / RESERVADO".
3. **Ficha de Identidad del Objetivo:**
   - Foto del objetivo (silueta por defecto o foto si está disponible).
   - Tabla con: Nombre, Apellidos, DNI/NIE, Fecha de Nacimiento, Edad (calculada), Dirección actual detectada, Nivel de Riesgo (con color representativo).
4. **Núcleo de Convivencia (Co-habitantes):**
   - Tabla detallada con los familiares y personas empadronadas en la misma dirección, indicando su parentesco inferido y NUC.
5. **Historial de Empadronamiento:**
   - Historial cronológico de registros censales (2011, 2018, 2022).
6. **Pie de Página de Seguridad:**
   - Código de verificación único basado en el hash/id de la licencia del operador.
   - Texto legal de confidencialidad y control de copias.

---

## 4. Technical Specification

### 4.1 CSS Rules (`@media print`)
Se agregarán al archivo global `index.css`:
```css
@media print {
  /* Ocultar elementos de la SPA */
  .app-container, .modal-backdrop, header, .leaflet-container, button {
    display: none !important;
  }
  
  /* Mostrar únicamente el contenedor del dossier */
  #dossier-print-root {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  /* Ajustes de página A4 */
  @page {
    size: A4;
    margin: 15mm 20mm 15mm 20mm;
  }
  
  body {
    background: white !important;
    color: black !important;
    font-family: 'Courier New', Courier, monospace !important;
  }
  
  /* Evitar saltos de página a mitad de tablas o secciones */
  .dossier-section {
    page-break-inside: avoid;
  }
}
```

### 4.2 React State Flow
1. En `App.tsx`, definimos un estado `activeDossierTarget` (tipo `any` o interface dedicada).
2. Cuando el botón "Generar Dossier" es pulsado en el modal de resultados, actualiza este estado.
3. El componente `DossierReport` recibe este target y renderiza el HTML correspondiente en `#dossier-print-root`.
4. Una función de callback dispara `window.print()` inmediatamente después de que el estado se actualiza y el DOM se repinta.

---

## 5. Verification & Testing Criteria
1. **LSP Diagnostics:** Verificar que el compilador de TypeScript acepte el nuevo componente sin errores de tipo ni de importación.
2. **Visual QA:** Comprobar mediante la previsualización de impresión del navegador (`Print Preview`) que:
   - El mapa y la SPA queden completamente ocultos.
   - El dossier ocupe el ancho completo de la página A4 y respete los márgenes establecidos.
   - No se corten tablas a la mitad entre hojas.
