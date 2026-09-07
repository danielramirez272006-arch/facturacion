import defaultDb from '../../db.json';

const API_BASE = 'http://localhost:3005';

/**
 * Verifica si el backend json-server está encendido y accesible
 */
export async function checkBackendConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${API_BASE}/invoices`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Carga los datos iniciales de facturas, clientes, productos y emisor.
 * Sin datos quemados: si no existen registros, devuelve arrays vacíos.
 */
export async function loadApplicationData() {
  const isOnline = await checkBackendConnection();

  if (isOnline) {
    try {
      const [invoicesRes, clientsRes, productsRes, emisorRes] = await Promise.all([
        fetch(`${API_BASE}/invoices`),
        fetch(`${API_BASE}/clients`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/emisor`),
      ]);

      const invoices = invoicesRes.ok ? await invoicesRes.json() : [];
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const products = productsRes.ok ? await productsRes.json() : [];
      const emisor = emisorRes.ok ? await emisorRes.json() : {};

      // Sincronizar también con localStorage para respaldo
      try {
        localStorage.setItem('facturacion_invoices', JSON.stringify(invoices));
        localStorage.setItem('facturacion_clients', JSON.stringify(clients));
        localStorage.setItem('facturacion_products', JSON.stringify(products));
      } catch {
        // Silencioso
      }

      return { invoices, clients, products, emisor, isOnline: true };
    } catch {
      // Si falla en pleno request, pasa a modo local
    }
  }

  // Modo Local: lee exclusivamente lo guardado por el usuario (o vacío)
  let localInvoices;
  let localClients;
  let localProducts;
  let localEmisor;

  try {
    const savedInv = localStorage.getItem('facturacion_invoices');
    localInvoices = savedInv ? JSON.parse(savedInv) : (defaultDb.invoices || []);

    const savedCli = localStorage.getItem('facturacion_clients');
    localClients = savedCli ? JSON.parse(savedCli) : (defaultDb.clients || []);

    const savedProd = localStorage.getItem('facturacion_products');
    localProducts = savedProd ? JSON.parse(savedProd) : (defaultDb.products || []);

    const savedEmi = localStorage.getItem('facturacion_default_emisor');
    localEmisor = savedEmi ? JSON.parse(savedEmi) : (defaultDb.emisor || {});
  } catch {
    localInvoices = [];
    localClients = [];
    localProducts = [];
    localEmisor = {};
  }

  return {
    invoices: localInvoices,
    clients: localClients,
    products: localProducts,
    emisor: localEmisor,
    isOnline: false,
  };
}

/**
 * Guarda una nueva factura en el backend (o localStorage) y registra
 * orgánicamente los nuevos clientes y productos sin datos quemados.
 */
export async function apiSaveInvoice(invoice, isOnline, existingClients = [], existingProducts = []) {
  if (isOnline) {
    try {
      // 1. Guardar la factura
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });

      // 2. Si el cliente no existía previamente en la lista, guardarlo orgánicamente
      if (invoice.cliente?.nombre && !existingClients.some((c) => c.identificacion === invoice.cliente.identificacion)) {
        const newClient = {
          id: `cli-${Date.now()}`,
          ...invoice.cliente,
        };
        await fetch(`${API_BASE}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClient),
        }).catch(() => {});
      }

      // 3. Si los ítems no existían en el catálogo, guardarlos orgánicamente
      for (const item of invoice.items || []) {
        if (item.descripcion && !existingProducts.some((p) => p.descripcion.toLowerCase() === item.descripcion.toLowerCase())) {
          const newProduct = {
            id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            descripcion: item.descripcion,
            precio: item.precio,
          };
          await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct),
          }).catch(() => {});
        }
      }

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback a retorno directo
    }
  }

  return invoice;
}

/**
 * Actualiza el emisor predeterminado en db.json si el usuario lo marca
 */
export async function apiUpdateEmisor(emisorData, isOnline) {
  if (isOnline) {
    try {
      await fetch(`${API_BASE}/emisor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emisorData),
      }).catch(() => {});
    } catch {
      // Silencioso
    }
  }
}

/**
 * Actualiza el estado de una factura en el backend
 */
export async function apiUpdateInvoiceStatus(id, newStatus, isOnline) {
  if (isOnline) {
    try {
      await fetch(`${API_BASE}/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
    } catch {
      // Silencioso
    }
  }
}

/**
 * Elimina una factura en el backend
 */
export async function apiDeleteInvoice(id, isOnline) {
  if (isOnline) {
    try {
      await fetch(`${API_BASE}/invoices/${id}`, {
        method: 'DELETE',
      });
    } catch {
      // Silencioso
    }
  }
}
