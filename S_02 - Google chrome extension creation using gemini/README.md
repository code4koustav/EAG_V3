# PageVoice – AI Page Summarizer for Chrome

🎥 Demo video: https://youtu.be/KtUYZl0txtM

> **Accessibility-first Chrome Extension** powered by **Google Gemini 3.1 Flash**  
> Summarizes any webpage and reads it aloud — built for visually impaired users.

---

## 📁 Project Structure

```
S_02 - Google chrome extension creation using gemini/
├── manifest.json       # Chrome Extension Manifest v3
├── popup.html          # Extension popup UI
├── popup.css           # Dark premium styling
├── popup.js            # Gemini API + TTS logic
├── content.js          # Page text extractor (runs in page context)
├── background.js       # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .env                # Gemini API key (reference only, not loaded by browser)
└── README.md           # This file
```

---

## 🚀 How to Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select this folder:  
   `EAG_V3\S_02 - Google chrome extension creation using gemini\`
5. The **PageVoice** icon will appear in your Chrome toolbar ✅

---

## 🎯 Features

| Feature | Details |
|---|---|
| 🤖 **AI Summarization** | Google Gemini 3.1 Flash via REST API |
| 🔊 **Text-to-Speech** | Browser Web Speech API with voice selection |
| ♿ **Accessibility Modes** | 4 summary styles including accessibility-focused |
| ⚡ **Speed Control** | Reading rate slider (0.5× – 2×) |
| 🎵 **Pitch Control** | Voice pitch slider (0.5× – 2×) |
| 📋 **Copy Summary** | One-click clipboard copy |
| 🔁 **Replay** | Re-read the summary without re-fetching |
| ⏹ **Stop** | Instantly cancel speech playback |

---

## 📝 Summary Styles

| Style | Description |
|---|---|
| ⚡ **Brief** | 2–3 sentence high-level overview |
| 📋 **Detailed** | Bullet-point key points and conclusions |
| 🧒 **Simple (ELI5)** | Plain language, easy for all ages |
| ♿ **Accessibility-focused** | Optimised for visually impaired users |

---

## 🔑 API Key

The Gemini API key is stored in `.env` for reference:
```
GEMINI_API_KEY=AQ.Ab8RN6LcS48PC...
```

> ⚠️ Chrome extensions cannot read `.env` files natively. Use the extension Options page to paste your Gemini API key, which is then saved in Chrome local storage. Keep the key private and avoid committing it to public repositories.

---

## 🤖 Model Used

**Gemini 3.1 Flash** (`gemini-3.1-flash`)  
Default model for this extension, with automatic fallback to other supported Gemini Flash models when required.

---

## ⚠️ Limitations

- Cannot access `chrome://` internal pages or local `file://` URLs (browser restriction)
- Does not work on PDF files opened directly in Chrome
- For production use, consider routing API calls through a backend proxy to protect your API key
