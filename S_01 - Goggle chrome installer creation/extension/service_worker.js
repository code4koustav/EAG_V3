importScripts("lib/inject_overlay.js");

const API_BASE = "http://127.0.0.1:8765";
const STORAGE_SUMMARY_POPUP = "summaryGoPopup";
const STORAGE_FALLBACK = "summaryGoPayload";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "summarygo-meaning",
      title: "SummaryGo: Meaning of selection",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "summarygo-summarize",
      title: "SummaryGo: Summarize this page",
      contexts: ["page", "frame"],
    });
  });
});

async function openSummaryPopupWindow(payload) {
  await chrome.storage.session.set({ [STORAGE_SUMMARY_POPUP]: payload });
  await chrome.windows.create({
    url: chrome.runtime.getURL("pages/summary_popup.html"),
    type: "popup",
    width: 540,
    height: 680,
    focused: true,
  });
}

async function postJson(path, body) {
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
    data = { detail: text || res.statusText };
  }
  if (!res.ok) {
    const msg = data.detail || data.message || text || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

async function tryInject(tabId, payload) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: summaryGoInjectOverlay,
    args: [payload],
  });
}

async function openFallbackTab(payload) {
  await chrome.storage.session.set({ [STORAGE_FALLBACK]: payload });
  await chrome.tabs.create({ url: chrome.runtime.getURL("pages/result.html") });
}

async function present(tabId, payload) {
  try {
    await tryInject(tabId, payload);
  } catch {
    await openFallbackTab(payload);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "summarygo-meaning") {
    const text = (info.selectionText || "").trim();
    if (!text) return;
    try {
      const data = await postJson("/api/meaning", { text });
      await present(tab.id, {
        heading: data.title,
        lines: data.definitions,
        source: data.source,
      });
    } catch (e) {
      await present(tab.id, {
        heading: "Could not fetch meaning",
        lines: [String(e.message || e)],
      });
    }
    return;
  }

  if (info.menuItemId === "summarygo-summarize") {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body?.innerText || "",
      });
      const pageText = (result || "").trim();
      if (pageText.length < 80) {
        await openSummaryPopupWindow({
          heading: "Could not summarize",
          body: "This page has very little readable text, or the tab is restricted.",
          tabTitle: tab.title || "",
        });
        return;
      }
      const data = await postJson("/api/summarize", { text: pageText });
      await openSummaryPopupWindow({
        heading: "Page summary",
        body: data.summary,
        tabTitle: tab.title || "",
        sourceChars: data.source_chars,
      });
    } catch (e) {
      await openSummaryPopupWindow({
        heading: "Summarize failed",
        body: String(e.message || e),
        tabTitle: tab.title || "",
      });
    }
  }
});
