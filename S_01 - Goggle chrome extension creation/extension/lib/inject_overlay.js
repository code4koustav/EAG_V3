/**
 * Injects a floating panel into the active page (MAIN world).
 * Serialized via chrome.scripting.executeScript — keep self-contained.
 */
function summaryGoInjectOverlay(payload) {
  const NS = "summarygo-floating";
  document.getElementById(NS)?.remove();

  const shell = document.createElement("div");
  shell.id = NS;
  shell.setAttribute(
    "style",
    [
      "all:initial",
      "position:fixed",
      "z-index:2147483646",
      "inset:0",
      "pointer-events:none",
      "font-family:system-ui,Segoe UI,Roboto,sans-serif",
    ].join(";")
  );

  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    [
      "pointer-events:auto",
      "position:fixed",
      "right:20px",
      "bottom:24px",
      "width:min(420px,calc(100vw - 40px))",
      "max-height:min(70vh,520px)",
      "overflow:auto",
      "border-radius:16px",
      "padding:18px 18px 16px",
      "color:#e2e8f0",
      "background:linear-gradient(145deg,rgba(15,23,42,.97),rgba(30,41,59,.94))",
      "border:1px solid rgba(45,212,163,.35)",
      "box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.04) inset",
      "backdrop-filter:blur(10px)",
    ].join(";")
  );

  const badge = document.createElement("div");
  badge.textContent = "SummaryGo";
  badge.setAttribute(
    "style",
    [
      "display:inline-block",
      "font-size:11px",
      "letter-spacing:.12em",
      "text-transform:uppercase",
      "color:#2dd4a3",
      "margin-bottom:10px",
      "font-weight:600",
    ].join(";")
  );

  const title = document.createElement("h2");
  title.textContent = payload.heading || "Result";
  title.setAttribute(
    "style",
    "margin:0 0 10px;font-size:18px;line-height:1.25;color:#f8fafc;font-weight:650;"
  );

  const body = document.createElement("div");
  body.setAttribute("style", "font-size:14px;line-height:1.55;color:#cbd5e1;white-space:pre-wrap;");

  const lines = Array.isArray(payload.lines) ? payload.lines : [String(payload.text || "")];
  body.textContent = lines.join("\n\n");

  const actions = document.createElement("div");
  actions.setAttribute("style", "display:flex;justify-content:flex-end;gap:10px;margin-top:14px;");

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.setAttribute(
    "style",
    [
      "cursor:pointer",
      "border-radius:999px",
      "border:1px solid rgba(148,163,184,.35)",
      "background:rgba(15,23,42,.6)",
      "color:#e2e8f0",
      "padding:8px 16px",
      "font-size:13px",
      "font-weight:600",
    ].join(";")
  );
  close.addEventListener("click", () => shell.remove());

  actions.appendChild(close);
  panel.appendChild(badge);
  panel.appendChild(title);
  panel.appendChild(body);
  panel.appendChild(actions);
  shell.appendChild(panel);
  document.documentElement.appendChild(shell);

  const onKey = (e) => {
    if (e.key === "Escape") {
      shell.remove();
      document.removeEventListener("keydown", onKey, true);
    }
  };
  document.addEventListener("keydown", onKey, true);
}
