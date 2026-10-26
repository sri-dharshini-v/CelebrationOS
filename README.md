CelebrationOS 🎉

AI-Powered Celebration & Event Planner

CelebrationOS helps users plan birthdays, weddings, and other celebrations with AI-generated plans tailored to their budget, guest count, and event date.

Features

- 🤖 AI-powered event plan generation
- 💬 AI event-planning assistant for ideas, budgets, schedules, and checklists
- 💰 Budget planning and visualization
- 📅 Event timelines and checklists
- ⚡ Shock Engine to preview changes when budgets, guest counts, or dates change
- 📜 Version history and Safe Undo
- 🔒 Protection for paid, completed, and important traditional rituals
- 🌐 Selectable language preferences for 10 primary Indian languages, with UI coverage and AI verification status shown honestly; reviewed local UI and mock-plan content currently covers English, Tamil, and Hindi
- 💾 Saved plans and plan management
- ✅ Plan validation and budget checks

Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- AI: Google Gemini API

Live Demo

https://celebrationos.onrender.com

GitHub Repository

https://github.com/sri-dharshini-v/CelebrationOS

Getting Started

Prerequisites

- Node.js 20 or later. The Google GenAI SDK used by the project requires Node.js 20 or later.
- npm, installed with Node.js. The project does not specify a separate npm version requirement.
- A Google Gemini API key for Gemini-powered generation and assistant responses.

Installation

1. Clone the repository:

   git clone https://github.com/sri-dharshini-v/CelebrationOS.git

2. Open the project folder:

   cd CelebrationOS

3. Install dependencies:

   npm install

4. Create your local environment file in Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Open `.env` and add your own Google AI Studio API key as the value of `GEMINI_API_KEY`. Do not share your key, include it in screenshots, or commit `.env` to Git. The required environment variable names are defined by [`.env.example`](./.env.example):

   - `GEMINI_API_KEY` — your private Gemini API key.
   - `PORT` — the server port; optional, defaults to `3000`.

6. Run the test suite:

   ```powershell
   npm test
   ```

7. Start CelebrationOS locally:

   ```powershell
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000). If you set a different `PORT`, use that port in the local URL.

### Hosting

The existing live demo is hosted at [https://celebrationos.onrender.com](https://celebrationos.onrender.com). To configure a hosting environment, add the same variable names from `.env.example` (`GEMINI_API_KEY` and, if needed, `PORT`) in that provider's environment-variable settings. Keep the API key private; do not put its value in source code or commit it. Follow the hosting provider's current instructions for applying environment-variable changes. These instructions describe configuration only and do not indicate that a deployment has been performed.

### Gemini quotas, model fallback, and deployed troubleshooting

- Plan generation and the assistant try a list of Gemini models in order and move to the next model when one is rate limited, exhausted, or unavailable. This is what keeps the feature working when a single model's daily quota is used up. Override the order with `GEMINI_PLAN_MODELS` and `GEMINI_ASSISTANT_MODELS` (see [`.env.example`](./.env.example)).
- Google's free tier enforces small per-model daily request limits. A public demo can exhaust them quickly. For reliable multi-user use, enable billing on the Google AI Studio project or use a key with sufficient quota; code-level fallback cannot create quota that does not exist.
- `GET /api/health` reports `geminiConfigured`, `planModels`, and `assistantModels` (model names only, never the key). Use it to confirm the deployment picked up the environment variable and the expected model list.
- If assistant requests fail only on the deployed site, check the hosting provider's environment variables first: a missing, expired, or restricted `GEMINI_API_KEY` makes plan generation fall back to the built-in sample plan (`isMock: true`) and makes the assistant return a temporary-unavailable or quota message. Server logs record only the model, HTTP status, Google error code, and a truncated message.
- Render's free instances stop after inactivity, so the first request after a pause can take extra time. Opening the site before a demo, or using a paid instance with health-check pinging, reduces that cold-start delay.

Project Goal

To make event planning easier, more flexible, budget-aware, and accessible to people across India through multilingual AI assistance.

---

Developed for Google PromptWars Virtual — Challenge 5: Celebration & Event Planner.
