import { useState, useEffect, useCallback } from 'react';
import './App.css';
import InvoiceList from './invoices/InvoiceList';
import InvoiceForm from './invoices/InvoiceForm';
import Invoice from './invoices/Invoice';
import Dashboard from './dashboard/Dashboard';
import Button from './components/Button';
import {
  apiGetInvoiceById,
  loadApplicationData,
  apiSaveInvoice,
  apiUpdateInvoice,
  apiUpdateInvoiceStatus,
  apiDeleteInvoice,
  apiUpdateEmisor,
  checkBackendConnection,
} from './services/invoiceService';

function App() {
  // Estado para la lista de facturas
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [emisor, setEmisor] = useState({});
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Estado para controlar la vista actual ('list' por defecto)
  const [currentView, setCurrentView] = useState('list');

  // Estado para la factura seleccionada (detalle)
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Estado para edición o clonación de factura
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isCloning, setIsCloning] = useState(false);

  // Sistema de notificaciones flotantes (Toasts)
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = useCallback(async () => {
    const data = await loadApplicationData();
    setInvoices(data.invoices);
    setClients(data.clients);
    setProducts(data.products);
    setEmisor(data.emisor);
    setIsBackendConnected(data.isOnline);
    setIsCheckingConnection(false);
  }, []);

  // Carga inicial de datos desde json-server (o fallback a db.json / localStorage)
  useEffect(() => {
    let isMounted = true;
    loadApplicationData().then((data) => {
      if (isMounted) {
        setInvoices(data.invoices);
        setClients(data.clients);
        setProducts(data.products);
        setEmisor(data.emisor);
        setIsBackendConnected(data.isOnline);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Reintento manual de conexión
  const handleRetryConnection = async () => {
    setIsCheckingConnection(true);
    const online = await checkBackendConnection();
    setIsBackendConnected(online);
    if (online) {
      addToast('Conectado exitosamente con la API REST (db.json)', 'success');
      refreshData();
    } else {
      addToast('No se pudo conectar a json-server en puerto 3005. Operando en modo local.', 'info');
      setIsCheckingConnection(false);
    }
  };

  // Persistir en localStorage como respaldo local
  const persistLocally = (updatedInvoices) => {
    try {
      localStorage.setItem('facturacion_invoices', JSON.stringify(updatedInvoices));
    } catch {
      // Silencioso
    }
  };

  // Navegación
  const handleGoToList = () => {
    setEditingInvoice(null);
    setIsCloning(false);
    setCurrentView('list');
  };

  const handleGoToForm = () => {
    setEditingInvoice(null);
    setIsCloning(false);
    setCurrentView('form');
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setIsCloning(false);
    setCurrentView('form');
  };

  const handleDuplicateInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setIsCloning(true);
    setCurrentView('form');
  };

  const handleViewDetail = async (invoice) => {
    if (invoice?.id) {
      try {
        const fetched = await apiGetInvoiceById(invoice.id, isBackendConnected);
        if (fetched) {
          setSelectedInvoice(fetched);
          setCurrentView('detail');
          return;
        }
      } catch {
        // Fallback
      }
    }
    setSelectedInvoice(invoice);
    setCurrentView('detail');
  };

  // Guardar factura: emisión nueva o edición
  const handleSaveInvoice = async (invoiceData, saveEmisorAsDefault, isEditMode) => {
    try {
      if (saveEmisorAsDefault && invoiceData.emisor) {
        await apiUpdateEmisor(invoiceData.emisor, isBackendConnected);
        setEmisor(invoiceData.emisor);
      }

      let saved;
      let updatedList;

      if (isEditMode) {
        saved = await apiUpdateInvoice(invoiceData, isBackendConnected, clients, products);
        updatedList = invoices.map((inv) => (inv.id === saved.id ? saved : inv));
        addToast(`Factura ${saved.numeroFactura} actualizada exitosamente`, 'success');
      } else {
        saved = await apiSaveInvoice(invoiceData, isBackendConnected, clients, products);
        updatedList = [saved, ...invoices];
        addToast(`Factura ${saved.numeroFactura} emitida exitosamente`, 'success');
      }

      // Actualizar estado de React únicamente después de éxito confirmado
      setInvoices(updatedList);
      persistLocally(updatedList);

      // Guardar cliente orgánicamente si es nuevo
      if (invoiceData.cliente?.nombre && !clients.some((c) => c.identificacion === invoiceData.cliente.identificacion)) {
        setClients((prev) => [...prev, { id: `cli-${Date.now()}`, ...invoiceData.cliente }]);
      }

      // Guardar productos orgánicamente si son nuevos
      for (const item of invoiceData.items || []) {
        if (item.descripcion && !products.some((p) => p.descripcion.toLowerCase() === item.descripcion.toLowerCase())) {
          setProducts((prev) => [
            ...prev,
            { id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`, descripcion: item.descripcion, precio: item.precio },
          ]);
        }
      }

      setEditingInvoice(null);
      setIsCloning(false);
      setSelectedInvoice(saved);
      setCurrentView('detail');
    } catch (error) {
      addToast(error.message || 'Error al procesar la factura', 'error');
    }
  };

  // Eliminar factura: solo remueve de la UI si el servidor confirmó la eliminación
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      await apiDeleteInvoice(invoiceId, isBackendConnected);
      const updated = invoices.filter((inv) => inv.id !== invoiceId);

      // Actualizar estado de React únicamente después de éxito confirmado
      setInvoices(updated);
      persistLocally(updated);
      addToast('Factura eliminada correctamente', 'info');

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
        setCurrentView('list');
      }
    } catch (error) {
      addToast(error.message || 'Error al eliminar la factura', 'error');
    }
  };

  // Actualizar estado: solo refleja el cambio si el servidor respondió correctamente
  const handleUpdateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      await apiUpdateInvoiceStatus(invoiceId, newStatus, isBackendConnected);
      const updated = invoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, estado: newStatus } : inv
      );

      // Actualizar estado de React únicamente después de éxito confirmado
      setInvoices(updated);
      persistLocally(updated);
      addToast(`Estado de factura cambiado a: ${newStatus}`, 'info');

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev) => (prev ? { ...prev, estado: newStatus } : null));
      }
    } catch (error) {
      addToast(error.message || 'Error al actualizar estado', 'error');
    }
  };

  // Número consecutivo sugerido
  const suggestedNumber = `FAC-${String(invoices.length + 1).padStart(3, '0')}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#1e293b', width: '100%' }}>
      {/* Contenedor de Toasts flotantes */}
      <div className="toast-container" role="region" aria-label="Notificaciones">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-notification toast-${t.type}`}
            onClick={() => removeToast(t.id)}
            style={{ cursor: 'pointer' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#2563eb',
              }}
            />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Barra de navegación superior */}
      <header
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.85rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
          onClick={handleGoToList}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
            }}
          >
            NX
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                Nexura
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: '#e0e7ff',
                  color: '#4338ca',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                }}
              >
                Enterprise
              </span>
            </div>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Gestión Comercial, IVA 13% y Control Fiscal
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Indicador sobrio de estado del servidor */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              color: '#475569',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isBackendConnected ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
            <span>{isBackendConnected ? 'Servidor activo' : 'Modo local'}</span>
            {!isBackendConnected && (
              <button
                type="button"
                onClick={handleRetryConnection}
                disabled={isCheckingConnection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: 0,
                  textDecoration: 'underline',
                  fontWeight: '600',
                }}
              >
                {isCheckingConnection ? 'Conectando...' : 'Reconectar'}
              </button>
            )}
          </div>

          <Button
            variant={currentView === 'list' ? 'primary' : 'ghost'}
            onClick={handleGoToList}
          >
            Facturas ({invoices.length})
          </Button>
          <Button
            variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant={currentView === 'form' && !editingInvoice ? 'primary' : 'outline'}
            onClick={handleGoToForm}
          >
            + Nueva Factura
          </Button>
        </nav>
      </header>

      {/* Contenedor principal con renderizado condicional */}
      <main style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {currentView === 'list' && (
          <InvoiceList
            invoices={invoices}
            onNewInvoice={handleGoToForm}
            onViewDetail={handleViewDetail}
            onEditInvoice={handleEditInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onUpdateStatus={handleUpdateInvoiceStatus}
          />
        )}

        {currentView === 'form' && (
          <InvoiceForm
            onSave={handleSaveInvoice}
            onCancel={handleGoToList}
            suggestedInvoiceNumber={suggestedNumber}
            clients={clients}
            products={products}
            initialEmisor={emisor}
            invoiceToEdit={editingInvoice}
            isCloning={isCloning}
          />
        )}

        {currentView === 'detail' && (
          <Invoice
            invoice={selectedInvoice}
            onBack={handleGoToList}
            onEdit={handleEditInvoice}
            onDuplicate={handleDuplicateInvoice}
            onUpdateStatus={handleUpdateInvoiceStatus}
            onDelete={handleDeleteInvoice}
            onNotify={addToast}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard invoices={invoices} onViewDetail={handleViewDetail} />
        )}
      </main>
    </div>
  );
}

export default App;
