/**
 * options.js — PageVoice Chrome Extension
 * Saves / loads the Gemini API key and model choice using chrome.storage.local.
 * Nothing is hardcoded — all configuration lives in local browser storage.
 */

const apiKeyInput       = document.getElementById("apiKeyInput");
const modelSelect       = document.getElementById("modelSelect");
const saveBtn           = document.getElementById("saveBtn");
const clearBtn          = document.getElementById("clearBtn");
const toggleVisibility  = document.getElementById("toggleVisibility");
const statusBanner      = document.getElementById("statusBanner");

const FALLBACK_MODELS = [
  "gemini-3.1-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function normalizeModelName(name) {
  return typeof name === "string" ? name.replace(/^models\//, "") : "";
}

function sortModels(models) {
  const priority = FALLBACK_MODELS;
  return [...new Set(models)]
    .map(normalizeModelName)
    .filter(Boolean)
    .sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return a.localeCompare(b);
    });
}

function populateModelSelect(models, selectedModel) {
  const options = sortModels(models.length ? models : FALLBACK_MODELS);
  modelSelect.innerHTML = "";

  options.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });

  const effectiveModel = options.includes(selectedModel)
    ? selectedModel
    : options[0];
  modelSelect.value = effectiveModel;

  if (selectedModel && selectedModel !== effectiveModel) {
    showBanner(
      `⚠️ Saved model ${selectedModel} is not available for this key. Using ${effectiveModel} instead.`,
      "warning"
    );
    chrome.storage.local.set({ geminiModel: effectiveModel });
  }
}

async function fetchAccessibleModels(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawMsg = data?.error?.message || `API error ${response.status}`;
    throw new Error(rawMsg);
  }

  return Array.isArray(data?.models)
    ? data.models.map((model) => normalizeModelName(model.name)).filter(Boolean)
    : [];
}

async function loadAccessibleModels(apiKey, savedModel) {
  if (!apiKey) {
    populateModelSelect(FALLBACK_MODELS, savedModel || "gemini-3.1-flash");
    return;
  }

  try {
    const availableModels = await fetchAccessibleModels(apiKey);
    populateModelSelect(availableModels.length ? availableModels : FALLBACK_MODELS, savedModel);
  } catch (err) {
    showBanner(`Could not load available models: ${err.message}`, "error");
    populateModelSelect(FALLBACK_MODELS, savedModel || "gemini-3.1-flash");
  }
}

// ── Load saved values on page open ────────────────────────────
chrome.storage.local.get(["geminiApiKey", "geminiModel"], async (data) => {
  if (data.geminiApiKey) {
    apiKeyInput.value = data.geminiApiKey;
    apiKeyInput.classList.add("valid");
  }

  const savedModel = data.geminiModel || "gemini-3.1-flash";
  await loadAccessibleModels(data.geminiApiKey, savedModel);
});

// ── Toggle password visibility ─────────────────────────────────
toggleVisibility.addEventListener("click", () => {
  const isHidden = apiKeyInput.type === "password";
  apiKeyInput.type = isHidden ? "text" : "password";
  toggleVisibility.setAttribute("title", isHidden ? "Hide key" : "Show key");
  toggleVisibility.setAttribute("aria-label", isHidden ? "Hide key" : "Show key");
});

// ── Validate key format on input ───────────────────────────────
apiKeyInput.addEventListener("input", () => {
  const val = apiKeyInput.value.trim();
  if (!val) {
    apiKeyInput.classList.remove("valid", "invalid");
  } else if (val.length > 10) {
    apiKeyInput.classList.add("valid");
    apiKeyInput.classList.remove("invalid");
  } else {
    apiKeyInput.classList.add("invalid");
    apiKeyInput.classList.remove("valid");
  }
});

// ── Save settings ──────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const key   = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (!key) {
    showBanner("⚠️ Please enter an API key before saving.", "error");
    return;
  }

  if (key.length < 10) {
    showBanner("⚠️ That doesn't look like a valid API key.", "error");
    return;
  }

  chrome.storage.local.set({ geminiApiKey: key, geminiModel: model }, async () => {
    if (chrome.runtime.lastError) {
      showBanner("❌ Failed to save: " + chrome.runtime.lastError.message, "error");
    } else {
      apiKeyInput.classList.add("valid");
      apiKeyInput.classList.remove("invalid");
      showBanner("✅ Settings saved successfully! Model list refreshed.", "success");
      await loadAccessibleModels(key, model);
    }
  });
});

// ── Clear settings ─────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["geminiApiKey", "geminiModel"], () => {
    apiKeyInput.value = "";
    apiKeyInput.classList.remove("valid", "invalid");
    modelSelect.value = "gemini-3.1-flash";
    showBanner("🗑️ API key cleared from storage.", "success");
  });
});

// ── Banner helper ──────────────────────────────────────────────
function showBanner(msg, type) {
  statusBanner.textContent  = msg;
  statusBanner.className    = `status-banner ${type}`;
  statusBanner.classList.remove("hidden");
  // Auto-hide after 4 seconds
  setTimeout(() => statusBanner.classList.add("hidden"), 4000);
}
