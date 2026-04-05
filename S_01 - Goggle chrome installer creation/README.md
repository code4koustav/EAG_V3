# SummaryGo — Google Chrome extension + Python backend

**SummaryGo** is a small **Google Chrome** extension paired with a **local Python (FastAPI)** service. It offers:

1. **Meaning of selected text** — right-click a selection (or use the popup) to fetch definitions or a short encyclopedic summary.
2. **Summarize the current page** — right-click the page (or use **Summarize this page** in the popup) to build an **extractive** summary from visible text.

The architecture is deliberately **modular**: the extension handles UI and page access; Python handles networking to public APIs and the summarization algorithm. Nothing runs in the cloud that you do not already call via those public endpoints (dictionary and Wikipedia).

---

## Chrome installer (what it does)

The **Chrome Setup Wizard** script (`chrome_install_wizard.py`) is a **terminal-first installer** that automates the boring steps and frames them as a short guided flow:

- Prints a **SummaryGo** banner and step headers so the process feels intentional rather than “random commands.”
- **Creates** a `venv` in this folder if it is missing.
- **Installs** Python dependencies from `requirements.txt`.
- **Generates** PNG icons for the extension (document motif on a teal field — uses `tools/generate_icons.py`, stdlib only).
- **Imports** `server.main` once to catch configuration errors early.
- **Opens** the `extension` folder on Windows (Explorer) so you can **Load unpacked** immediately.
- Prints **exact Chrome UI steps** (Developer mode → Load unpacked) and the command to start the API.

Run it from this directory:

```text
python chrome_install_wizard.py
```

After the wizard, start the API (from this project folder):

```text
.\venv\Scripts\python run_server.py
```

Then in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → select the `extension` folder.

---

## How to use the product

- **Context menu**
  - Select text → right-click → **SummaryGo: Meaning of selection**
  - Right-click the page background → **SummaryGo: Summarize this page** (opens a **dedicated summary popup window**)
- **Toolbar popup**
  - Pin SummaryGo, open the popup, use **Define** or **Summarize this page** (summary opens the same **popup window**)
- **Summary popup window** (`pages/summary_popup.html`)
  - Shows the summary in a focused Chrome **popup**-type window, with optional **source tab title**, character hint, and **Copy summary**.
- **Overlay vs fallback tab (meanings)**
  - On normal pages, **meaning** results can appear in a **floating card** injected into the page.
  - If injection is blocked (e.g. restricted URLs), SummaryGo opens a **fallback results tab** (`pages/result.html`) using `chrome.storage.session`.

The extension talks to `http://127.0.0.1:8765`. Keep `run_server.py` running while you browse.

---

## File-by-file reference

### Root

| File | Role |
|------|------|
| `README.md` | Project overview, installer behavior, and this file map. |
| `requirements.txt` | Python dependencies for the FastAPI server. |
| `run_server.py` | Starts **uvicorn** on `127.0.0.1:8765` using `server.main:app`. |
| `chrome_install_wizard.py` | **Chrome-oriented installer**: venv, pip, icons, smoke import, Explorer shortcut, printed Chrome steps. |
| `.gitignore` | Ignores `venv/`, bytecode, `.env`, caches. |

### `server/` — Python API (modular)

| File | Role |
|------|------|
| `server/__init__.py` | Package marker for the API. |
| `server/main.py` | Builds the FastAPI app, **CORS** for browser calls, `/health`, and route registration. |
| `server/config.py` | **Pydantic Settings**: host, port, timeouts, summary length, max body size (`SUMMARYGO_*` env prefix). |
| `server/models/schemas.py` | **Pydantic** models for `/api/meaning` and `/api/summarize` bodies and responses. |
| `server/models/__init__.py` | Short package docstring. |
| `server/routes/__init__.py` | `register_routes()` attaches routers under `/api`. |
| `server/routes/meaning.py` | **POST `/api/meaning`**: tries dictionary, then Wikipedia summary. |
| `server/routes/summarize.py` | **POST `/api/summarize`**: validates size, runs extractive summarizer. |
| `server/services/dictionary_service.py` | Async client for **Free Dictionary API** (single-word lookups). |
| `server/services/wikipedia_service.py` | Async client for **Wikipedia REST summary** (phrases / titles). |
| `server/services/text_summarizer.py` | **Extractive summarization** in pure Python (sentence scoring by word frequency, original order preserved). |
| `server/services/__init__.py` | Package docstring for the service layer. |

### `extension/` — Chrome MV3 UI

| File | Role |
|------|------|
| `extension/manifest.json` | MV3 manifest: `action` popup, `service_worker`, `windows` permission for summary popup, localhost host access, icons. |
| `extension/service_worker.js` | Registers **context menus**, calls the local API, **summary popup window** for summarize, inject overlay / fallback tab for meanings. |
| `extension/lib/inject_overlay.js` | **Floating card UI** injected into web pages (meanings). |
| `extension/popup.html` / `popup.css` / `popup.js` | Toolbar **popup**: server pill, define field, summarize button (opens summary window). |
| `extension/pages/summary_popup.html` / `summary_popup.css` / `summary_popup.js` | **Dedicated window** for page summaries (data via `chrome.storage.session`). |
| `extension/pages/result.html` / `result.css` / `result.js` | **Fallback full-page result** when meaning injection is not possible. |
| `extension/icons/icon*.png` | Toolbar / manifest icons (generated by `tools/generate_icons.py`). |

### `tools/`

| File | Role |
|------|------|
| `tools/generate_icons.py` | Writes **SummaryGo** PNGs (16 / 48 / 128): teal gradient, document lines, amber accent — **stdlib only** (`zlib`, `struct`). |

---

## Configuration

Optional environment variables (prefix `SUMMARYGO_`), e.g. in `.env`:

- `SUMMARYGO_HOST` — default `127.0.0.1`
- `SUMMARYGO_PORT` — default `8765`
- `SUMMARYGO_SUMMARY_SENTENCES` — default `5`
- `SUMMARYGO_MAX_BODY_CHARS` — cap for summarize payload size

If you previously used `LEXIMINT_*` variables, rename them to `SUMMARYGO_*`.

---

## Limitations (honest scope)

- **Summaries** are **extractive** (important sentences), not generative AI prose.
- **Meaning** for arbitrary long paragraphs is not optimized; prefer **words**, **short phrases**, or **Wikipedia-style titles**.
- Pages where extensions cannot inject scripts (e.g. `chrome://`, Chrome Web Store, some PDF viewers) rely on the **fallback tab** for meanings or show status text in the toolbar popup.

---

## License

Use and modify freely for learning and local tooling; respect third-party API terms for Dictionary and Wikipedia traffic.
