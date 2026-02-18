# Gabriel AI — Architecture

Gabriel is a Chrome extension built with React + Vite that provides multi-model AI assistance directly in the browser.

## High-Level Architecture

```mermaid
graph TD
    User["👤 User"] --> Popup["Chrome Extension Popup / Side Panel"]

    Popup --> App["App.jsx\n(Root Component)"]

    App --> Hook["useGabriel.js\n(State & Logic Hub)"]
    App --> UI["UI Components"]

    UI --> ChatHeader["ChatHeader\n(Header + Model Tier + Council Toggle)"]
    UI --> MessageList["MessageList\n(Message Feed + Typing Indicator)"]
    UI --> HomeView["HomeView\n(Landing + Quick Cards)"]
    UI --> CouncilPanel["CouncilPanel\n(Opinions / Rankings / Synthesis)"]
    UI --> SettingsModal["SettingsModal\n(Theme + API Key + History)"]
    UI --> MessageContent["MessageContent\n(Markdown + Mermaid + Thinking)"]
    UI --> CROReport["CROReport\n(Conversion Rate Audit)"]

    Hook --> Utils["Utility Layer"]
    Utils --> AI["ai.js\nstreamChatWithAI\nchatWithAI\nfetchGitHubRepo"]
    Utils --> Council["council.js\nrunCouncil (3-stage)\nisCouncilAvailable"]
    Utils --> Intelligence["intelligence.js\nanalyzeWebsite"]
    Utils --> CROAnalyzer["croAnalyzer.js\nanalyzePage\nbuildAIContext"]

    AI --> Groq["☁️ Groq API\nllama-3.3-70b\nllama-3.1-8b\ngemma2-9b"]
    Council --> Groq

    Hook --> Storage["chrome.storage.local\n(API Key, History, Settings)"]
    Hook --> ChromeAPI["Chrome Extension APIs\ntabs, scripting, sidePanel, windows"]
```

## Component Tree

```
App
├── ErrorBoundary          (crash recovery)
├── SettingsModal          (theme, API key, history)
├── ChatHeader
│   ├── Header bar         (logo, mode label, action buttons)
│   ├── ModelTierBar       (70B / 8B / 9B selector)
│   └── CouncilToggleBar   (ON/OFF + hint)
├── main.content
│   ├── SearchBar          (inline, conditional)
│   ├── HomeView           (landing cards, shown when no messages)
│   ├── CROReport          (conversion audit, conditional)
│   └── MessageList
│       ├── Message (user)
│       └── Message (assistant)
│           ├── ThinkingBlock   (chain-of-thought, collapsible)
│           ├── MessageContent  (markdown + mermaid diagrams)
│           └── CouncilPanel    (opinions / rankings / synthesis tabs)
└── Footer
    ├── Textarea input
    ├── ReadPage button
    └── Send button
```

## State Management

All application state lives in the `useGabriel` hook — no external state library is needed for a Chrome extension popup.

| State slice | Managed by |
|---|---|
| Messages, mode, input | `useGabriel` → `useState` |
| API key, theme, history | `useGabriel` → `chrome.storage.local` |
| Council results | `useGabriel` → `useState` |
| CRO analysis | `useGabriel` → `useState` |
| UI state (settings open, search) | `App.jsx` → `useState` |

## Council Mode — 3-Stage Pipeline

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Council as council.js
    participant Groq

    User->>App: Send message (Council ON)
    App->>Council: runCouncil(prompt, systemPrompt, apiKey)

    Note over Council,Groq: Stage 1 — Parallel Opinions
    Council->>Groq: llama-3.3-70b (opinion)
    Council->>Groq: llama-3.1-8b (opinion)
    Council->>Groq: gemma2-9b (opinion)

    Note over Council,Groq: Stage 2 — Anonymous Review
    Council->>Groq: All models review each other's opinions

    Note over Council,Groq: Stage 3 — Chairman Synthesis
    Council->>Groq: llama-3.3-70b synthesizes final answer

    Council-->>App: { stage1, stage2, stage3 }
    App-->>User: Final synthesized response + CouncilPanel
```

## Data Flow

```mermaid
flowchart LR
    Input["User Input"] --> sendMessage["sendMessage()"]
    sendMessage --> ModeCheck{Mode?}

    ModeCheck -->|analyze + GitHub URL| fetchGitHubRepo --> chatWithAI
    ModeCheck -->|intelligence| analyzeWebsite --> chatWithAI
    ModeCheck -->|cro| analyzePage --> buildAIContext
    ModeCheck -->|all others| streamChatWithAI

    chatWithAI --> CouncilCheck{Council ON?}
    streamChatWithAI --> CouncilCheck

    CouncilCheck -->|Yes| runCouncil --> Messages
    CouncilCheck -->|No| Messages["Update Messages State"]
```

## Security

- **DOMPurify** sanitizes all AI-generated HTML before rendering
- `FORBID_TAGS`: `script`, `iframe`, `object`, `embed`, `form`
- `FORBID_ATTR`: `onerror`, `onload`, `onclick`, `onmouseover`
- API keys stored in `chrome.storage.local` (not localStorage)
- **ErrorBoundary** wraps the entire app for crash recovery
