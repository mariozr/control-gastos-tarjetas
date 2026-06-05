// App.jsx
import { useToast } from "./hooks/useToast";
import Toast from "./components/Toast";
import Dashboard from "./components/dashboard/Dashboard";

function App() {
  const { toast, showToast, hideToast } = useToast();

  return (
    <div className="App">
      <Dashboard
        onError={(msg) => showToast(msg, "error")}
        onSuccess={(msg) => showToast(msg, "success")}
        showToast={showToast}
        toast={toast}
        hideToast={hideToast}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}

export default App;
