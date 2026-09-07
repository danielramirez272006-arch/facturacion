import { useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

export default function InvoiceList({
  invoices = [],
  onNewInvoice,
  onViewDetail,
  onDeleteInvoice,
  onUpdateStatus,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');

  // Si no hay facturas registradas en el sistema, muestra exactamente el texto requerido
  if (!invoices || invoices.length === 0) {
    return (
      <Card style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem', color: '#94a3b8' }}>📄</div>
          <h2 style={{ fontSize: '1.4rem', color: '#1e293b', margin: 0 }}>
            No hay facturas registradas
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '420px' }}>
            Comienza registrando tu primera factura comercial. Los datos se conservarán automáticamente en tu navegador.
          </p>
          {onNewInvoice && (
            <Button variant="primary" onClick={onNewInvoice} style={{ marginTop: '0.5rem' }}>
              + Crear Factura
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Filtrado reactivo en tiempo de render
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.numeroFactura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.cliente?.identificacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.fecha?.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'todas' || (inv.estado || 'Emitida') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // REGLA ESTRICTA: Cálculos dinámicos en el render para estadísticas globales
  const totalFacturado = invoices.reduce((acc, inv) => {
    const sub = (inv.items || []).reduce(
      (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
      0
    );
    return acc + sub * 1.13;
  }, 0);

  const facturasPagadas = invoices.filter((i) => i.estado === 'Pagada').length;
  const facturasPendientes = invoices.filter((i) => i.estado !== 'Pagada' && i.estado !== 'Anulada').length;

  const getStatusBadgeStyle = (estado = 'Emitida') => {
    switch (estado) {
      case 'Pagada':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Anulada':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
      default:
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    }
  };

  const handleDelete = (e, invoice) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que deseas eliminar la factura ${invoice.numeroFactura}?`)) {
      if (onDeleteInvoice) {
        onDeleteInvoice(invoice.id);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1050px', margin: '0 auto' }}>
      {/* Tarjetas de Métricas Dinámicas calculadas en render */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: '4px solid #4f46e5' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Facturado (con IVA)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '0.25rem' }}>
            ${totalFacturado.toFixed(2)}
          </div>
          <small style={{ color: '#64748b' }}>Cálculo dinámico en tiempo real</small>
        </Card>

        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Pagadas
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#15803d', marginTop: '0.25rem' }}>
            {facturasPagadas}
          </div>
          <small style={{ color: '#64748b' }}>Facturas cobradas con éxito</small>
        </Card>

        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Pendientes / Emitidas
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309', marginTop: '0.25rem' }}>
            {facturasPendientes}
          </div>
          <small style={{ color: '#64748b' }}>Por registrar pago</small>
        </Card>
      </div>

      <Card style={{ textAlign: 'left', padding: '1.75rem' }}>
        {/* Cabecera y botón principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>Facturas Registradas</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Gestione los documentos emitidos, su cobranza y exportación
            </p>
          </div>
          {onNewInvoice && (
            <Button variant="primary" onClick={onNewInvoice}>
              + Nueva Factura
            </Button>
          )}
        </div>

        {/* Barra de Búsqueda y Filtro de Estado */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ flex: '1 1 260px' }}>
            <Input
              placeholder="🔍 Buscar por número, cliente o fecha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.625rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
                color: '#334155',
              }}
            >
              <option value="todas">Todos los estados</option>
              <option value="Emitida">Emitida</option>
              <option value="Pagada">Pagada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>
        </div>

        {/* Tabla de Facturas */}
        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
            No se encontraron facturas con el criterio de búsqueda especificado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 0.75rem' }}>N° Factura</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Cliente</th>
                  <th style={{ padding: '0.75rem 0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Total (con IVA 13%)</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  // REGLA ESTRICTA: Los cálculos NO se guardan en el estado, se calculan dinámicamente en el render
                  const subtotal = (invoice.items || []).reduce(
                    (acc, item) => acc + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
                    0
                  );
                  const iva = subtotal * 0.13;
                  const total = subtotal + iva;
                  const moneda = invoice.moneda || '$';
                  const estado = invoice.estado || 'Emitida';
                  const badgeStyle = getStatusBadgeStyle(estado);

                  return (
                    <tr
                      key={invoice.id || invoice.numeroFactura}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 0.75rem', fontWeight: '700', color: '#1e293b' }}>
                        {invoice.numeroFactura}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', color: '#334155' }}>
                        <div style={{ fontWeight: '600' }}>{invoice.cliente?.nombre || 'Sin cliente'}</div>
                        <small style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {invoice.cliente?.identificacion || ''}
                        </small>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
                        {invoice.fecha}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.775rem',
                            fontWeight: '600',
                          }}
                        >
                          {estado}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        {moneda}{total.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          <Button
                            variant="outline"
                            onClick={() => onViewDetail && onViewDetail(invoice)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem' }}
                          >
                            Ver Detalles
                          </Button>
                          {onUpdateStatus && (
                            <select
                              value={estado}
                              onChange={(e) => onUpdateStatus(invoice.id, e.target.value)}
                              title="Cambiar estado"
                              style={{
                                padding: '0.3rem 0.4rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.775rem',
                                backgroundColor: '#f8fafc',
                                color: '#334155',
                              }}
                            >
                              <option value="Emitida">Emitida</option>
                              <option value="Pagada">Pagada</option>
                              <option value="Anulada">Anulada</option>
                            </select>
                          )}
                          {onDeleteInvoice && (
                            <Button
                              variant="ghost"
                              onClick={(e) => handleDelete(e, invoice)}
                              style={{ padding: '0.35rem 0.5rem', color: '#ef4444', fontSize: '0.85rem' }}
                              title="Eliminar factura"
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
