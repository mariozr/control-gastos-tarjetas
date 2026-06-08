// components/GestionTarjetas.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";

export default function GestionTarjetas({
  onTarjetaCambiada,
  onError,
  onSuccess,
}) {
  const [tarjetas, setTarjetas] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoTarjeta, setEditandoTarjeta] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    entidad_id: "",
    ultimos_digitos: "",
    color: "#3B82F6",
    limite: "",
    dia_cierre: "",
    dia_vencimiento: "",
    favorita: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarTarjetas();
    cargarEntidades();
  }, []);

  const cargarTarjetas = async () => {
    const { data, error } = await supabase
      .from("tarjetas_credito")
      .select("*, entidades(nombre, color)")
      .order("favorita", { ascending: false })
      .order("nombre");

    if (!error && data) {
      setTarjetas(data);
    }
  };

  const cargarEntidades = async () => {
    const { data, error } = await supabase
      .from("entidades")
      .select("*")
      .order("nombre");

    if (!error && data) {
      setEntidades(data);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const guardarTarjeta = async () => {
    if (!formData.nombre.trim()) {
      onError("El nombre de la tarjeta es requerido");
      return;
    }
    if (!formData.ultimos_digitos || formData.ultimos_digitos.length !== 4) {
      onError("Los últimos 4 dígitos son requeridos");
      return;
    }

    setLoading(true);

    // Si es favorita, desmarcar las demás
    if (formData.favorita) {
      await supabase
        .from("tarjetas_credito")
        .update({ favorita: false })
        .eq("usuario_id", (await supabase.auth.getUser()).data.user?.id);
    }

    const dataToSave = {
      ...formData,
      limite: formData.limite ? parseFloat(formData.limite) : null,
    };

    let error;
    if (editandoTarjeta) {
      const { error: updateError } = await supabase
        .from("tarjetas_credito")
        .update(dataToSave)
        .eq("id", editandoTarjeta.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("tarjetas_credito")
        .insert([dataToSave]);
      error = insertError;
    }

    if (error) {
      onError("Error al guardar tarjeta: " + error.message);
    } else {
      alert(editandoTarjeta ? "Tarjeta actualizada" : "Tarjeta agregada");
      await cargarTarjetas();
      setMostrarModal(false);
      resetForm();
      if (onTarjetaCambiada) onTarjetaCambiada();
    }
    setLoading(false);
  };

  const eliminarTarjeta = async (id) => {
    if (
      confirm(
        "¿Eliminar esta tarjeta? Se perderá el historial de gastos asociados",
      )
    ) {
      const { error } = await supabase
        .from("tarjetas_credito")
        .delete()
        .eq("id", id);

      if (error) {
        onError("Error al eliminar: " + error.message);
      } else {
        onSuccess("Tarjeta eliminada");
        await cargarTarjetas();
        if (onTarjetaCambiada) onTarjetaCambiada();
      }
    }
  };

  const resetForm = () => {
    setEditandoTarjeta(null);
    setFormData({
      nombre: "",
      entidad_id: "",
      ultimos_digitos: "",
      color: "#3B82F6",
      limite: "",
      dia_cierre: "",
      dia_vencimiento: "",
      favorita: false,
    });
  };

  const editarTarjeta = (tarjeta) => {
    setEditandoTarjeta(tarjeta);
    setFormData({
      nombre: tarjeta.nombre,
      entidad_id: tarjeta.entidad_id || "",
      ultimos_digitos: tarjeta.ultimos_digitos,
      color: tarjeta.color || "#3B82F6",
      limite: tarjeta.limite || "",
      dia_cierre: tarjeta.dia_cierre || "",
      dia_vencimiento: tarjeta.dia_vencimiento || "",
      favorita: tarjeta.favorita || false,
    });
    setMostrarModal(true);
  };

  return (
    <>
      <button
        onClick={() => {
          resetForm();
          setMostrarModal(true);
        }}
        className="text-sm w-full bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
      >
        + Agregar Tarjeta
      </button>

      {/* Lista de tarjetas existentes */}
      {tarjetas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-between">
          {tarjetas.map((tarjeta) => (
            <div
              key={tarjeta.id}
              className="contenedor-tarjeta flex items-center gap-2 px-2 py-1 rounded-lg text-sm border cursor-pointer hover:shadow-md transition-all"
              style={{
                backgroundColor: `${tarjeta.color}10`,
                borderColor: tarjeta.color,
              }}
              onClick={() => editarTarjeta(tarjeta)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tarjeta.color }}
              />
              <span className="font-medium text-gray-900 dark:text-gray-300">
                {tarjeta.nombre}
              </span>
              <span className="text-gray-900 dark:text-gray-300">
                •••• {tarjeta.ultimos_digitos}
              </span>
              {tarjeta.favorita && (
                <span className="text-xs text-yellow-500">⭐</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  eliminarTarjeta(tarjeta.id);
                }}
                className="text-red-500 hover:text-red-700 ml-auto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de gestión */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {editandoTarjeta ? "Editar Tarjeta" : "Nueva Tarjeta"}
              </h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la tarjeta
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Visa Gold, Mastercard Black"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entidad bancaria
                </label>
                <select
                  name="entidad_id"
                  value={formData.entidad_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Seleccionar entidad</option>
                  {entidades.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Últimos 4 dígitos
                </label>
                <input
                  type="text"
                  name="ultimos_digitos"
                  value={formData.ultimos_digitos}
                  onChange={handleChange}
                  maxLength="4"
                  pattern="[0-9]{4}"
                  placeholder="1234"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Día de cierre
                  </label>
                  <input
                    type="number"
                    name="dia_cierre"
                    value={formData.dia_cierre}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    placeholder="Ej: 15"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Día de vencimiento
                  </label>
                  <input
                    type="number"
                    name="dia_vencimiento"
                    value={formData.dia_vencimiento}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    placeholder="Ej: 5"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Límite de crédito (opcional)
                </label>
                <input
                  type="number"
                  name="limite"
                  value={formData.limite}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="$0.00"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color de la tarjeta
                </label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="favorita"
                  checked={formData.favorita}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Marcar como tarjeta favorita
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={guardarTarjeta}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
