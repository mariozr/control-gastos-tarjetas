// components/dashboard/Sidebar.jsx
import { useState } from "react";

export default function Sidebar({
  seccionActual,
  onChangeSeccion,
  onCloseMobile,
}) {
  const [cerrado, setCerrado] = useState(false);

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

  const toggleSidebar = () => {
    setCerrado(!cerrado);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-white transition-all duration-300 z-20 ${
          cerrado ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div
          className={`p-4 border-b border-gray-700 flex items-center ${cerrado ? "justify-center" : "justify-between"}`}
        >
          {!cerrado && (
            <div>
              <h1 className="text-xl font-bold">💰 ControlGastos</h1>
              <p className="text-xs text-gray-400">Gestión financiera</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-700 transition"
          >
            {cerrado ? "→" : "←"}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onChangeSeccion(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
                seccionActual === item.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              title={cerrado ? item.nombre : ""}
            >
              <span className="text-2xl">{item.icon}</span>
              {!cerrado && (
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">{item.nombre}</p>
                  <p className="text-xs opacity-75">{item.description}</p>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 ${cerrado ? "text-center" : ""}`}
        >
          {!cerrado && (
            <p className="text-xs text-gray-400 text-center">
              Versión 2.0
              <br />© 2026 MarioyDalyApps ♥️
            </p>
          )}
          {cerrado && <p className="text-xs text-gray-400">v2.0</p>}
        </div>
      </aside>

      {/* Espaciador para desktop */}
      <div
        className={`hidden md:block transition-all duration-300 ${cerrado ? "ml-20" : "ml-64"}`}
      />
    </>
  );
}
