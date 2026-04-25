/**
 * popup.js — PageVoice Chrome Extension
 * Handles UI interactions, Gemini API calls, and TTS playback.
 *
 * ⚠️  NO API KEY IS HARDCODED HERE.
 *     The key is read at runtime from chrome.storage.local.
 *     Set it via the extension's Options page (right-click icon → Options).
 */

// ── Prompts per summary style ──────────────────────────────────
const SUMMARY_INSTRUCTION = "You must respond with only the final summary text. Do not include analysis, task lists, draft notes, or step-by-step reasoning. Do not describe your process.";

const PROMPTS = {
  brief: (text) =>
    `You are a summary assistant. Write exactly 2–3 concise sentences that focus on the main point only. Do not use bullet points, numbered lists, or analysis. ${SUMMARY_INSTRUCTION}\n\n---\n${text}`,

  detailed: (text) =>
    `You are a summary assistant. Write exactly 4–6 concise bullet points. Each bullet must start with a hyphen and contain one idea. Do not use numbered lists, task descriptions, or analysis. ${SUMMARY_INSTRUCTION}\n\n---\n${text}`,

  eli5: (text) =>
    `You are a summary assistant. Explain the webpage content as if speaking to a 10-year-old. Use simple words, short sentences, and a friendly tone. Do not use bullets or numbered lists unless explicitly asked. ${SUMMARY_INSTRUCTION}\n\n---\n${text}`,

  accessibility: (text) =>
    `You are an accessibility assistant. Summarize the webpage content clearly and simply for a visually impaired user. Use plain language, mention the main purpose and key information, and keep the output easy to understand. ${SUMMARY_INSTRUCTION}\n\n---\n${text}`,
};

// ── DOM Elements ───────────────────────────────────────────────
const summarizeBtn  = document.getElementById("summarizeBtn");
const btnText       = document.getElementById("btnText");
const summaryCard   = document.getElementById("summaryCard");
const summaryText   = document.getElementById("summaryText");
const statusMsg     = document.getElementById("statusMsg");
const statusIcon    = document.getElementById("statusIcon");
const loadingArea   = document.getElementById("loadingArea");
const loadingText   = document.getElementById("loadingText");
const audioBar      = document.getElementById("audioBar");
const copyBtn       = document.getElementById("copyBtn");
const replayBtn     = document.getElementById("replayBtn");
const stopBtn       = document.getElementById("stopBtn");
const voiceRate     = document.getElementById("voiceRate");
const voicePitch    = document.getElementById("voicePitch");
const rateDisplay   = document.getElementById("rateDisplay");
const pitchDisplay  = document.getElementById("pitchDisplay");
const summaryType   = document.getElementById("summaryType");

// ── State ──────────────────────────────────────────────────────
let lastSummary  = "";
let isSpeaking   = false;

// ── Slider live feedback ───────────────────────────────────────
voiceRate.addEventListener("input", () => {
  rateDisplay.textContent = `${parseFloat(voiceRate.value).toFixed(1)}×`;
});

voicePitch.addEventListener("input", () => {
  pitchDisplay.textContent = `${parseFloat(voicePitch.value).toFixed(1)}×`;
});

// ── Helpers ────────────────────────────────────────────────────
function setStatus(msg, type = "") {
  statusMsg.textContent = msg;
  statusMsg.className   = `status-msg ${type}`;
  statusIcon.className  = `status-icon ${type}`;
  statusIcon.classList.toggle("hidden", !type);
}

function showLoading(text = "Extracting page content…") {
  loadingArea.classList.remove("hidden");
  loadingText.textContent = text;
  summarizeBtn.disabled   = true;
  btnText.textContent     = "Working…";
  summaryCard.classList.add("hidden");
  setStatus("", "");
}

function hideLoading() {
  loadingArea.classList.add("hidden");
  summarizeBtn.disabled = false;
  btnText.textContent   = "Summarize & Read Aloud";
}

function showError(msg) {
  hideLoading();
  setStatus(msg, "error");
  summaryCard.classList.add("hidden");
}

// ── Read config from chrome.storage.local ──────────────────────
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["geminiApiKey", "geminiModel"], (data) => {
      resolve({
        apiKey: data.geminiApiKey  || "",
        model:  data.geminiModel   || "gemini-3.1-flash",
      });
    });
  });
}

// ── callGemini: retry only the selected model, no fallback to other models ──
async function callGemini(pageText, apiKey, model) {
  const MAX_RETRIES  = 3;
  const BASE_DELAY   = 3000; // 3 s

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      loadingText.textContent = `Trying ${model} (attempt ${attempt}/${MAX_RETRIES})…`;
      const result = await fetchGemini(pageText, apiKey, model);
      console.log(`[PageVoice] Answered by ${model} on attempt ${attempt}`);
      return result;
    } catch (err) {
      const isLastAttempt = attempt === MAX_RETRIES;

      if (!err.retryable) {
        let friendlyMsg;
        if (err.status === 403) {
          friendlyMsg = "⚠️ API key invalid or not authorised. Open Options to update it.";
        } else if (err.status === 400) {
          friendlyMsg = "⚠️ Bad request — the page content may be too long.";
        } else {
          friendlyMsg = err.message;
        }
        throw new Error(friendlyMsg);
      }

      if (isLastAttempt) {
        throw new Error(
          `⚠️ ${model} is currently unavailable. Please try again or choose another model in Options.`
        );
      }

      const delay = BASE_DELAY * attempt;
      const secs  = Math.round(delay / 1000);
      setStatus(`Model busy — retrying in ${secs}s… (attempt ${attempt}/${MAX_RETRIES})`, "loading");
      loadingText.textContent = `Waiting ${secs}s before retry…`;
      await sleep(delay);
    }
  }
}

// ── Extract page text via content script ──────────────────────
async function extractPageText() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        reject(new Error("No active tab found."));
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractText" }, (response) => {
        if (chrome.runtime.lastError) {
          // Fall back: inject a script directly
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              func: () => {
                const clone = document.body.cloneNode(true);
                ["script","style","noscript","svg","nav","footer","header","aside"]
                  .forEach((t) => clone.querySelectorAll(t).forEach((el) => el.remove()));
                return clone.innerText.replace(/\s+/g, " ").trim().substring(0, 15000);
              },
            },
            (results) => {
              if (chrome.runtime.lastError || !results || !results[0]) {
                reject(new Error("Cannot access this page."));
              } else {
                resolve(results[0].result);
              }
            }
          );
        } else {
          resolve(response?.text || "");
        }
      });
    });
  });
}

// ── Sleep helper ───────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ── Single Gemini request (no retry) ──────────────────────────
async function fetchGemini(pageText, apiKey, model) {
  const style  = summaryType.value;
  const prompt = PROMPTS[style](pageText);
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const rawMsg  = errData?.error?.message || "";
    const status  = response.status;

    // Classify the error so the caller can decide whether to retry
    const err     = new Error(rawMsg || `API error ${status}`);
    err.status    = status;
    err.retryable = status === 429 || status === 503 ||
                    rawMsg.toLowerCase().includes("quota") ||
                    rawMsg.toLowerCase().includes("high demand") ||
                    rawMsg.toLowerCase().includes("overloaded");
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini.");
  return sanitizeGeminiSummary(text);
}

function sanitizeGeminiSummary(rawText) {
  let text = rawText.trim();

  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length > 1) {
    text = blocks[blocks.length - 1];
  }

  const finalAnswer = text.match(/(?:Final answer:|Final Answer:)\s*(.+)$/is);
  if (finalAnswer) {
    text = finalAnswer[1].trim();
  }

  if (/^\s*[\*\-]\s*(?:Task:|Constraint|Draft|Final|Main|Key|Exactly|Concise|No analysis|No bullets)/mi.test(text)) {
    const lines = text
      .split(/\r?\n/)
      .filter((line) => !/^\s*[\*\-]\s*(?:Task:|Constraint|Draft|Final|Main|Key|Exactly|Concise|No analysis|No bullets)/mi.test(line));
    text = lines.join(" ").replace(/\s{2,}/g, " ").trim();
  }

  return text;
}

// ── Text-to-Speech ─────────────────────────────────────────────
function speakText(text) {
  window.speechSynthesis.cancel();
  isSpeaking = false;

  const utter  = new SpeechSynthesisUtterance(text);
  utter.rate   = parseFloat(voiceRate.value);
  utter.pitch  = parseFloat(voicePitch.value);
  utter.volume = 1;
  utter.lang   = "en-US";

  const voices    = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") &&
           (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
  );
  if (preferred) utter.voice = preferred;

  utter.onstart = () => {
    isSpeaking = true;
    audioBar.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
    replayBtn.classList.add("hidden");
    setStatus("Reading aloud…", "loading");
  };

  utter.onend = () => {
    isSpeaking = false;
    audioBar.classList.add("hidden");
    stopBtn.classList.add("hidden");
    replayBtn.classList.remove("hidden");
    setStatus("Done reading.", "success");
  };

  utter.onerror = (e) => {
    if (e.error !== "interrupted") {
      isSpeaking = false;
      audioBar.classList.add("hidden");
      stopBtn.classList.add("hidden");
      setStatus("Speech error: " + e.error, "error");
    }
  };

  window.speechSynthesis.speak(utter);
}

// ── Main summarize flow ────────────────────────────────────────
summarizeBtn.addEventListener("click", async () => {
  try {
    showLoading("Checking settings…");

    // 1. Read API key from storage (NOT hardcoded)
    const { apiKey, model } = await getConfig();

    if (!apiKey) {
      showError("🔑 No API key found. Please open Options (right-click extension icon → Options) and paste your Gemini API key.");
      return;
    }

    // 2. Extract page text
    showLoading("Extracting page content…");
    const pageText = await extractPageText();

    if (!pageText || pageText.length < 50) {
      showError("Not enough text found on this page.");
      return;
    }

    // 3. Call Gemini using user-selected model
    loadingText.textContent = `Summarizing with ${model}…`;
    setStatus(`Calling Gemini using ${model}…`, "loading");

    const summary = await callGemini(pageText, apiKey, model);
    lastSummary   = summary;

    hideLoading();

    // 4. Display
    summaryText.textContent = summary;
    summaryCard.classList.remove("hidden");
    setStatus("Summary ready!", "success");

    // 5. Speak
    speakText(summary);

  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
    console.error("[PageVoice]", err);
  }
});

// ── Replay ────────────────────────────────────────────────────
replayBtn.addEventListener("click", () => {
  if (lastSummary) speakText(lastSummary);
});

// ── Stop ──────────────────────────────────────────────────────
stopBtn.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  audioBar.classList.add("hidden");
  stopBtn.classList.add("hidden");
  replayBtn.classList.remove("hidden");
  setStatus("Stopped.", "");
});

// ── Copy ──────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  if (!lastSummary) return;
  try {
    await navigator.clipboard.writeText(lastSummary);
    copyBtn.title      = "Copied!";
    copyBtn.style.color = "var(--success)";
    setTimeout(() => {
      copyBtn.title      = "Copy summary";
      copyBtn.style.color = "";
    }, 1800);
  } catch {
    setStatus("Could not copy to clipboard.", "error");
  }
});

// ── Shortcut: open Options if key missing ──────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "," && (e.ctrlKey || e.metaKey)) {
    chrome.runtime.openOptionsPage();
  }
});

// ── Warm up voices ─────────────────────────────────────────────
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
