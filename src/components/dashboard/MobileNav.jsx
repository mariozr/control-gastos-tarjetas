// components/dashboard/MobileNav.jsx
import { useEffect } from "react";

export default function MobileNav({
  isOpen,
  onClose,
  seccionActual,
  onChangeSeccion,
  menuItems,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Menú lateral mobile */}
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white z-50 shadow-xl transform transition-transform duration-300">
        {/* Header mobile */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">💰 ControlGastos</h1>
            <p className="text-xs text-gray-400">Gestión financiera</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Menu Items mobile */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onChangeSeccion(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                seccionActual === item.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium text-sm">{item.nombre}</p>
                <p className="text-xs opacity-75">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            Versión 2.0
            <br />© 2024 MarioyDalyApps ♥️
          </p>
        </div>
      </div>
    </>
  );
}
