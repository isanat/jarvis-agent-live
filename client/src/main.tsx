import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Diagnostic: capture any uncaught error before/during React mount and show in DOM
function showFatalError(msg: string) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="font-family:monospace;padding:2rem;background:#1a1a2e;color:#f87171;min-height:100vh;white-space:pre-wrap;word-break:break-all">
<b style="font-size:1.2rem">Erro de inicialização</b>\n\n${msg}
</div>`;
  }
}

window.addEventListener("error", (e) => {
  showFatalError(`window.onerror:\n${e.message}\n${e.filename}:${e.lineno}\n${e.error?.stack ?? ""}`);
});

window.addEventListener("unhandledrejection", (e) => {
  showFatalError(`Unhandled Promise Rejection:\n${e.reason?.stack ?? String(e.reason)}`);
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err: unknown) {
  showFatalError(`createRoot/render threw:\n${err instanceof Error ? err.stack : String(err)}`);
}
