import { createSignal, Component } from "solid-js";
import { findHost, ServerInfo } from "../../api/host/findHost";

export const ServerFinder: Component = () => {
  const [servers, setServers] = createSignal<ServerInfo[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleFindServers = async () => {
    setLoading(true);
    setError(null);

    try {
      const foundServers = await findHost();
      setServers(foundServers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find servers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="server-finder">
      <h2>Server Finder</h2>
      <button onClick={handleFindServers} disabled={loading()}>
        {loading() ? "Searching..." : "Find Servers"}
      </button>

      {error() && <div class="error">Error: {error()}</div>}

      {servers().length > 0 && (
        <div class="servers-list">
          <h3>Found Servers ({servers().length})</h3>
          {servers().map((server) => (
            <div class="server-item">
              <div class="server-info">
                <div>
                  <strong>IP:</strong> {server.ip}
                </div>
                <div>
                  <strong>Port:</strong> {server.port}
                </div>
                <div>
                  <strong>Status:</strong> {server.status}
                </div>
                <div>
                  <strong>Name:</strong> {server.name}
                </div>
                <div>
                  <strong>Message:</strong> {server.message}
                </div>
                <div>
                  <strong>Is Self:</strong> {server.is_self ? "Yes" : "No"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
