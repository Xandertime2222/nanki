import { useState, useEffect } from "react";

function App() {
  const [status, setStatus] = useState("connecting");
  const [backendInfo, setBackendInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkBackend() {
    try {
      const res = await fetch("http://localhost:8642/health");
      const data = await res.json();
      setBackendInfo(data);
      setStatus("connected");
      setError(null);
    } catch {
      setStatus("connecting");
      setError("Backend not reachable");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Nanki</h1>
      <div style={{
        padding: "1rem",
        borderRadius: "8px",
        background: status === "connected" ? "#d4edda" : "#fff3cd",
        marginBottom: "1rem"
      }}>
        <strong>Status:</strong> {status === "connected" ? "Connected to backend" : "Connecting to backend..."}
      </div>
      {backendInfo && (
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
          {JSON.stringify(backendInfo, null, 2)}
        </pre>
      )}
      {error && status !== "connected" && (
        <p style={{ color: "#856404" }}>{error}</p>
      )}
    </div>
  );
}

export default App;