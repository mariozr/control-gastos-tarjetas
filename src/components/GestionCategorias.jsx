import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";

export default function GestionCategorias({
  onCategoriaCambiada,
  onError,
  onSuccess,
}) {
  const [categorias, setCategorias] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: "",
    color: "#8884D8",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre");

    if (!error && data) {
      setCategorias(data);
    }
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.nombre.trim()) {
      onError("El nombre de la categoría es requerido");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("categorias")
      .insert([nuevaCategoria]);

    if (error) {
      onError("Error al agregar categoría: " + error.message);
    } else {
      await cargarCategorias();
      setNuevaCategoria({ nombre: "", color: "#8884D8" });
      setMostrarModal(false);
      if (onCategoriaCambiada) onCategoriaCambiada();
      if (onSuccess) onSuccess("Categoría agregada correctamente");
    }
    setLoading(false);
  };

  const eliminarCategoria = async (id) => {
    if (confirm("¿Estás seguro de eliminar esta categoría?")) {
      const { error } = await supabase.from("categorias").delete().eq("id", id);

      if (error) {
        onError("Error al eliminar categoría: " + error.message);
      } else {
        await cargarCategorias();
        if (onCategoriaCambiada) onCategoriaCambiada();
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
      >
        + Gestionar Categorías
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Gestionar Categorías</h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Formulario para nueva categoría */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold mb-3">Agregar nueva categoría</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre de la categoría"
                  value={nuevaCategoria.nombre}
                  onChange={(e) =>
                    setNuevaCategoria({
                      ...nuevaCategoria,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={nuevaCategoria.color}
                    onChange={(e) =>
                      setNuevaCategoria({
                        ...nuevaCategoria,
                        color: e.target.value,
                      })
                    }
                    className="h-10 w-20"
                  />
                  <button
                    onClick={agregarCategoria}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    {loading ? "Agregando..." : "Agregar"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de categorías existentes */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h4 className="font-semibold mb-2">Categorías existentes</h4>
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.nombre}</span>
                  </div>
                  <button
                    onClick={() => eliminarCategoria(cat.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
