// components/dashboard/Header.jsx
import ToggleModoOscuro from "../ToggleModoOscuro";

export default function Header({
  seccionActual,
  onToggleMobileMenu,
  menuItems,
}) {
  const currentItem = menuItems.find((item) => item.id === seccionActual);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* Botón menú mobile */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <svg
            className="w-6 h-6 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Título de la sección */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentItem?.icon}</span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
              {currentItem?.nombre}
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {currentItem?.description}
          </p>
        </div>
      </div>

      <ToggleModoOscuro />
    </header>
  );
}
