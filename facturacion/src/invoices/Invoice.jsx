import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import QRCode from 'qrcode';

export default function Invoice({
  invoice,
  onBack,
  onEdit,
  onDuplicate,
  onUpdateStatus,
  onNotify,
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const items = invoice?.items || [];

  // REGLA ESTRICTA: Cálculos al vuelo en tiempo de render
  const subtotal = items.reduce((acc, item) => {
    const base = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
    const desc = Math.min(100, Math.max(0, Number(item.descuento) || 0));
    return acc + base * (1 - desc / 100);
  }, 0);
  const iva = subtotal * 0.13;
  const total = subtotal + iva;
  const moneda = invoice?.moneda || '$';
  const estado = invoice?.estado || 'Emitida';

  // Texto real codificado en el código QR para escaneo directo con cámara
  const qrText = invoice
    ? [
        `=== FACTURA ELECTRÓNICA ===`,
        `N°: ${invoice.numeroFactura}`,
        `Fecha: ${invoice.fecha}`,
        `Emisor: ${invoice.emisor?.nombre || 'N/A'} (ID: ${invoice.emisor?.identificacion || 'N/A'})`,
        `Cliente: ${invoice.cliente?.nombre || 'N/A'} (ID: ${invoice.cliente?.identificacion || 'N/A'})`,
        `Subtotal: ${moneda}${subtotal.toFixed(2)}`,
        `IVA (13%): ${moneda}${iva.toFixed(2)}`,
        `Total: ${moneda}${total.toFixed(2)}`,
        `Estado: ${estado}`,
        `Clave: ${invoice.claveNumerica || 'N/A'}`,
      ].join('\n')
    : '';

  // Generación del código QR real y escaneable
  useEffect(() => {
    if (!qrText) return;
    let isMounted = true;
    QRCode.toDataURL(qrText, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch(() => {
        if (isMounted) {
          setQrCodeUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=1&data=${encodeURIComponent(
              qrText
            )}`
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [qrText]);

  if (!invoice) {
    return (
      <Card style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No se ha seleccionado ninguna factura.</p>
        {onBack && (
          <Button variant="secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
            ← Volver al Listado
          </Button>
        )}
      </Card>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Copiar resumen formateado para WhatsApp / Correo
  const handleCopyWhatsApp = () => {
    const lines = [
      `*Factura Comercial: ${invoice.numeroFactura}*`,
      `*Emisor:* ${invoice.emisor?.nombre || ''}`,
      `*Cliente:* ${invoice.cliente?.nombre || ''}`,
      `*Total a pagar:* ${moneda}${total.toFixed(2)} (IVA 13% inc.)`,
      `*Emisión:* ${invoice.fecha}${invoice.dueDate ? ` | *Vence:* ${invoice.dueDate}` : ''}`,
      `*Medio de Pago:* ${invoice.metodoPago || 'Transferencia / SINPE'}`,
      `*Estado:* ${estado}`,
      invoice.claveNumerica ? `*Clave Hacienda:* ${invoice.claveNumerica}` : '',
      `\n¡Gracias por su preferencia!`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      if (onNotify) {
        onNotify('Resumen copiado al portapapeles', 'success');
      }
    });
  };

  // Descargar factura en JSON estructurado
  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `factura_${invoice.numeroFactura || invoice.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (onNotify) {
      onNotify('Archivo JSON descargado correctamente', 'info');
    }
  };

  const getStatusBadgeStyle = (currentEstado) => {
    switch (currentEstado) {
      case 'Pagada':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      case 'Anulada':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      default:
        return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
    }
  };

  const badgeStyle = getStatusBadgeStyle(estado);

  return (
    <>
      {/* Estilos CSS con @media print para salida en PDF A4 limpia */}
      <style>{`
        @media print {
          .no-print,
          .no-print * {
            display: none !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }

          #root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          .invoice-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }

          @page {
            margin: 1.2cm;
            size: A4 portrait;
          }
        }
      `}</style>

      <Card
        className="invoice-card"
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          textAlign: 'left',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          position: 'relative',
        }}
      >
        {/* Barra superior de acciones (oculta en impresión) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {onBack ? (
            <Button variant="secondary" onClick={onBack}>
              ← Volver al Listado
            </Button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(invoice)}>
                Editar
              </Button>
            )}

            {onDuplicate && (
              <Button variant="outline" onClick={() => onDuplicate(invoice)}>
                Duplicar
              </Button>
            )}

            <Button variant="secondary" onClick={handleCopyWhatsApp} title="Copiar texto listo para enviar por mensajería">
              Copiar WhatsApp
            </Button>

            <Button variant="secondary" onClick={handleDownloadJSON} title="Descargar datos en JSON">
              Exportar JSON
            </Button>

            {onUpdateStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Estado:</span>
                <select
                  value={estado}
                  onChange={(e) => onUpdateStatus(invoice.id, e.target.value)}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="Emitida">Emitida</option>
                  <option value="Pagada">Pagada</option>
                  <option value="Anulada">Anulada</option>
                </select>
              </div>
            )}

            <Button variant="primary" onClick={handlePrint}>
              Imprimir PDF
            </Button>
          </div>
        </div>

        {/* Encabezado de la Factura: Emisor e Identificación */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Datos del Emisor */}
          <div style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
                {invoice.emisor?.nombre}
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.55' }}>
              {invoice.emisor?.identificacion && <p style={{ margin: 0 }}><strong>Cédula / Identificación:</strong> {invoice.emisor.identificacion}</p>}
              {invoice.emisor?.email && <p style={{ margin: 0 }}><strong>Correo Electrónico:</strong> {invoice.emisor.email}</p>}
              {invoice.emisor?.direccion && <p style={{ margin: 0 }}><strong>Dirección Comercial:</strong> {invoice.emisor.direccion}</p>}
            </div>
          </div>

          {/* Bloque Factura N°, Fecha y Estado */}
          <div
            style={{
              textAlign: 'right',
              background: '#f8fafc',
              padding: '1.25rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              minWidth: '240px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1
                style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: '#4f46e5',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                FACTURA
              </h1>
              <span
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  border: `1px solid ${badgeStyle.border}`,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                }}
              >
                {estado.toUpperCase()}
              </span>
            </div>

            <p style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>
              <strong>N°:</strong> {invoice.numeroFactura}
            </p>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#475569' }}>
              <strong>Fecha:</strong> {invoice.fecha}
            </p>
            {invoice.dueDate && (
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
                <strong>Vencimiento:</strong> {invoice.dueDate}
              </p>
            )}
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
              <strong>Moneda:</strong> {moneda === '₡' ? 'CRC (₡)' : moneda === '€' ? 'EUR (€)' : 'USD ($)'}
            </p>
          </div>
        </div>

        {/* Clave Numérica Fiscal de Comprobante */}
        {invoice.claveNumerica && (
          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
              color: '#475569',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
              wordBreak: 'break-all',
              border: '1px dashed #cbd5e1',
            }}
          >
            <strong>Clave Numérica de Hacienda:</strong> {invoice.claveNumerica}
          </div>
        )}

        {/* Datos del Cliente y Condiciones Comerciales */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Facturar A (Receptor)
            </span>
            <div style={{ marginTop: '0.35rem', color: '#334155', fontSize: '0.875rem', lineHeight: '1.5' }}>
              <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
                {invoice.cliente?.nombre}
              </p>
              {invoice.cliente?.identificacion && <p style={{ margin: 0 }}><strong>ID / Cédula:</strong> {invoice.cliente.identificacion}</p>}
              {invoice.cliente?.email && <p style={{ margin: 0 }}><strong>Email:</strong> {invoice.cliente.email}</p>}
              {invoice.cliente?.direccion && <p style={{ margin: 0 }}><strong>Dirección:</strong> {invoice.cliente.direccion}</p>}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Términos Comerciales
            </span>
            <div style={{ marginTop: '0.35rem', color: '#334155', fontSize: '0.875rem', lineHeight: '1.5' }}>
              <p style={{ margin: 0 }}><strong>Condición de Venta:</strong> {invoice.condicionVenta || 'Contado'}</p>
              <p style={{ margin: 0 }}><strong>Medio de Pago:</strong> {invoice.metodoPago || 'Transferencia / SINPE'}</p>
              <p style={{ margin: 0 }}><strong>Impuesto Aplicado:</strong> IVA General 13%</p>
            </div>
          </div>
        </div>

        {/* Tabla de Ítems */}
        <div style={{ marginBottom: '2rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#334155', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem 0.5rem', width: '6%', textAlign: 'center' }}>#</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '46%' }}>Descripción del Bien / Servicio</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '10%', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '14%', textAlign: 'right' }}>Precio Unit.</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '10%', textAlign: 'center' }}>Desc %</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '14%', textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const base = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
                const desc = Math.min(100, Math.max(0, Number(item.descuento) || 0));
                const itemImporte = base * (1 - desc / 100);

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500', color: '#1e293b' }}>
                      {item.descripcion}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#475569' }}>
                      {item.cantidad}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#475569' }}>
                      {moneda}{Number(item.precio).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b' }}>
                      {desc > 0 ? `${desc}%` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                      {moneda}{itemImporte.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sección Inferior: QR Real Escaneable y Totales */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginTop: '1.5rem',
          }}
        >
          {/* Código QR Real */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: '#f8fafc',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Código QR Factura"
                width="84"
                height="84"
                style={{
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                Generando QR...
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.45' }}>
              <strong style={{ color: '#1e293b', fontSize: '0.8rem' }}>Verificación Digital</strong>
              <div>Comprobante Electrónico</div>
              <div style={{ color: '#10b981', fontWeight: '600' }}>Válido para efectos fiscales</div>
            </div>
          </div>

          {/* Desglose de Totales */}
          <div
            style={{
              width: '100%',
              maxWidth: '320px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.95rem' }}>
              <span style={{ color: '#475569' }}>Subtotal Neto:</span>
              <strong style={{ color: '#1e293b' }}>{moneda}{subtotal.toFixed(2)}</strong>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: '0.95rem' }}>
              <span style={{ color: '#475569' }}>IVA (13%):</span>
              <strong style={{ color: '#1e293b' }}>{moneda}{iva.toFixed(2)}</strong>
            </div>
            <div
              style={{
                padding: '0.85rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                fontSize: '1.2rem',
                fontWeight: '800',
              }}
            >
              <span style={{ color: '#0f172a' }}>Total Pagar:</span>
              <span style={{ color: '#4f46e5' }}>{moneda}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div
          style={{
            marginTop: '3.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.825rem',
          }}
        >
          <p style={{ margin: 0 }}>
            Autorizado mediante resolución de la Dirección General de Tributación • Documento generado digitalmente
          </p>
        </div>
      </Card>
    </>
  );
}
