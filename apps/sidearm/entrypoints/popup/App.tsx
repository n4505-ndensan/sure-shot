import { createSignal } from "solid-js";
import shotLogo from "@/assets/icon.png";
import "./App.css";

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <>
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
          gap: "8px",
        }}
      >
        <a href="https://localhost:3000" target="_blank">
          <img src={shotLogo} alt="sure-shot logo" width={16} height={16} />
        </a>
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
      </div>
      <div class="card">
        <p>...</p>
      </div>
    </>
  );
}

export default App;
