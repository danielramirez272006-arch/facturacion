# Sistema de Manipulación de Facturas 🧾

Sistema web comercial para la emisión, gestión, cálculo dinámico y exportación a PDF de facturas electrónicas, desarrollado con **React (Vite)** y respaldado por una **API REST simulada con json-server** y persistencia local.

---

## 🌟 Características Principales

1. **Arquitectura Limpia y Modular**:
   * `src/components/`: Componentes UI reutilizables (`Button`, `Card`, `Input`).
   * `src/invoices/`: Módulo de dominio de facturación (`Invoice`, `InvoiceForm`, `InvoiceList`).
   * `src/services/`: Capa de abstracción de red y almacenamiento (`invoiceService.js`).
2. **Cálculos Dinámicos al Vuelo (Render Time)**:
   * El **Subtotal Neto**, el **IVA del 13%** y el **Total Factura** se calculan dinámicamente durante el renderizado a partir de las cantidades y precios de los ítems. No se almacenan en el estado ni provienen estáticos de la base de datos.
3. **Gestión de Estado y Navegación Nativa**:
   * Implementado exclusivamente con `useState` y `useEffect` nativos de React.
   * Navegación fluida por renderizado condicional entre las vistas `list`, `form` y `detail` sin librerías externas de enrutamiento.
4. **API REST con `json-server` y Modo Resiliente**:
   * Operaciones CRUD reales conectadas a `db.json` (`GET`, `POST`, `PATCH`, `DELETE`).
   * El estado de la interfaz de usuario se actualiza **únicamente** tras la confirmación exitosa del servidor.
   * Cuenta con respaldo transparente en `localStorage` en caso de modo offline.
5. **Código QR Real y Escaneable**:
   * Generación de código QR de alta resolución con el motor `qrcode` que codifica los datos tributarios oficiales de la factura, permitiendo su lectura directa con la cámara de cualquier teléfono móvil.
6. **Diseño Oficial para Impresión y PDF (`@media print`)**:
   * Botón superior que dispara `window.print()`.
   * Reglas CSS de impresión que ocultan barras de navegación y controles de interfaz, ajustando el documento para una salida limpia en formato A4 / Carta.
7. **Poblado Orgánico de la Base de Datos**:
   * Sin datos quemados (*hardcoded*).
   * Al registrar clientes y productos en una factura, el sistema los guarda automáticamente en `db.json` para sugerirlos en futuros documentos.

---

## 📁 Estructura del Proyecto

```text
facturacion/
├── db.json                      # Base de datos REST (invoices, clients, products, emisor)
├── package.json                 # Scripts y dependencias
│
└── src/
    ├── components/              # Componentes de Interfaz de Usuario
    │   ├── Button.jsx           # Botón con variantes visuales
    │   ├── Card.jsx             # Tarjeta contenedora
    │   └── Input.jsx            # Entrada de texto con etiquetas y validación
    │
    ├── dashboard/               # Módulo analítico y reportería
    │   └── Dashboard.jsx        # KPIs, Recharts, atípicos (>1.5σ), proyecciones y exportación CSV
    │
    ├── invoices/                # Vistas y lógica de facturas
    │   ├── Invoice.jsx          # Detalle de factura con QR e impresión PDF
    │   ├── InvoiceForm.jsx      # Formulario dinámico de emisión con dueDate
    │   └── InvoiceList.jsx      # Listado, métricas, alertas de vencimiento y cobro
    │
    ├── services/                # Servicios de red
    │   └── invoiceService.js    # Conexión fetch con db.json y respaldo local
    │
    ├── App.jsx                  # Orquestador principal y enrutador condicional
    ├── main.jsx                 # Punto de entrada de la aplicación
    ├── App.css                  # Estilos complementarios
    └── index.css                # Estilos globales y tipografía
```

---

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio e instalar dependencias:
```bash
git clone https://github.com/danielramirez272006-arch/facturacion.git
cd facturacion/facturacion
npm install
```

### 2. Iniciar la API REST (`json-server`):
```bash
npm run server
```
*Servidor activo en:* `http://localhost:3005` (Endpoints: `/invoices`, `/clients`, `/products`, `/emisor`).

### 3. Iniciar el Frontend (Vite):
En una nueva terminal:
```bash
npm run dev
```
*Aplicación disponible en:* `http://localhost:5173` (o el puerto asignado por Vite).

---

## 🧪 Comprobación de Calidad

* **Linter de código**:
  ```bash
  npm run lint
  ```
* **Compilación de producción**:
  ```bash
  npm run build
  ```
