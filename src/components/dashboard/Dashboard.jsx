// components/dashboard/Dashboard.jsx
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import FormularioGasto from "../FormularioGasto";
import FormularioTarjetaCredito from "../FormularioTarjetaCredito"; // ✅ Agregar esta importación
import GraficosEstadisticos from "../GraficosEstadisticos";
import ListaGastos from "../ListaGastos";
import CuotasPendientes from "../CuotasPendientes";
import ResumenCreditos from "../ResumenCreditos";
import ResumenTarjetas from "../ResumenTarjetas";

const menuItems = [
  {
    id: "nuevo-gasto",
    nombre: "Nuevo Gasto",
    icon: "💰",
    description: "Registrar un nuevo gasto",
  },
  {
    id: "estadisticas",
    nombre: "Estadísticas",
    icon: "📊",
    description: "Gráficos y análisis",
  },
  {
    id: "gastos",
    nombre: "Gastos",
    icon: "📋",
    description: "Lista de todos los gastos",
  },
  {
    id: "cuotas-pendientes",
    nombre: "Cuotas Pendientes",
    icon: "⏰",
    description: "Próximos vencimientos",
  },
  {
    id: "compras-credito",
    nombre: "Compras a Crédito",
    icon: "🏦",
    description: "Compras activas en cuotas",
  },
  {
    id: "mis-tarjetas",
    nombre: "Mis Tarjetas",
    icon: "💳",
    description: "Gestionar tarjetas de crédito",
  },
];

export default function Dashboard({
  onError,
  onSuccess,
  showToast,
  toast,
  hideToast,
}) {
  const [seccionActual, setSeccionActual] = useState("nuevo-gasto");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados para las categorías y formas de pago
  const [categorias, setCategorias] = useState([]);
  const [formasPago, setFormasPago] = useState([]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const renderSeccion = () => {
    switch (seccionActual) {
      case "nuevo-gasto":
        return (
          <div className="space-y-6">
            <FormularioGasto
              key="formulario-simple"
              onGastoAgregado={handleRefresh}
              onError={onError}
              onSuccess={onSuccess}
            />
            {/*             <FormularioTarjetaCredito
              key="formulario-credito"
              categorias={categorias}
              formasPago={formasPago}
              onGastoAgregado={handleRefresh}
              onError={onError}
              onSuccess={onSuccess}
            /> */}
          </div>
        );

      case "estadisticas":
        return <GraficosEstadisticos key={refreshKey} onError={onError} />;

      case "gastos":
        return (
          <ListaGastos
            key={refreshKey}
            onGastoEliminado={handleRefresh}
            onGastoEditado={handleRefresh}
            onError={onError}
          />
        );

      case "cuotas-pendientes":
        return <CuotasPendientes key={refreshKey} onError={onError} />;

      case "compras-credito":
        return <ResumenCreditos key={refreshKey} />;

      case "mis-tarjetas":
        return <ResumenTarjetas key={refreshKey} />;

      default:
        return (
          <div className="space-y-6">
            <FormularioGasto
              onGastoAgregado={handleRefresh}
              onError={onError}
              onSuccess={onSuccess}
            />
            {/*       <FormularioTarjetaCredito
              categorias={categorias}
              formasPago={formasPago}
              onGastoAgregado={handleRefresh}
              onError={onError}
              onSuccess={onSuccess}
            /> */}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        seccionActual={seccionActual}
        onChangeSeccion={setSeccionActual}
      />

      <div className="md:ml-64 transition-all duration-300">
        <Header
          seccionActual={seccionActual}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          menuItems={menuItems}
        />

        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{renderSeccion()}</div>
        </main>
      </div>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        seccionActual={seccionActual}
        onChangeSeccion={setSeccionActual}
        menuItems={menuItems}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          {/* Aquí va tu componente Toast */}
        </div>
      )}
    </div>
  );
}
