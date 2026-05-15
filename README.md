# AudienceIQ

**Know your reader before you write a single word.**

AI-powered audience analysis tool for technical writers. Describe your audience in plain language, get back a knowledge profile, gap analysis, tone guidance, reader journey map, and an exportable brief.

[Live demo →](https://audienceiq.ai-engineer.app)

---

## What it does

| Section | What you get |
|---------|-------------|
| 01 Describe your audience | Plain-language input + doc type / domain context |
| 02 Analysis results | Knowledge profile bars, vocabulary guidance, reader traits |
| 03 Knowledge gaps | Severity-ranked gaps with specific actions |
| 04 Tone & vocabulary | Spectrum position, use/avoid lists |
| 05 Reader journey | How your specific reader moves through a document |
| 06 Audience brief | Exportable brief with target metrics |

---

## Tech stack

- **Framework:** Vanilla JS with ES modules (no build deps in prod)
- **Bundler:** Vite (dev server + production build)
- **Styling:** Custom CSS with design tokens (matches StyleGuard Pro aesthetic)
- **Persistence:** localStorage for persona library
- **Deployment:** Vercel

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/audienceiq.git
cd audienceiq
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the repo in the Vercel dashboard — it will auto-detect the config from `vercel.json`.

---

## Upgrade to Claude API (when ready)

The heuristic engine in `src/js/engine.js` has a drop-in replacement slot for Claude API calls.

**Steps:**

1. Add your API key as a Vercel environment variable: `VITE_ANTHROPIC_API_KEY`
2. In `src/js/engine.js`, uncomment the `analyzeWithClaude()` function
3. In `src/js/main.js`, replace the `analyzeHeuristic()` call with `analyzeWithClaude()`
4. The rendering pipeline is identical — no other changes needed

> **Note:** The Claude API cannot be called directly from the browser without exposing your key.
> For production, create a thin serverless function in `/api/analyze.js` that proxies the request.
> A Vercel serverless function template is provided below.

**Vercel serverless proxy (`/api/analyze.js`):**

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  })

  const data = await response.json()
  res.status(response.status).json(data)
}
```

Then point `analyzeWithClaude()` at `/api/analyze` instead of the Anthropic URL directly.

---

## Project structure

```
audienceiq/
├── index.html              # Main app page
├── public/
│   └── favicon.svg
├── src/
│   ├── css/
│   │   └── main.css        # All styles — design tokens, components, layout
│   ├── js/
│   │   ├── main.js         # App entry point — wires events → engine → renderer
│   │   ├── engine.js       # Analysis engine (heuristic + Claude API slot)
│   │   ├── renderer.js     # DOM rendering — decoupled from analysis logic
│   │   ├── library.js      # Persona library (localStorage)
│   │   └── export.js       # Markdown / text export utilities
│   └── pages/
│       ├── about.html
│       ├── privacy.html
│       └── changelog.html
├── vite.config.js
├── vercel.json
├── package.json
└── .gitignore
```

---

## Part of the DocTools portfolio

AudienceIQ is App B in a 26-app documentation tooling portfolio, progressing from vanilla JS through React, full-stack Node.js/Supabase, and Claude API integrations.

Pain point validation: 347+ entries across 11 technical writing books. Audience mismatch is one of the highest cross-book-confirmed pain points in the entire corpus.
