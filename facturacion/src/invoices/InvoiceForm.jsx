import { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

export default function InvoiceForm({
  onSave,
  onCancel,
  suggestedInvoiceNumber = 'FAC-001',
  clients = [],
  products = [],
  initialEmisor = {},
  invoiceToEdit = null,
  isCloning = false,
}) {
  const isEditing = Boolean(invoiceToEdit) && !isCloning;

  // Cargar emisor predeterminado guardado por el usuario o de la factura en edición
  const savedEmisor = (() => {
    if (invoiceToEdit?.emisor) {
      return invoiceToEdit.emisor;
    }
    try {
      const saved = localStorage.getItem('facturacion_default_emisor');
      return saved ? JSON.parse(saved) : initialEmisor;
    } catch {
      return initialEmisor;
    }
  })();

  // Estado para datos del emisor
  const [emisorNombre, setEmisorNombre] = useState(savedEmisor?.nombre || initialEmisor?.nombre || '');
  const [emisorIdentificacion, setEmisorIdentificacion] = useState(savedEmisor?.identificacion || initialEmisor?.identificacion || '');
  const [emisorEmail, setEmisorEmail] = useState(savedEmisor?.email || initialEmisor?.email || '');
  const [emisorDireccion, setEmisorDireccion] = useState(savedEmisor?.direccion || initialEmisor?.direccion || '');
  const [guardarEmisorDefault, setGuardarEmisorDefault] = useState(false);

  // Estado para datos del cliente
  const [clienteNombre, setClienteNombre] = useState(invoiceToEdit?.cliente?.nombre || '');
  const [clienteIdentificacion, setClienteIdentificacion] = useState(invoiceToEdit?.cliente?.identificacion || '');
  const [clienteEmail, setClienteEmail] = useState(invoiceToEdit?.cliente?.email || '');
  const [clienteDireccion, setClienteDireccion] = useState(invoiceToEdit?.cliente?.direccion || '');

  // Estado para información de factura
  const [numeroFactura, setNumeroFactura] = useState(
    isEditing ? invoiceToEdit.numeroFactura : suggestedInvoiceNumber
  );
  const [fecha, setFecha] = useState(() => {
    if (isEditing && invoiceToEdit.fecha) return invoiceToEdit.fecha;
    return new Date().toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    if (isEditing && invoiceToEdit.dueDate) return invoiceToEdit.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [moneda, setMoneda] = useState(invoiceToEdit?.moneda || '$');
  const [metodoPago, setMetodoPago] = useState(invoiceToEdit?.metodoPago || 'Transferencia / SINPE');
  const [condicionVenta, setCondicionVenta] = useState(invoiceToEdit?.condicionVenta || 'Contado');

  // Lista dinámica de ítems con soporte opcional de descuento (%)
  const [items, setItems] = useState(() => {
    if (invoiceToEdit?.items && invoiceToEdit.items.length > 0) {
      return invoiceToEdit.items.map((it) => ({
        descripcion: it.descripcion || '',
        cantidad: it.cantidad ?? 1,
        precio: String(it.precio ?? ''),
        descuento: it.descuento ? String(it.descuento) : '0',
      }));
    }
    return [{ descripcion: '', cantidad: 1, precio: '', descuento: '0' }];
  });

  // Estado para mensajes de validación
  const [errors, setErrors] = useState({});

  // Limpiador en vivo de errores
  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Manejador para autocompletar cliente desde db.json si existen clientes guardados
  const handleSelectClient = (clientId) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClienteNombre(found.nombre || '');
      setClienteIdentificacion(found.identificacion || '');
      setClienteEmail(found.email || '');
      setClienteDireccion(found.direccion || '');
      setErrors((prev) => ({
        ...prev,
        clienteNombre: null,
        clienteIdentificacion: null,
        clienteEmail: null,
        clienteDireccion: null,
      }));
    }
  };

  // Manejador para autocompletar un ítem desde el catálogo de db.json si existen productos
  const handleSelectProduct = (index, productId) => {
    const found = products.find((p) => p.id === productId);
    if (found) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        descripcion: found.descripcion,
        precio: String(found.precio),
      };
      setItems(newItems);
      clearError('items');
    }
  };

  // Manejadores para la lista dinámica de ítems
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    clearError('items');
  };

  const handleAddItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precio: '', descuento: '0' }]);
    clearError('items');
  };

  const handleDeleteItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      setItems([{ descripcion: '', cantidad: 1, precio: '', descuento: '0' }]);
    }
  };

  // REGLA ESTRICTA: Los cálculos NO se guardan en el estado, se calculan dinámicamente en el render
  const subtotal = items.reduce((acc, item) => {
    const base = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
    const desc = Math.min(100, Math.max(0, Number(item.descuento) || 0));
    return acc + base * (1 - desc / 100);
  }, 0);
  const iva = subtotal * 0.13;
  const total = subtotal + iva;

  // Validación
  const validateForm = () => {
    const newErrors = {};

    if (!emisorNombre.trim()) newErrors.emisorNombre = 'El nombre del emisor es obligatorio';
    if (!emisorIdentificacion.trim()) newErrors.emisorIdentificacion = 'El documento/RUT es obligatorio';
    if (!emisorEmail.trim()) newErrors.emisorEmail = 'El correo del emisor es obligatorio';
    if (!emisorDireccion.trim()) newErrors.emisorDireccion = 'La dirección del emisor es obligatoria';

    if (!clienteNombre.trim()) newErrors.clienteNombre = 'El nombre del cliente es obligatorio';
    if (!clienteIdentificacion.trim()) newErrors.clienteIdentificacion = 'El documento/RUT es obligatorio';
    if (!clienteEmail.trim()) newErrors.clienteEmail = 'El correo del cliente es obligatorio';
    if (!clienteDireccion.trim()) newErrors.clienteDireccion = 'La dirección del cliente es obligatoria';

    if (!numeroFactura.trim()) newErrors.numeroFactura = 'El número de factura es obligatorio';
    if (!fecha) newErrors.fecha = 'La fecha es obligatoria';

    if (items.length === 0) {
      newErrors.items = 'Debe registrar al menos un ítem';
    } else {
      const hasInvalidItem = items.some(
        (item) =>
          !item.descripcion.trim() ||
          Number(item.cantidad) <= 0 ||
          item.precio === '' ||
          Number(item.precio) < 0
      );
      if (hasInvalidItem) {
        newErrors.items = 'Todos los ítems deben tener descripción, cantidad (> 0) y precio válido (≥ 0)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancelClick = () => {
    const hasData =
      clienteNombre.trim() ||
      items.some((i) => i.descripcion.trim() || i.precio);
    if (hasData) {
      if (!window.confirm('¿Deseas descartar los cambios no guardados?')) {
        return;
      }
    }
    if (onCancel) onCancel();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (guardarEmisorDefault) {
      try {
        localStorage.setItem(
          'facturacion_default_emisor',
          JSON.stringify({
            nombre: emisorNombre.trim(),
            identificacion: emisorIdentificacion.trim(),
            email: emisorEmail.trim(),
            direccion: emisorDireccion.trim(),
          })
        );
      } catch {
        // Silencioso
      }
    }

    // Clave numérica oficial de 50 dígitos para simular comprobante de Hacienda
    const claveNumerica =
      isEditing && invoiceToEdit?.claveNumerica
        ? invoiceToEdit.claveNumerica
        : `506${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${Math.floor(
            100000000000000000000000000000000 + Math.random() * 900000000000000000000000000000000
          ).toString().slice(0, 33)}`;

    // Se construye el objeto sin guardar cálculos en el estado
    const invoicePayload = {
      id: isEditing ? invoiceToEdit.id : numeroFactura.trim(),
      numeroFactura: numeroFactura.trim(),
      fecha,
      dueDate,
      moneda,
      metodoPago,
      condicionVenta,
      estado: isEditing ? invoiceToEdit.estado || 'Emitida' : 'Emitida',
      claveNumerica,
      emisor: {
        nombre: emisorNombre.trim(),
        identificacion: emisorIdentificacion.trim(),
        email: emisorEmail.trim(),
        direccion: emisorDireccion.trim(),
      },
      cliente: {
        nombre: clienteNombre.trim(),
        identificacion: clienteIdentificacion.trim(),
        email: clienteEmail.trim(),
        direccion: clienteDireccion.trim(),
      },
      items: items.map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: Number(item.cantidad),
        precio: Number(item.precio),
        descuento: Number(item.descuento) || 0,
      })),
    };

    onSave(invoicePayload, guardarEmisorDefault, isEditing);
  };

  return (
    <Card className="invoice-form-card" style={{ maxWidth: '980px', margin: '0 auto', textAlign: 'left' }}>
      {/* Cabecera del formulario */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: '800' }}>
            {isEditing
              ? `Modificar Factura (${invoiceToEdit.numeroFactura})`
              : isCloning
              ? 'Duplicar Factura Comercial'
              : 'Nueva Factura Comercial'}
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isEditing
              ? 'Actualice las condiciones, cliente o líneas de cobro del documento existente'
              : 'Complete los datos de emisión para generar el documento tributario'}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={handleCancelClick}>
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Metadatos y Configuración de Pago */}
        <section style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: '#334155' }}>Condiciones Comerciales y Moneda</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <Input
              label="Número de Factura"
              value={numeroFactura}
              onChange={(e) => {
                setNumeroFactura(e.target.value);
                clearError('numeroFactura');
              }}
              placeholder="Ej. FAC-001"
              error={errors.numeroFactura}
              required
            />
            <Input
              label="Fecha de Emisión"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                clearError('fecha');
              }}
              error={errors.fecha}
              required
            />
            <Input
              label="Fecha de Vencimiento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Moneda *</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                style={{ padding: '0.625rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem' }}
              >
                <option value="$">USD ($) Dólares</option>
                <option value="₡">CRC (₡) Colones</option>
                <option value="€">EUR (€) Euros</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Método de Pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ padding: '0.625rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem' }}
              >
                <option value="Transferencia / SINPE">Transferencia / SINPE</option>
                <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Condición de Venta</label>
              <select
                value={condicionVenta}
                onChange={(e) => setCondicionVenta(e.target.value)}
                style={{ padding: '0.625rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem' }}
              >
                <option value="Contado">Contado</option>
                <option value="Crédito 15 días">Crédito 15 días</option>
                <option value="Crédito 30 días">Crédito 30 días</option>
              </select>
            </div>
          </div>
        </section>

        {/* Emisor y Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Emisor */}
          <section style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#334155' }}>Datos del Emisor</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Input
                label="Nombre / Razón Social"
                value={emisorNombre}
                onChange={(e) => {
                  setEmisorNombre(e.target.value);
                  clearError('emisorNombre');
                }}
                placeholder="Nombre de la empresa"
                error={errors.emisorNombre}
                required
              />
              <Input
                label="Identificación / Cédula Jurídica / RUT"
                value={emisorIdentificacion}
                onChange={(e) => {
                  setEmisorIdentificacion(e.target.value);
                  clearError('emisorIdentificacion');
                }}
                placeholder="Ej. 3-101-123456"
                error={errors.emisorIdentificacion}
                required
              />
              <Input
                label="Correo Electrónico"
                type="email"
                value={emisorEmail}
                onChange={(e) => {
                  setEmisorEmail(e.target.value);
                  clearError('emisorEmail');
                }}
                placeholder="facturas@empresa.com"
                error={errors.emisorEmail}
                required
              />
              <Input
                label="Dirección Física"
                value={emisorDireccion}
                onChange={(e) => {
                  setEmisorDireccion(e.target.value);
                  clearError('emisorDireccion');
                }}
                placeholder="Provincia, Cantón, Distrito"
                error={errors.emisorDireccion}
                required
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#475569', marginTop: '0.25rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={guardarEmisorDefault}
                  onChange={(e) => setGuardarEmisorDefault(e.target.checked)}
                />
                Guardar este emisor como predeterminado
              </label>
            </div>
          </section>

          {/* Cliente */}
          <section style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Datos del Cliente</h3>
            </div>

            {/* Selector de Cliente desde db.json si existen */}
            {clients.length > 0 && (
              <div style={{ marginBottom: '1rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4338ca', marginBottom: '0.25rem' }}>
                  Seleccionar de Clientes Guardados:
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) handleSelectClient(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                  }}
                >
                  <option value="" disabled>Elegir cliente registrado...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.identificacion})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Input
                label="Nombre / Razón Social"
                value={clienteNombre}
                onChange={(e) => {
                  setClienteNombre(e.target.value);
                  clearError('clienteNombre');
                }}
                placeholder="Nombre o empresa cliente"
                error={errors.clienteNombre}
                required
              />
              <Input
                label="Identificación / Cédula / RUT"
                value={clienteIdentificacion}
                onChange={(e) => {
                  setClienteIdentificacion(e.target.value);
                  clearError('clienteIdentificacion');
                }}
                placeholder="Ej. 1-1234-0567"
                error={errors.clienteIdentificacion}
                required
              />
              <Input
                label="Correo Electrónico"
                type="email"
                value={clienteEmail}
                onChange={(e) => {
                  setClienteEmail(e.target.value);
                  clearError('clienteEmail');
                }}
                placeholder="contacto@cliente.com"
                error={errors.clienteEmail}
                required
              />
              <Input
                label="Dirección Física"
                value={clienteDireccion}
                onChange={(e) => {
                  setClienteDireccion(e.target.value);
                  clearError('clienteDireccion');
                }}
                placeholder="Ubicación o domicilio legal"
                error={errors.clienteDireccion}
                required
              />
            </div>
          </section>
        </div>

        {/* Lista dinámica de ítems */}
        <section style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Líneas de Facturación</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Ingrese los productos o servicios brindados con opción de descuento por línea
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              + Agregar Ítem
            </Button>
          </div>

          {errors.items && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {errors.items}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.5rem 0.5rem', width: '40%' }}>Descripción</th>
                  <th style={{ padding: '0.5rem 0.5rem', width: '10%' }}>Cant.</th>
                  <th style={{ padding: '0.5rem 0.5rem', width: '16%' }}>Precio Unit. ({moneda})</th>
                  <th style={{ padding: '0.5rem 0.5rem', width: '12%' }}>Desc (%)</th>
                  <th style={{ padding: '0.5rem 0.5rem', width: '14%', textAlign: 'right' }}>Importe ({moneda})</th>
                  <th style={{ padding: '0.5rem 0.5rem', width: '8%', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const base = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
                  const desc = Math.min(100, Math.max(0, Number(item.descuento) || 0));
                  const lineTotal = base * (1 - desc / 100);

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {products.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) handleSelectProduct(index, e.target.value);
                              }}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.775rem',
                                color: '#4338ca',
                                backgroundColor: '#f5f3ff',
                              }}
                            >
                              <option value="" disabled>Seleccionar del catálogo guardado...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.descripcion} — ${p.precio.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          )}
                          <Input
                            value={item.descripcion}
                            onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                            placeholder="Descripción del bien o servicio"
                            required
                          />
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                          required
                        />
                      </td>
                      <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precio}
                          onChange={(e) => handleItemChange(index, 'precio', e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.descuento || '0'}
                          onChange={(e) => handleItemChange(index, 'descuento', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#1e293b', verticalAlign: 'middle' }}>
                        {moneda}{lineTotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleDeleteItem(index)}
                          style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                          title="Eliminar fila"
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen dinámico calculado al vuelo en el render */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <div style={{ minWidth: '280px', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
                <span>Subtotal Neto:</span>
                <span>{moneda}{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
                <span>IVA Ley (13%):</span>
                <span>{moneda}{iva.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a', fontSize: '1.15rem' }}>
                <span>Total Factura:</span>
                <span style={{ color: '#4f46e5' }}>{moneda}{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <Button type="button" variant="secondary" onClick={handleCancelClick}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Guardar Cambios' : isCloning ? 'Emitir Factura Duplicada' : 'Guardar y Emitir Factura'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
