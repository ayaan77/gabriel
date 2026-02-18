# Gabriel — AI Architect for the Browser 🏗️

> A Chrome Extension that brings Staff-level AI architecture thinking directly into your browser.

![Gabriel Icon](https://raw.githubusercontent.com/ayaan77/gabriel/main/public/icon-128.png)

---

## What is Gabriel?

Gabriel is a **Chrome Extension** that acts as your AI co-founder, architect, and analyst — all in one sidebar. It's not a generic chatbot. Every mode is purpose-built for a specific workflow.

Built by **Scorpion** (Ayan Ashraf) — Developer & AI Analyst.

---

## Modes

| Mode | What it does |
|---|---|
| 🏗️ **Architect** | Conducts a structured system design interview, then generates a full implementation spec |
| 💀 **Brutal CTO** | Tears apart your tech stack with zero mercy |
| 🔥 **Roast** | Roasts your idea like a VC who's seen it all |
| ⚖️ **Compare** | Compares two tech approaches head-to-head |
| 📊 **Diagram** | Generates Mermaid.js architecture diagrams from a description |
| 🔍 **Analyze** | Deep-dives a GitHub repo URL and explains its architecture |
| 🕵️ **Intelligence** | Competitive intelligence on any website — tech stack, ads, positioning |
| 📄 **Page Analysis** | Reads the page you're on and answers questions about it |
| 🎯 **CRO Audit** | Full Conversion Rate Optimization audit with RAG-powered pattern matching |

---

## Key Features

### 🏛️ LLM Council Mode
Multi-model deliberation using a 3-stage pipeline inspired by [karpathy/llm-council](https://github.com/karpathy/llm-council):
1. **Stage 1** — All council models answer independently in parallel
2. **Stage 2** — Models anonymously rank each other's responses
3. **Stage 3** — A chairman model synthesizes the final answer

Toggle it on/off per-session. Available in: Architect, Analyze, Roast, Intelligence, CRO.

### 🎯 CRO Audit (RAG-powered)
- Injects into the active tab and captures full page data
- Runs **semantic embedding analysis** against a CRO pattern knowledge base
- Scores trust signals, visual hierarchy, CTAs, and conversion probability
- Streams a detailed AI report with actionable recommendations

### 🕵️ Competitive Intelligence
- Detects tech stack (Shopify, React, Next.js, etc.)
- Links directly to Meta Ads Library and Google Ads Transparency
- Scrapes page content for brand positioning analysis
- Generates a strategic intelligence report

### ⚡ Streaming AI
Real-time token streaming — no waiting for the full response.

### 📄 Page Context
One click reads the active tab and injects it as context into the conversation.

### 📑 Export
Export any conversation or spec as **PDF** or **Markdown**.

### 🌗 Side Panel
Open Gabriel as a persistent Chrome side panel — stays open next to your docs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite |
| AI | Groq API (llama-3.3-70b, llama-3.1-8b, gemma2-9b) |
| Embeddings | Transformers.js (local, in-browser) |
| PDF Export | jsPDF |
| Markdown | marked + DOMPurify |
| Extension APIs | Chrome Tabs, Scripting, SidePanel, Storage |
| Testing | Vitest + @testing-library/react |

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for full Mermaid diagrams covering:
- Component tree
- State management
- Council 3-stage pipeline
- Data flow per mode

### Hook Structure

```
useGabriel (composition layer)
├── usePersistence   — chrome.storage, theme, model tier
├── useMessages      — messages, search, bookmarks
└── useCRO           — full CRO audit pipeline
```

### Component Structure

```
App
├── ErrorBoundary
├── SettingsModal
├── ChatHeader        (header + model tier + council toggle)
├── main
│   ├── HomeView      (landing cards)
│   ├── CROReport     (audit results)
│   └── MessageList   (message feed)
│       ├── MessageContent   (markdown + mermaid)
│       ├── ThinkingBlock    (chain-of-thought)
│       └── CouncilPanel     (opinions / rankings / synthesis)
└── Footer (input + send)
```

---

## Security

- **DOMPurify** sanitizes all AI-generated HTML before rendering
  - `FORBID_TAGS`: `script`, `iframe`, `object`, `embed`, `form`
  - `FORBID_ATTR`: `onerror`, `onload`, `onclick`, `onmouseover`
- **ErrorBoundary** wraps the entire app for crash recovery
- **ESLint** rules: `no-eval`, `no-implied-eval`, `no-new-func`
- API keys stored in `chrome.storage.local` (never localStorage)

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier available)

### Install & Build

```bash
git clone https://github.com/ayaan77/gabriel.git
cd gabriel
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Pin the extension and click the icon

### Set your API Key

Click ⚙️ Settings → paste your Groq API key → Save.

---

## Development

```bash
npm run dev      # Vite dev server (for UI iteration)
npm run build    # Production build → dist/
npx vitest run   # Run all tests
```

### Tests

10 unit tests covering the `useGabriel` hook:
- Default state initialization
- Message sending + AI streaming
- Bookmark toggle
- Search filtering
- Bookmark-only filter
- `startNew` state reset
- Missing API key error handling
- Council mode toggle
- Mode switching
- `clearHistory` reset

---

## Project Structure

```
src/
├── components/
│   ├── ChatHeader.jsx       # Header + model tier + council toggle
│   ├── MessageList.jsx      # Message feed + typing indicator
│   ├── MessageContent.jsx   # Markdown + Mermaid rendering
│   ├── CouncilPanel.jsx     # Council opinions/rankings/synthesis
│   ├── HomeView.jsx         # Landing screen cards
│   ├── SettingsModal.jsx    # Settings panel
│   ├── CROReport.jsx        # CRO audit report UI
│   ├── IntelligenceReport.jsx
│   ├── ErrorBoundary.jsx    # Crash recovery
│   └── Icons.jsx            # SVG icon library
├── hooks/
│   ├── useGabriel.js        # Root hook (composition layer)
│   ├── usePersistence.js    # chrome.storage + theme
│   ├── useMessages.js       # Messages, search, bookmarks
│   └── useCRO.js            # CRO audit pipeline
├── utils/
│   ├── ai.js                # Groq API + streaming + prompts
│   ├── council.js           # 3-stage LLM council pipeline
│   ├── intelligence.js      # Competitive intelligence scraper
│   └── croAnalyzer.js       # RAG-based CRO pattern analysis
└── config.js                # Model tiers, council config, API key
```

---

*Built with ❤️ and a lot of caffeine. Open source, hackable, and ready for your ideas.*
