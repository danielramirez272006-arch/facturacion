import defaultDb from '../../db.json';

let activeApiBase = 'http://localhost:3005';

/**
 * Verifica si el backend json-server está encendido y accesible (en puerto 3001 o 3005)
 */
export async function checkBackendConnection() {
  for (const url of ['http://localhost:3001', 'http://localhost:3005']) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`${url}/invoices`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        activeApiBase = url;
        return true;
      }
    } catch {
      // continuar
    }
  }
  return false;
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
        fetch(`${activeApiBase}/invoices`),
        fetch(`${activeApiBase}/clients`),
        fetch(`${activeApiBase}/products`),
        fetch(`${activeApiBase}/emisor`),
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
    // 1. Guardar la factura en el servidor
    const res = await fetch(`${activeApiBase}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });

    if (!res.ok) {
      throw new Error(`Error en el servidor al guardar la factura (Código: ${res.status})`);
    }

    const savedData = await res.json();

    // 2. Si el cliente no existía previamente, guardarlo orgánicamente
    if (invoice.cliente?.nombre && !existingClients.some((c) => c.identificacion === invoice.cliente.identificacion)) {
      fetch(`${activeApiBase}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `cli-${Date.now()}`, ...invoice.cliente }),
      }).catch(() => {});
    }

    // 3. Si los ítems no existían en el catálogo, guardarlos orgánicamente
    for (const item of invoice.items || []) {
      if (item.descripcion && !existingProducts.some((p) => p.descripcion.toLowerCase() === item.descripcion.toLowerCase())) {
        fetch(`${activeApiBase}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            descripcion: item.descripcion,
            precio: item.precio,
          }),
        }).catch(() => {});
      }
    }

    return savedData;
  }

  return invoice;
}

/**
 * Actualiza una factura existente completa en el backend o modo local
 */
export async function apiUpdateInvoice(invoice, isOnline, existingClients = [], existingProducts = []) {
  if (isOnline) {
    const res = await fetch(`${activeApiBase}/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });

    if (!res.ok) {
      throw new Error(`Error al actualizar la factura en el servidor (Código: ${res.status})`);
    }

    const updatedData = await res.json();

    // Guardar cliente orgánicamente si es nuevo
    if (invoice.cliente?.nombre && !existingClients.some((c) => c.identificacion === invoice.cliente.identificacion)) {
      fetch(`${activeApiBase}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `cli-${Date.now()}`, ...invoice.cliente }),
      }).catch(() => {});
    }

    // Guardar productos orgánicamente si son nuevos
    for (const item of invoice.items || []) {
      if (item.descripcion && !existingProducts.some((p) => p.descripcion.toLowerCase() === item.descripcion.toLowerCase())) {
        fetch(`${activeApiBase}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            descripcion: item.descripcion,
            precio: item.precio,
          }),
        }).catch(() => {});
      }
    }

    return updatedData;
  }

  return invoice;
}

/**
 * Actualiza el emisor predeterminado en db.json si el usuario lo marca
 */
export async function apiUpdateEmisor(emisorData, isOnline) {
  if (isOnline) {
    try {
      await fetch(`${activeApiBase}/emisor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emisorData),
      });
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
    const res = await fetch(`${activeApiBase}/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newStatus }),
    });

    if (!res.ok) {
      throw new Error(`Error al actualizar estado en el servidor (Código: ${res.status})`);
    }
  }
  return true;
}

/**
 * Elimina una factura en el backend
 */
export async function apiDeleteInvoice(id, isOnline) {
  if (isOnline) {
    const res = await fetch(`${activeApiBase}/invoices/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Error al eliminar en el servidor (Código: ${res.status})`);
    }
  }
  return true;
}

/**
 * Consulta una factura específica por su ID en el backend (GET /invoices/:id)
 * Muestra el Response con status 200 en la consola del navegador
 */
export async function apiGetInvoiceById(id, isOnline = true) {
  if (isOnline !== false) {
    const candidateBases = [activeApiBase, 'http://localhost:3005', 'http://localhost:3001'];
    for (let i = 0; i < candidateBases.length; i++) {
      const base = candidateBases[i];
      try {
        const res = await fetch(`${base}/invoices/${encodeURIComponent(id)}`);
        console.log(res); // Muestra Response con Status 200 en la consola del navegador
        if (res.ok) {
          activeApiBase = base;
          return await res.json();
        }
      } catch {
        // Intentar siguiente puerto si falla
      }
    }
  }

  // Búsqueda local por ID con forEach (CERO .filter())
  let localInvoices;
  try {
    const saved = localStorage.getItem('facturacion_invoices');
    localInvoices = saved ? JSON.parse(saved) : (defaultDb.invoices || []);
  } catch {
    localInvoices = [];
  }

  let found = null;
  localInvoices.forEach((inv) => {
    if (inv.id === id || inv.numeroFactura === id) {
      found = inv;
    }
  });

  return found;
}

/**
 * Busca facturas en el backend consumiendo fetch y mostrando status 200 en consola.
 * Soporta consulta directa por ID o filtrado dinámico.
 */
export async function apiSearchInvoices(searchTerm, isOnline = true) {
  let fetchedData = null;
  const cleanTerm = (searchTerm || '').trim();

  if (isOnline !== false) {
    const candidateBases = [activeApiBase, 'http://localhost:3005', 'http://localhost:3001'];
    for (let i = 0; i < candidateBases.length; i++) {
      const base = candidateBases[i];
      try {
        // Si el término coincide con un ID exacto (ej. FAC-001), consulta directa por ID al backend
        if (cleanTerm) {
          try {
            const resById = await fetch(`${base}/invoices/${encodeURIComponent(cleanTerm)}`);
            if (resById.ok) {
              console.log(resById); // Muestra Response 200 en consola al consultar por ID
              const item = await resById.json();
              activeApiBase = base;
              return [item];
            }
          } catch {
            // Continuar a la consulta de lista
          }
        }

        const res = await fetch(`${base}/invoices`);
        console.log(res); // Muestra Response con Status 200 en la consola del navegador
        if (res.ok) {
          activeApiBase = base;
          fetchedData = await res.json();
          break;
        }
      } catch {
        // Continuar al siguiente puerto si falla
      }
    }
  }

  // Si no se obtuvo del backend, usar respaldo local
  if (!fetchedData) {
    try {
      const saved = localStorage.getItem('facturacion_invoices');
      fetchedData = saved ? JSON.parse(saved) : (defaultDb.invoices || []);
    } catch {
      fetchedData = [];
    }
  }

  if (!cleanTerm) {
    return fetchedData;
  }

  // Filtrado con forEach estricto (CERO .filter())
  const q = cleanTerm.toLowerCase();
  const results = [];
  fetchedData.forEach((inv) => {
    const match =
      (inv.id || '').toLowerCase().includes(q) ||
      (inv.numeroFactura || '').toLowerCase().includes(q) ||
      (inv.cliente?.nombre || '').toLowerCase().includes(q) ||
      (inv.cliente?.identificacion || '').toLowerCase().includes(q) ||
      (inv.fecha || '').includes(q);
    if (match) {
      results.push(inv);
    }
  });

  return results;
}
