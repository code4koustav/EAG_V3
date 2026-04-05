const API_BASE = "http://127.0.0.1:8765";
const STORAGE_SUMMARY_POPUP = "summaryGoPopup";

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const msg = data.detail || data.message || text || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

async function ping() {
  const pill = document.getElementById("pill");
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    if (!res.ok) throw new Error("bad status");
    pill.textContent = "Server online";
    pill.classList.remove("off");
    pill.classList.add("on");
  } catch {
    pill.textContent = "Server offline";
    pill.classList.remove("on");
    pill.classList.add("off");
  }
}

function show(el, text) {
  el.hidden = false;
  el.textContent = text;
}

async function openSummaryWindow(payload) {
  await chrome.storage.session.set({ [STORAGE_SUMMARY_POPUP]: payload });
  await chrome.windows.create({
    url: chrome.runtime.getURL("pages/summary_popup.html"),
    type: "popup",
    width: 540,
    height: 680,
    focused: true,
  });
}

document.getElementById("btn-meaning").addEventListener("click", async () => {
  const input = document.getElementById("word");
  const out = document.getElementById("meaning-out");
  const text = input.value.trim();
  if (!text) {
    show(out, "Enter a word or short phrase.");
    return;
  }
  out.hidden = false;
  out.textContent = "Fetching…";
  try {
    const data = await apiPost("/api/meaning", { text });
    const block = [`Source: ${data.source}`, "", ...data.definitions].join("\n");
    show(out, `${data.title}\n\n${block}`);
  } catch (e) {
    show(out, String(e.message || e));
  }
});

document.getElementById("btn-summarize").addEventListener("click", async () => {
  const status = document.getElementById("summarize-status");
  status.textContent = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      status.textContent = "No active tab.";
      return;
    }
    status.textContent = "Reading page…";
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.innerText || "",
    });
    const pageText = (result || "").trim();
    if (pageText.length < 80) {
      status.textContent = "Not enough text on this page (or it is a restricted URL).";
      return;
    }
    status.textContent = "Summarizing…";
    const data = await apiPost("/api/summarize", { text: pageText });
    status.textContent = "";
    await openSummaryWindow({
      heading: "Page summary",
      body: data.summary,
      tabTitle: tab.title || "",
      sourceChars: data.source_chars,
    });
  } catch (e) {
    status.textContent = String(e.message || e);
  }
});

ping();
