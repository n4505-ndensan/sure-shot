import { createSignal } from "solid-js";
import shotLogo from "@/assets/icon.png";
import "./App.css";

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <>
      <a
        href="https://localhost:3000"
        target="_blank"
        style={{
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
          gap: "8px",
        }}
      >
        <img src={shotLogo} alt="sure-shot logo" width={16} height={16} />
        <p
          style={{
            "font-size": "12px",
            "font-weight": "bold",
            padding: 0,
            margin: 0,
            "margin-bottom": "4px",
          }}
        >
          sure-shot
        </p>
      </a>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count()}
        </button>
        <p>
          Edit <code>popup/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the WXT and Solid logos to learn more
      </p>
    </>
  );
}

export default App;
