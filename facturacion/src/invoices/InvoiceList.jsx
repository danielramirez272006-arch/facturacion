import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { apiSearchInvoices } from '../services/invoiceService';

export default function InvoiceList({
  invoices = [],
  onNewInvoice,
  onViewDetail,
  onEditInvoice,
  onDuplicateInvoice,
  onDeleteInvoice,
  onUpdateStatus,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fetchedInvoices, setFetchedInvoices] = useState(null);

  const searchInputRef = useRef(null);

  // Ordenamiento por columnas
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('desc');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const todayStr = new Date().toISOString().split('T')[0];

  // REGLA DEL PROFESOR: Búsqueda Server-Side consumiendo el servicio con fetch (Muestra Status 200 en consola)
  useEffect(() => {
    let isCurrent = true;

    apiSearchInvoices(searchTerm, true).then((data) => {
      if (isCurrent && Array.isArray(data)) {
        setFetchedInvoices(data);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [searchTerm]);

  // Atajos de teclado profesionales: '/' o 'Ctrl+K' para enfocar búsqueda, 'Escape' para limpiar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && document.activeElement !== searchInputRef.current && e.target.tagName !== 'INPUT')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkIsOverdue = useCallback((inv) => {
    return inv.estado !== 'Pagada' && inv.estado !== 'Anulada' && Boolean(inv.dueDate) && inv.dueDate < todayStr;
  }, [todayStr]);

  const checkIsDueSoon = useCallback((inv) => {
    if (inv.estado === 'Pagada' || inv.estado === 'Anulada' || !inv.dueDate || inv.dueDate < todayStr) return false;
    const diffTime = new Date(inv.dueDate).getTime() - new Date(todayStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }, [todayStr]);

  // REGLA ESTRICTA: Cálculo dinámico de totales al vuelo en el render
  const computeInvoiceTotal = (inv) => {
    let sub = 0;
    (inv.items || []).forEach((it) => {
      const base = (Number(it.cantidad) || 0) * (Number(it.precio) || 0);
      const desc = Number(it.descuento) || 0;
      sub += base * (1 - desc / 100);
    });
    return sub * 1.13;
  };

  // RESTRICCIÓN ACADÉMICA: CERO .filter(). Búsqueda e iteración exclusivamente con .forEach()
  const filteredAndSortedInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const listToFilter = (term && fetchedInvoices !== null) ? fetchedInvoices : (invoices || []);
    const filtered = [];

    listToFilter.forEach((inv) => {
      const matchesSearch =
        !term ||
        (inv.numeroFactura || '').toLowerCase().includes(term) ||
        (inv.cliente?.nombre || '').toLowerCase().includes(term) ||
        (inv.cliente?.identificacion || '').toLowerCase().includes(term) ||
        (inv.fecha || '').includes(term);

      const matchesStatus =
        statusFilter === 'todas'
          ? true
          : statusFilter === 'Vencidas'
          ? checkIsOverdue(inv)
          : (inv.estado || 'Emitida') === statusFilter;

      const invDate = inv.fecha || '';
      const matchesStartDate = !startDate || invDate >= startDate;
      const matchesEndDate = !endDate || invDate <= endDate;

      if (matchesSearch && matchesStatus && matchesStartDate && matchesEndDate) {
        filtered.push(inv);
      }
    });

    filtered.sort((a, b) => {
      let valA;
      let valB;

      if (sortField === 'numeroFactura') {
        valA = a.numeroFactura || '';
        valB = b.numeroFactura || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'cliente') {
        valA = a.cliente?.nombre || '';
        valB = b.cliente?.nombre || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'total') {
        valA = computeInvoiceTotal(a);
        valB = computeInvoiceTotal(b);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      // default: fecha
      valA = a.fecha || '';
      valB = b.fecha || '';
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return filtered;
  }, [fetchedInvoices, invoices, searchTerm, statusFilter, startDate, endDate, sortField, sortDirection, checkIsOverdue]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedInvoices.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const paginatedInvoices = filteredAndSortedInvoices.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFetchedInvoices(null);
    setStatusFilter('todas');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Exportar resultados filtrados a CSV
  const handleExportCSV = () => {
    if (!filteredAndSortedInvoices || filteredAndSortedInvoices.length === 0) {
      alert('No hay facturas para exportar.');
      return;
    }

    const headers = ['NumeroFactura', 'Cliente', 'Identificacion', 'Fecha', 'Vence', 'Estado', 'Total', 'Moneda'];
    const csvRows = [headers.join(',')];

    filteredAndSortedInvoices.forEach((inv) => {
      const total = computeInvoiceTotal(inv).toFixed(2);
      const row = [
        `"${inv.numeroFactura || ''}"`,
        `"${(inv.cliente?.nombre || '').replace(/"/g, '""')}"`,
        `"${inv.cliente?.identificacion || ''}"`,
        `"${inv.fecha || ''}"`,
        `"${inv.dueDate || ''}"`,
        `"${inv.estado || 'Emitida'}"`,
        `"${total}"`,
        `"${inv.moneda || '$'}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `facturas_exportadas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RESTRICCIÓN ACADÉMICA: CERO .map(). Resaltado de texto usando exclusivamente .push()
  const highlightMatch = (text, query) => {
    if (!query || !query.trim() || !text) {
      return text;
    }
    const q = query.trim().toLowerCase();
    const str = String(text);
    const lower = str.toLowerCase();
    const index = lower.indexOf(q);
    if (index === -1) {
      return text;
    }

    const parts = [];
    let start = 0;
    let matchIdx = lower.indexOf(q, start);
    let keyCounter = 0;

    while (matchIdx !== -1) {
      if (matchIdx > start) {
        parts.push(<span key={`txt-${keyCounter++}`}>{str.slice(start, matchIdx)}</span>);
      }
      parts.push(
        <mark
          key={`mrk-${keyCounter++}`}
          style={{
            backgroundColor: '#fef08a',
            color: '#854d0e',
            borderRadius: '3px',
            padding: '0 3px',
            fontWeight: '700',
          }}
        >
          {str.slice(matchIdx, matchIdx + q.length)}
        </mark>
      );
      start = matchIdx + q.length;
      matchIdx = lower.indexOf(q, start);
    }

    if (start < str.length) {
      parts.push(<span key={`txt-${keyCounter}`}>{str.slice(start)}</span>);
    }

    return parts;
  };

  // REGLA ESTRICTA: Cálculos dinámicos en el render para estadísticas globales
  let totalFacturado = 0;
  let facturasPagadas = 0;
  let facturasVencidas = 0;
  let facturasPendientes = 0;

  (invoices || []).forEach((inv) => {
    totalFacturado += computeInvoiceTotal(inv);
    if (inv.estado === 'Pagada') {
      facturasPagadas++;
    } else if (checkIsOverdue(inv)) {
      facturasVencidas++;
    } else if (inv.estado !== 'Anulada') {
      facturasPendientes++;
    }
  });

  const getStatusBadgeStyle = (invoice) => {
    const estado = invoice.estado || 'Emitida';
    if (estado === 'Pagada') {
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Pagada' };
    }
    if (estado === 'Anulada') {
      return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', label: 'Anulada' };
    }
    if (checkIsOverdue(invoice)) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'Vencida' };
    }
    if (checkIsDueSoon(invoice)) {
      return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', label: 'Por vencer' };
    }
    return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: estado };
  };

  const handleDelete = (e, invoice) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que deseas eliminar la factura ${invoice.numeroFactura}?`)) {
      if (onDeleteInvoice) {
        onDeleteInvoice(invoice.id);
      }
    }
  };

  // RESTRICCIÓN ACADÉMICA ESTRICTA: CERO .map(). Renderizado con .forEach() y .push()
  const renderInvoiceRows = () => {
    const rows = [];

    paginatedInvoices.forEach((invoice) => {
      const total = computeInvoiceTotal(invoice);
      const moneda = invoice.moneda || '$';
      const estado = invoice.estado || 'Emitida';
      const badgeStyle = getStatusBadgeStyle(invoice);
      const isOverdue = checkIsOverdue(invoice);
      const isDueSoon = checkIsDueSoon(invoice);

      rows.push(
        <tr
          key={invoice.id}
          style={{
            borderBottom: '1px solid #f1f5f9',
            transition: 'background-color 0.15s ease',
            backgroundColor: isOverdue ? '#fff1f2' : 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isOverdue ? '#ffe4e6' : '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOverdue ? '#fff1f2' : 'transparent')}
        >
          <td style={{ padding: '0.875rem 0.75rem', fontWeight: '700', color: '#1e293b' }}>
            {highlightMatch(invoice.numeroFactura, searchTerm)}
          </td>
          <td style={{ padding: '0.875rem 0.75rem', color: '#334155' }}>
            <div style={{ fontWeight: '600' }}>
              {highlightMatch(invoice.cliente?.nombre || 'Sin cliente', searchTerm)}
            </div>
            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>
              {highlightMatch(invoice.cliente?.identificacion || '', searchTerm)}
            </small>
          </td>
          <td style={{ padding: '0.875rem 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
            <div>{invoice.fecha}</div>
            {invoice.dueDate && (
              <div
                style={{
                  fontSize: '0.75rem',
                  marginTop: '0.15rem',
                  color: isOverdue ? '#dc2626' : isDueSoon ? '#c2410c' : '#64748b',
                  fontWeight: isOverdue || isDueSoon ? '600' : '400',
                }}
              >
                Vence: {invoice.dueDate}
              </div>
            )}
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
              {badgeStyle.label || estado}
            </span>
          </td>
          <td style={{ padding: '0.875rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
            {moneda}{total.toFixed(2)}
          </td>
          <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.45rem',
                  borderRadius: '4px',
                  backgroundColor: estado === 'Pagada' ? '#dcfce7' : '#f8fafc',
                  border: `1px solid ${estado === 'Pagada' ? '#86efac' : '#cbd5e1'}`,
                  color: estado === 'Pagada' ? '#15803d' : '#475569',
                  fontWeight: '600',
                }}
                title="Marcar como Pagada"
              >
                <input
                  type="checkbox"
                  checked={estado === 'Pagada'}
                  onChange={(e) => {
                    if (onUpdateStatus) {
                      onUpdateStatus(invoice.id, e.target.checked ? 'Pagada' : 'Emitida');
                    }
                  }}
                  style={{ cursor: 'pointer', accentColor: '#16a34a' }}
                />
                Pagada
              </label>

              <Button
                variant="outline"
                onClick={() => onViewDetail && onViewDetail(invoice)}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.775rem' }}
              >
                Ver
              </Button>

              {onEditInvoice && (
                <button
                  type="button"
                  onClick={() => onEditInvoice(invoice)}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.775rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#334155',
                    fontWeight: '500',
                  }}
                >
                  Editar
                </button>
              )}

              {onDuplicateInvoice && (
                <button
                  type="button"
                  onClick={() => onDuplicateInvoice(invoice)}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.775rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#334155',
                    fontWeight: '500',
                  }}
                >
                  Duplicar
                </button>
              )}

              {onDeleteInvoice && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, invoice)}
                  style={{
                    padding: '0.3rem 0.55rem',
                    color: '#dc2626',
                    fontSize: '0.775rem',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Eliminar
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });

    return rows;
  };

  // RESTRICCIÓN ACADÉMICA: CERO .map() para botones de paginación
  const renderPaginationButtons = () => {
    const buttons = [];
    for (let page = 1; page <= totalPages; page++) {
      buttons.push(
        <button
          key={page}
          type="button"
          className={`pagination-btn ${page === currentPageSafe ? 'active' : ''}`}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </button>
      );
    }
    return buttons;
  };

  // Si no hay facturas registradas en el sistema
  if (!invoices || invoices.length === 0) {
    return (
      <Card style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#1e293b', margin: 0 }}>
            No hay facturas registradas
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '420px' }}>
            Comienza registrando tu primera factura comercial. Los datos se conservarán automáticamente en tu navegador o base de datos.
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1150px', margin: '0 auto' }}>
      {/* Tarjetas de Métricas Dinámicas calculadas en render */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: '4px solid #4f46e5' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Facturado (con IVA)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '0.25rem' }}>
            ${totalFacturado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <small style={{ color: '#64748b' }}>Facturas cobradas</small>
        </Card>

        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Pendientes / Vigentes
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309', marginTop: '0.25rem' }}>
            {facturasPendientes}
          </div>
          <small style={{ color: '#64748b' }}>Por cobrar vigentes</small>
        </Card>

        <Card style={{ padding: '1.25rem', textAlign: 'left', borderLeft: `4px solid ${facturasVencidas > 0 ? '#ef4444' : '#cbd5e1'}` }}>
          <span style={{ fontSize: '0.8rem', color: facturasVencidas > 0 ? '#b91c1c' : '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Vencidas
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: facturasVencidas > 0 ? '#dc2626' : '#64748b', marginTop: '0.25rem' }}>
            {facturasVencidas}
          </div>
          <small style={{ color: facturasVencidas > 0 ? '#dc2626' : '#64748b' }}>
            {facturasVencidas > 0 ? 'Gestión de cobro requerida' : 'Sin facturas vencidas'}
          </small>
        </Card>
      </div>

      <Card style={{ textAlign: 'left', padding: '1.75rem' }}>
        {/* Cabecera y botones principales */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem', fontWeight: '700' }}>Facturas Registradas</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Gestión de documentos emitidos, cobranza y exportación
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: '0.55rem 0.95rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Descargar facturas visibles en formato CSV"
            >
              Exportar CSV
            </button>

            {onNewInvoice && (
              <Button variant="primary" onClick={onNewInvoice}>
                + Nueva Factura
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda con Atajo y Botón de Limpieza */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 320px', position: 'relative' }}>
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o número de factura... (Ctrl+K o '/')"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ paddingRight: searchTerm ? '2.4rem' : '1rem' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#475569',
                    fontWeight: 'bold',
                  }}
                  title="Limpiar búsqueda (Escape)"
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.625rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.875rem',
                  color: '#334155',
                }}
              >
                <option value="todas">Todos los estados</option>
                <option value="Emitida">Emitida</option>
                <option value="Pagada">Pagada</option>
                <option value="Vencidas">Vencidas ({facturasVencidas})</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: '600' }}>Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: '600' }}>Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>

            {/* Contador dinámico de resultados */}
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: '500', marginLeft: '0.25rem' }}>
              {filteredAndSortedInvoices.length} {filteredAndSortedInvoices.length === 1 ? 'factura encontrada' : 'facturas encontradas'}
              {searchTerm && ` para "${searchTerm}"`}
            </span>

            {(searchTerm || statusFilter !== 'todas' || startDate || endDate) && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  color: '#475569',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: 'auto',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Facturas */}
        {filteredAndSortedInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
              No se encontraron facturas coincidentes
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
              {searchTerm
                ? `No hay facturas que coincidan con "${searchTerm}". Intenta buscar por nombre de cliente, identificación o número de factura.`
                : 'No hay facturas que cumplan con los filtros de fecha y estado seleccionados.'}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                    <th
                      className="table-header-sortable"
                      onClick={() => handleSort('numeroFactura')}
                      style={{ padding: '0.75rem 0.75rem' }}
                    >
                      N° Factura {sortField === 'numeroFactura' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="table-header-sortable"
                      onClick={() => handleSort('cliente')}
                      style={{ padding: '0.75rem 0.75rem' }}
                    >
                      Cliente {sortField === 'cliente' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="table-header-sortable"
                      onClick={() => handleSort('fecha')}
                      style={{ padding: '0.75rem 0.75rem' }}
                    >
                      Fecha {sortField === 'fecha' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Estado</th>
                    <th
                      className="table-header-sortable"
                      onClick={() => handleSort('total')}
                      style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}
                    >
                      Total {sortField === 'total' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>{renderInvoiceRows()}</tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedInvoices.length)} de {filteredAndSortedInvoices.length} facturas
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPageSafe <= 1}
                  >
                    Anterior
                  </button>
                  {renderPaginationButtons()}
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPageSafe >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
