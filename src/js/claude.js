/**
 * AudienceIQ — Claude API Client
 * Client-side only. Key stored in localStorage, never sent anywhere except Anthropic.
 */

const STORAGE_KEY = 'audienceiq_api_key'
const API_URL     = 'https://api.anthropic.com/v1/messages'
const MODEL       = 'claude-sonnet-4-20250514'

// ── KEY MANAGEMENT ────────────────────────────────────────────────────────────

export function saveKey(key) {
  try { localStorage.setItem(STORAGE_KEY, key.trim()) } catch {}
}

export function loadKey() {
  try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
}

export function clearKey() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function hasKey() {
  return loadKey().startsWith('sk-ant-')
}

// ── ANALYSIS ──────────────────────────────────────────────────────────────────

export async function analyzeWithClaude(description, docType, domain, deliverable) {
  const key = loadKey()
  if (!key) throw new Error('No API key set')

  const contextParts = [
    `Audience description: ${description}`,
    docType     ? `Document type: ${docType}`        : null,
    domain      ? `Domain: ${domain}`                : null,
    deliverable ? `Deliverable context: ${deliverable}` : null,
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are an expert technical writing consultant specialising in audience analysis.
Given a plain-language description of a document audience, return a JSON object with EXACTLY this shape — no markdown fences, no preamble, just the raw JSON object:

{
  "personaName": "short descriptive name for this audience e.g. Senior Engineer, Executive Stakeholder, Non-Technical End User",
  "metrics": {
    "techDepth": "number 0-10 as string e.g. 8.5",
    "gapCount": 4,
    "vocabLevel": "CEFR level: A1 A2 B1 B2 C1 or C2",
    "toneScore": "percentage string e.g. 65%",
    "confidence": "percentage string e.g. 88%"
  },
  "bars": [
    { "label": "Technical depth",  "value": 85 },
    { "label": "Domain expertise", "value": 70 },
    { "label": "Reading patience", "value": 30 },
    { "label": "Jargon tolerance", "value": 90 }
  ],
  "traits": [
    { "label": "trait name", "color": "blue" }
  ],
  "vocabRecommended": ["term or pattern 1", "term or pattern 2"],
  "vocabAvoid": ["thing to avoid 1", "thing to avoid 2"],
  "gaps": [
    { "severity": "high", "gap": "gap name", "action": "specific actionable advice" }
  ],
  "tonePercent": 60,
  "toneUse": ["specific use recommendation"],
  "toneAvoid": ["specific avoid recommendation"],
  "journey": [
    { "title": "step title", "desc": "what the reader does at this step", "badge": "short label", "badgeColor": "amber" }
  ],
  "briefText": "2-3 sentence paragraph summarising everything a writer needs to know about this audience before writing a single word",
  "briefStats": [
    { "value": "Gr. 10-12", "label": "Target grade" },
    { "value": "≤5%",       "label": "Passive voice" },
    { "value": "<4",        "label": "Sentences/para" },
    { "value": "Code first","label": "Lead structure" },
    { "value": "92%",       "label": "Confidence" }
  ]
}

Rules:
- bars values are 0-100 integers
- trait colors must be one of: blue amber red green purple neutral
- gap severities must be: high medium or low
- badgeColor must be one of: blue amber green neutral
- tonePercent is 0-100 where 0=very formal, 100=very casual
- Be specific and actionable — generic advice is worthless
- Tailor everything to the exact audience described, including cultural and organisational context
- briefText should be dense and immediately useful to a writer sitting down to draft`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-request-header': 'allow',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: contextParts }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) throw new Error('Invalid API key — check it and try again.')
    if (response.status === 429) throw new Error('Rate limit hit — wait a moment and try again.')
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const raw  = data.content?.[0]?.text ?? ''
  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('Claude returned unexpected output — please try again.')
  }
}
