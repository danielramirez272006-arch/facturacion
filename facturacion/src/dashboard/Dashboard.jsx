import { useState, useMemo } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard({ invoices = [], onViewDetail }) {
  // Filtros reactivos para el Dashboard
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', '30days', 'month', 'year'
  const [currencyFilter, setCurrencyFilter] = useState('all'); // 'all', '$', '₡', '€'

  // Cálculo dinámico de total con IVA 13% por factura
  const getInvoiceTotal = (inv) => {
    const subtotal = (inv.items || []).reduce(
      (acc, item) => acc + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
      0
    );
    return subtotal * 1.13;
  };

  // Filtrado previo según periodo y moneda seleccionados
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

    return invoices.filter((inv) => {
      // Filtro de moneda
      if (currencyFilter !== 'all' && (inv.moneda || '$') !== currencyFilter) {
        return false;
      }

      // Filtro de periodo
      const fecha = inv.fecha || '';
      if (periodFilter === '30days') {
        return fecha >= thirtyDaysStr;
      }
      if (periodFilter === 'month') {
        return fecha.startsWith(monthPrefix);
      }
      if (periodFilter === 'year') {
        return fecha.startsWith(String(currentYear));
      }
      return true;
    });
  }, [invoices, periodFilter, currencyFilter]);

  // Cálculos estadísticos con useMemo estricto
  const analytics = useMemo(() => {
    const totalFacturas = filteredInvoices.length;
    if (totalFacturas === 0) {
      return {
        totalFacturado: 0,
        ticketPromedio: 0,
        totalFacturas: 0,
        topClientes: [],
        countPagadas: 0,
        countPendientes: 0,
        countVencidas: 0,
        montoVencido: 0,
        tasaMorosidad: 0,
        mean: 0,
        stdDev: 0,
        threshold: 0,
        outlierInvoices: [],
        proyeccionProximoCiclo: 0,
        clientChartData: [],
        timelineData: [],
        statusPieData: [],
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let totalFacturado = 0;
    const totals = [];
    const clientMap = {};
    const dateMap = {};

    let countPagadas = 0;
    let countPendientes = 0;
    let countVencidas = 0;
    let montoVencido = 0;

    filteredInvoices.forEach((inv) => {
      const total = getInvoiceTotal(inv);
      totals.push(total);
      totalFacturado += total;

      // Acumulación por cliente
      const clientName = inv.cliente?.nombre?.trim() || 'Consumidor Final';
      clientMap[clientName] = (clientMap[clientName] || 0) + total;

      // Acumulación por fecha
      const fecha = inv.fecha || 'Sin fecha';
      dateMap[fecha] = (dateMap[fecha] || 0) + total;

      // Estados: comparando con dueDate
      if (inv.estado === 'Pagada') {
        countPagadas++;
      } else if (inv.dueDate && inv.dueDate < todayStr) {
        countVencidas++;
        montoVencido += total;
      } else {
        countPendientes++;
      }
    });

    const ticketPromedio = totalFacturado / totalFacturas;
    const tasaMorosidad = totalFacturado > 0 ? (montoVencido / totalFacturado) * 100 : 0;

    // Top 3 Clientes por volumen
    const sortedClients = Object.entries(clientMap)
      .map(([nombre, total]) => ({ nombre, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    const topClientes = sortedClients.slice(0, 3);

    // Detección Atípica (> Media + 1.5 Desviaciones Estándar)
    const mean = ticketPromedio;
    const variance =
      totals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / totalFacturas;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 1.5 * stdDev;

    const outlierInvoices = filteredInvoices
      .map((inv) => ({
        ...inv,
        calculatedTotal: getInvoiceTotal(inv),
      }))
      .filter((inv) => totalFacturas > 1 && stdDev > 0 && inv.calculatedTotal > threshold);

    // Proyección de ingresos a futuro basada en el promedio de las facturas actuales
    const proyeccionProximoCiclo =
      totalFacturado + ticketPromedio * Math.max(1, Math.round(totalFacturas * 0.25));

    // Datos para Gráficos
    const clientChartData = sortedClients.slice(0, 6).map((c) => ({
      name: c.nombre.length > 14 ? `${c.nombre.slice(0, 12)}...` : c.nombre,
      fullName: c.nombre,
      total: c.total,
    }));

    const sortedDates = Object.keys(dateMap).sort();
    let acumulado = 0;
    const timelineData = sortedDates.map((fecha) => {
      const sub = dateMap[fecha];
      acumulado += sub;
      return {
        fecha,
        ingresoDia: Number(sub.toFixed(2)),
        acumulado: Number(acumulado.toFixed(2)),
      };
    });

    const statusPieData = [
      { name: 'Pagadas', value: countPagadas, color: '#10b981' },
      { name: 'Pendientes', value: countPendientes, color: '#f59e0b' },
      { name: 'Vencidas', value: countVencidas, color: '#ef4444' },
    ].filter((item) => item.value > 0);

    return {
      totalFacturado,
      ticketPromedio,
      totalFacturas,
      topClientes,
      countPagadas,
      countPendientes,
      countVencidas,
      montoVencido,
      tasaMorosidad,
      mean,
      stdDev,
      threshold,
      outlierInvoices,
      proyeccionProximoCiclo,
      clientChartData,
      timelineData,
      statusPieData,
    };
  }, [filteredInvoices]);

  // Exportar reporte actual a CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert('No hay facturas en el filtro actual para exportar.');
      return;
    }

    const headers = [
      'N° Factura',
      'Cliente',
      'Identificacion',
      'Fecha Emision',
      'Fecha Vencimiento',
      'Moneda',
      'Estado',
      'Total con IVA 13%',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.numeroFactura || ''}"`,
      `"${inv.cliente?.nombre || ''}"`,
      `"${inv.cliente?.identificacion || ''}"`,
      `"${inv.fecha || ''}"`,
      `"${inv.dueDate || ''}"`,
      `"${inv.moneda || '$'}"`,
      `"${inv.estado || 'Emitida'}"`,
      getInvoiceTotal(inv).toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_facturacion_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentCurrencySymbol = currencyFilter === 'all' ? '$' : currencyFilter;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1150px', margin: '0 auto', textAlign: 'left' }}>
      {/* Cabecera & Controles de Filtro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.75rem', fontWeight: '800' }}>
            📊 Panel Analítico & Dashboard Administrativo
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Métricas ejecutivas, salud de cartera, proyecciones matemáticas y detección de anomalías
          </p>
        </div>

        {/* Botón de Exportación */}
        <Button variant="outline" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          📥 Exportar CSV
        </Button>
      </div>

      {/* Barra de Filtros: Período y Moneda */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>⏱️ Período:</span>
          <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.825rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: periodFilter === 'all' ? '#4f46e5' : '#f8fafc',
                color: periodFilter === 'all' ? '#ffffff' : '#475569',
                fontWeight: periodFilter === 'all' ? '700' : '500',
              }}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('month')}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.825rem',
                borderLeft: '1px solid #cbd5e1',
                borderTop: 'none',
                borderBottom: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                backgroundColor: periodFilter === 'month' ? '#4f46e5' : '#f8fafc',
                color: periodFilter === 'month' ? '#ffffff' : '#475569',
                fontWeight: periodFilter === 'month' ? '700' : '500',
              }}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('30days')}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.825rem',
                borderLeft: '1px solid #cbd5e1',
                borderTop: 'none',
                borderBottom: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                backgroundColor: periodFilter === '30days' ? '#4f46e5' : '#f8fafc',
                color: periodFilter === '30days' ? '#ffffff' : '#475569',
                fontWeight: periodFilter === '30days' ? '700' : '500',
              }}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('year')}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.825rem',
                borderLeft: '1px solid #cbd5e1',
                borderTop: 'none',
                borderBottom: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                backgroundColor: periodFilter === 'year' ? '#4f46e5' : '#f8fafc',
                color: periodFilter === 'year' ? '#ffffff' : '#475569',
                fontWeight: periodFilter === 'year' ? '700' : '500',
              }}
            >
              Este Año
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>💱 Divisa:</span>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '0.85rem',
              color: '#1e293b',
              fontWeight: '600',
            }}
          >
            <option value="all">Todas las monedas</option>
            <option value="$">Dólares ($ USD)</option>
            <option value="₡">Colones (₡ CRC)</option>
            <option value="€">Euros (€ EUR)</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            ({analytics.totalFacturas} facturas analizadas)
          </span>
        </div>
      </div>

      {/* 1. Métricas Clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        <Card style={{ borderLeft: '5px solid #4f46e5' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
            Total Facturado
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.35rem 0 0.2rem' }}>
            {currentCurrencySymbol}{analytics.totalFacturado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <small style={{ color: '#4f46e5', fontWeight: '600' }}>{analytics.totalFacturas} facturas en el período</small>
        </Card>

        <Card style={{ borderLeft: '5px solid #06b6d4' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
            Ticket Promedio
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.35rem 0 0.2rem' }}>
            {currentCurrencySymbol}{analytics.ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <small style={{ color: '#64748b' }}>Promedio por documento</small>
        </Card>

        <Card style={{ borderLeft: `5px solid ${analytics.countVencidas > 0 ? '#ef4444' : '#10b981'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Salud de Cartera
            </span>
            {analytics.tasaMorosidad > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                {analytics.tasaMorosidad.toFixed(1)}% mora
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem', alignItems: 'baseline' }}>
            <div>
              <span style={{ color: '#15803d', fontWeight: '800', fontSize: '1.35rem' }}>{analytics.countPagadas}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Pagadas</span>
            </div>
            <div>
              <span style={{ color: '#b45309', fontWeight: '800', fontSize: '1.35rem' }}>{analytics.countPendientes}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vigentes</span>
            </div>
            <div>
              <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '1.35rem' }}>{analytics.countVencidas}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vencidas</span>
            </div>
          </div>
        </Card>

        <Card style={{ borderLeft: '5px solid #8b5cf6' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
            Proyección Estimada
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#6d28d9', margin: '0.35rem 0 0.2rem' }}>
            {currentCurrencySymbol}{analytics.proyeccionProximoCiclo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <small style={{ color: '#64748b' }}>Estimación basada en ticket promedio</small>
        </Card>
      </div>

      {/* Sección Top Clientes y Detección de Anomalías */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Top 3 Clientes */}
        <Card>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏆 Top 3 Clientes por Volumen
          </h3>
          {analytics.topClientes.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay registros en el período seleccionado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.topClientes.map((c, idx) => (
                <div
                  key={c.nombre}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: idx === 0 ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${idx === 0 ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        backgroundColor: idx === 0 ? '#15803d' : '#64748b',
                        color: '#fff',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{c.nombre}</strong>
                  </div>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {currentCurrencySymbol}{c.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Detección Atípica (Outliers > 1.5 Desv. Estándar) con enlace interactivo */}
        <Card style={{ borderLeft: analytics.outlierInvoices.length > 0 ? '5px solid #ef4444' : '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚡ Detección de Facturas Atípicas
            </h3>
            <span
              style={{
                backgroundColor: analytics.outlierInvoices.length > 0 ? '#fee2e2' : '#f1f5f9',
                color: analytics.outlierInvoices.length > 0 ? '#991b1b' : '#64748b',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: '700',
              }}
            >
              {analytics.outlierInvoices.length} detectadas
            </span>
          </div>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.825rem', color: '#64748b' }}>
            Umbral estadístico (Media + 1.5 σ):{' '}
            <strong>{currentCurrencySymbol}{analytics.threshold.toFixed(2)}</strong> (σ = {currentCurrencySymbol}{analytics.stdDev.toFixed(2)})
          </p>
          {analytics.outlierInvoices.length === 0 ? (
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              No se han detectado ventas anormalmente altas (todas dentro de 1.5σ).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analytics.outlierInvoices.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.85rem',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <strong>{inv.numeroFactura}</strong> — {inv.cliente?.nombre}
                    <div style={{ fontSize: '0.75rem', color: '#be123c' }}>
                      Monto: <strong>{inv.moneda || currentCurrencySymbol}{inv.calculatedTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                  {onViewDetail && (
                    <Button
                      variant="outline"
                      onClick={() => onViewDetail(inv)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: '#f43f5e', color: '#e11d48', backgroundColor: '#ffffff' }}
                      title="Ver factura completa"
                    >
                      Ver Comprobante ➔
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Gráficos con Recharts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Gráfico de Barras: Distribución por Cliente */}
        <Card>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', color: '#1e293b' }}>
            Distribución de Facturación por Cliente
          </h3>
          <div style={{ width: '100%', height: 280 }}>
            {analytics.clientChartData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Sin datos suficientes en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.clientChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`${currentCurrencySymbol}${Number(value).toFixed(2)}`, 'Total Facturado']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Gráfico de Líneas: Ingresos Totales y Acumulados */}
        <Card>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', color: '#1e293b' }}>
            Tendencia Cronológica de Ingresos Acumulados
          </h3>
          <div style={{ width: '100%', height: 280 }}>
            {analytics.timelineData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Sin datos cronológicos en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip formatter={(value) => [`${currentCurrencySymbol}${Number(value).toFixed(2)}`]} />
                  <Legend />
                  <Line type="monotone" dataKey="acumulado" name="Total Acumulado" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ingresoDia" name="Facturado en el día" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Gráfico de Pastel: Distribución de Estados */}
      {analytics.statusPieData.length > 0 && (
        <Card style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1e293b', textAlign: 'center' }}>
            Proporción de Cobranza de Estados
          </h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
