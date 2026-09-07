import { useState, useEffect } from 'react';
import InvoiceList from './invoices/InvoiceList';
import InvoiceForm from './invoices/InvoiceForm';
import Invoice from './invoices/Invoice';
import Dashboard from './dashboard/Dashboard';
import Button from './components/Button';
import {
  loadApplicationData,
  apiSaveInvoice,
  apiUpdateInvoiceStatus,
  apiDeleteInvoice,
  apiUpdateEmisor,
} from './services/invoiceService';

function App() {
  // Estado para la lista de facturas
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [emisor, setEmisor] = useState({});
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Estado para controlar la vista actual ('list' por defecto)
  const [currentView, setCurrentView] = useState('list');

  // Estado para la factura seleccionada
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Carga inicial de datos desde json-server (o fallback a db.json / localStorage)
  useEffect(() => {
    async function initData() {
      const data = await loadApplicationData();
      setInvoices(data.invoices);
      setClients(data.clients);
      setProducts(data.products);
      setEmisor(data.emisor);
      setIsBackendConnected(data.isOnline);
    }
    initData();
  }, []);

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
    setCurrentView('list');
  };

  const handleGoToForm = () => {
    setCurrentView('form');
  };

  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('detail');
  };

  // Guardar factura: el estado de la UI solo se actualiza tras respuesta exitosa del servidor
  const handleSaveInvoice = async (newInvoice, saveEmisorAsDefault) => {
    try {
      if (saveEmisorAsDefault && newInvoice.emisor) {
        await apiUpdateEmisor(newInvoice.emisor, isBackendConnected);
        setEmisor(newInvoice.emisor);
      }

      const saved = await apiSaveInvoice(newInvoice, isBackendConnected, clients, products);
      const updated = [saved, ...invoices];

      // Actualizar estado de React únicamente después de éxito confirmado
      setInvoices(updated);
      persistLocally(updated);

      // Guardar cliente orgánicamente si es nuevo
      if (newInvoice.cliente?.nombre && !clients.some((c) => c.identificacion === newInvoice.cliente.identificacion)) {
        setClients((prev) => [...prev, { id: `cli-${Date.now()}`, ...newInvoice.cliente }]);
      }

      // Guardar productos orgánicamente si son nuevos
      for (const item of newInvoice.items || []) {
        if (item.descripcion && !products.some((p) => p.descripcion.toLowerCase() === item.descripcion.toLowerCase())) {
          setProducts((prev) => [...prev, { id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`, descripcion: item.descripcion, precio: item.precio }]);
        }
      }

      setSelectedInvoice(saved);
      setCurrentView('detail');
    } catch (error) {
      alert(error.message);
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

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
        setCurrentView('list');
      }
    } catch (error) {
      alert(error.message);
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

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice((prev) => (prev ? { ...prev, estado: newStatus } : null));
      }
    } catch (error) {
      alert(error.message);
    }
  };

  // Número consecutivo sugerido
  const suggestedNumber = `FAC-${String(invoices.length + 1).padStart(3, '0')}`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#1e293b', width: '100%' }}>
      {/* Barra de navegación superior con estado de db.json */}
      <header
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.85rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={handleGoToList}
        >
          <span style={{ fontSize: '1.6rem' }}>🧾</span>
          <div>
            <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
              Sistema de Manipulación de Facturas
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Gestión comercial, IVA 13% dinámico y exportación PDF oficial
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Button
            variant={currentView === 'list' ? 'primary' : 'ghost'}
            onClick={handleGoToList}
          >
            📋 Facturas ({invoices.length})
          </Button>
          <Button
            variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
            onClick={() => setCurrentView('dashboard')}
          >
            📊 Dashboard Admin
          </Button>
          <Button
            variant={currentView === 'form' ? 'primary' : 'outline'}
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
          />
        )}

        {currentView === 'detail' && (
          <Invoice
            invoice={selectedInvoice}
            onBack={handleGoToList}
            onUpdateStatus={handleUpdateInvoiceStatus}
            onDelete={handleDeleteInvoice}
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
