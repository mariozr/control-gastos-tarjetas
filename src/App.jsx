import { useState } from "react";
import FormularioGasto from "./components/FormularioGasto";
import ListaGastos from "./components/ListaGastos";
import GraficosEstadisticos from "./components/GraficosEstadisticos";
import ToggleModoOscuro from "./components/ToggleModoOscuro";
import CuotasPendientes from "./components/CuotasPendientes";
import { useToast } from "./hooks/useToast";
import Toast from "./components/Toast";
import ResumenCreditos from "./components/ResumenCreditos";
import ResumenTarjetas from "./components/ResumenTarjetas";

function App() {
  const [recargarLista, setRecargarLista] = useState(0);
  const [recargarGraficos, setRecargarGraficos] = useState(0);
  const { toast, showToast, hideToast } = useToast();

  const handleGastoAgregado = () => {
    setRecargarLista((prev) => prev + 1);
    setRecargarGraficos((prev) => prev + 1);
    showToast("Gasto agregado correctamente", "success");
  };

  const handleGastoEliminado = () => {
    setRecargarGraficos((prev) => prev + 1);
    showToast("Gasto eliminado correctamente", "success");
  };

  const handleGastoEditado = () => {
    showToast("Gasto editado correctamente", "success");
  };

  const handleError = (mensaje) => {
    showToast(mensaje, "error");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <ToggleModoOscuro />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Control de Gastos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registra y controla tus gastos diarios
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <FormularioGasto
              onGastoAgregado={handleGastoAgregado}
              onError={handleError}
              onSuccess={handleGastoAgregado}
            />
          </div>
          <div>
            <div key={recargarGraficos}>
              <GraficosEstadisticos />
            </div>
          </div>
        </div>

        <div className="mt-6" key={recargarLista}>
          <ListaGastos
            onGastoEliminado={handleGastoEliminado}
            onGastoEditado={handleGastoEditado}
            onError={handleError}
          />
        </div>
        <br />
        <hr />
        <br />
        <CuotasPendientes />
        <ResumenCreditos />
        <ResumenTarjetas />
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}

export default App;
