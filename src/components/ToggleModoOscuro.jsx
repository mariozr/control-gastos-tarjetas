import { useState, useEffect } from "react";

export default function ToggleModoOscuro() {
  const [modoOscuro, setModoOscuro] = useState(false);

  useEffect(() => {
    // Verificar preferencia guardada en localStorage
    const guardado = localStorage.getItem("modoOscuro");
    if (guardado !== null) {
      const esOscuro = guardado === "true";
      setModoOscuro(esOscuro);
      if (esOscuro) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Verificar preferencia del sistema
      const preferenciaSistema = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setModoOscuro(preferenciaSistema);
      if (preferenciaSistema) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleModoOscuro = () => {
    const nuevoModo = !modoOscuro;
    setModoOscuro(nuevoModo);
    localStorage.setItem("modoOscuro", nuevoModo);

    if (nuevoModo) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggleModoOscuro}
      className="fixed top-4 right-4 z-50 bg-gray-200 dark:bg-gray-700 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
      aria-label="Cambiar modo oscuro"
    >
      {modoOscuro ? (
        <svg
          className="w-6 h-6 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 text-gray-800 dark:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
