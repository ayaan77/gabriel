# Gabriel — AI Architecture Spec Generator 🏗️

![Gabriel Banner](https://raw.githubusercontent.com/ayaan77/gabriel/main/public/icon-128.png) <!-- Placeholder if no banner, using icon -->

Hey there! 👋

This is **Gabriel**, a Chrome Extension I built to help me (and you!) speed run the initial phase of software architecture. 

It's basically a **system design interview in a chat box**, but instead of judging you, it helps you build a rock-solid implementation plan and generates a professional PDF spec you can hand off to developers (or AI agents).

## Why I built this
I was tired of copy-pasting context into ChatGPT every time I started a new project. I wanted something that lives *in the browser*, can see what I'm looking at, and helps me structure my thoughts into actual deliverables.

## Technologies
Powered by **Groq** (because who has time to wait only to see a model typing? Fast inference is life ⚡️). 
- React + Vite (Fast, light)
- Chrome Extension API (Side Panel, Scripting, Offscreen Audio)
- jsPDF (for that sweet PDF export)

## Features that actually matter

- **⚡️ Streaming AI**: No waiting. It feels like talking to a real person.
- **📄 Read Page Context**: One click and Gabriel reads the page you're on. Great for "How do I implement this library?" questions.
- **🗣️ Voice Input**: Sometimes you just want to ramble. Gabriel listens.
- **📑 PDF & Markdown Export**: Turns your chat into a structured `implementation_plan.md` style PDF. 
- **🌗 Side Panel Mode**: Keeps Gabriel open next to your docs so you don't lose focus.
- **🧠 Multi-Model Tiers**: Choose between **High Intelligence** (Llama 3 70b) for complex tasks or **Efficient** models for speed.
- **🕵️ Competitive Intelligence (Spy Mode)**: 
    - Auto-detects tech stack (Shopify, React, etc.)
    - Estimates traffic & conversion signals
    - Direct link to Active Meta Ads
    - Generates deep strategic insights using a "Lead Analyst" persona
- **🌐 Search Brand**: Instantly research any competitor brand right from the start screen.

## How to run it locally

1. Clone this repo.
2. Run `npm install` then `npm run build`.
3. Open Chrome and go to `chrome://extensions`.
4. Enable "Developer mode" (top right).
5. Click "Load unpacked" and select the `dist` folder.
6. Pin it and start building!

---

*Built with ❤️ and a lot of caffeine. Open source, hackable, and ready for your ideas.*
