/**
 * AudienceIQ — Analysis Engine
 * Heuristic analysis with a clean slot for Claude API integration.
 *
 * To upgrade to AI-powered analysis:
 *   1. Set AUDIENCEIQ_API_KEY in your environment / Vercel env vars
 *   2. Replace the `analyzeHeuristic()` call in `analyze()` with `analyzeWithClaude()`
 *   3. The rest of the rendering pipeline stays identical
 */

// ── CLAUDE API INTEGRATION SLOT ─────────────────────────────────────────────
// Uncomment and configure when ready to upgrade from heuristics to AI.
//
// const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
// const MODEL          = 'claude-sonnet-4-20250514'
//
// async function analyzeWithClaude(description, docType, domain, deliverable) {
//   const systemPrompt = `You are an expert technical writing consultant.
//   Given a plain-language description of an audience, return a JSON object with this exact shape:
//   {
//     "personaName": string,
//     "metrics": { "techDepth": number(0-10), "gapCount": number, "vocabLevel": string, "toneScore": number(0-100), "confidence": number(0-100) },
//     "bars": [ { "label": string, "value": number(0-100) } ],
//     "traits": [ { "label": string, "color": "blue|amber|red|green|neutral" } ],
//     "vocabRecommended": string[],
//     "vocabAvoid": string[],
//     "gaps": [ { "severity": "high|medium|low", "gap": string, "action": string } ],
//     "tonePercent": number(0-100),
//     "toneUse": string[],
//     "toneAvoid": string[],
//     "journey": [ { "title": string, "desc": string, "badge": string, "badgeColor": "blue|amber|green|neutral" } ],
//     "briefText": string,
//     "briefStats": [ { "value": string, "label": string } ]
//   }
//   Return ONLY the JSON object, no markdown, no preamble.`
//
//   const response = await fetch(CLAUDE_API_URL, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       model: MODEL,
//       max_tokens: 2000,
//       system: systemPrompt,
//       messages: [{
//         role: 'user',
//         content: `Audience: ${description}\nDoc type: ${docType || 'unspecified'}\nDomain: ${domain || 'unspecified'}\nDeliverable: ${deliverable || 'unspecified'}`
//       }]
//     })
//   })
//   const data = await response.json()
//   const raw = data.content[0].text.replace(/```json|```/g, '').trim()
//   return JSON.parse(raw)
// }

// ── HEURISTIC ANALYSIS ───────────────────────────────────────────────────────

const SIGNALS = {
  isTech:    /developer|engineer|dev\b|api\b|cli\b|code|software|sysadmin|devops|architect|backend|frontend|fullstack/i,
  isExec:    /manager|director|vp\b|executive|ceo|cto|cpo|stakeholder|leadership|c-suite|decision/i,
  isNovice:  /beginner|junior|student|learn|first.?time|non.?technical|newbie|newcomer|entry.?level/i,
  isExpert:  /senior|principal|expert|experienced|advanced|specialist|lead\b|staff\b|architect/i,
  scanOnly:  /scan|skim|quick|busy|time.?pressed|no patience|fast|rapid|impatient/i,
  isFormal:  /regulatory|legal|compliance|audit|whitepaper|proposal|executive|board|governance/i,
  isCreative:/design|ux|ui\b|creative|marketing|content|copy|brand/i,
}

function detectSignals(text) {
  const results = {}
  for (const [key, re] of Object.entries(SIGNALS)) {
    results[key] = re.test(text)
  }
  return results
}

export function analyzeHeuristic(description, docType, domain, deliverable) {
  const s = detectSignals(description)
  const t = description.toLowerCase()

  // ── Metrics ──────────────────────────────────────────────────────────────
  const techDepth = s.isTech ? (s.isExpert ? 8.8 : s.isNovice ? 3.2 : 6.5) :
                   s.isExec ? 3.8 : s.isCreative ? 4.2 : 5.0
  const domExp    = s.isExpert ? 7.5 : s.isNovice ? 2.8 : 5.5
  const patience  = s.scanOnly ? 2.2 : s.isFormal ? 7.8 : s.isExec ? 4.0 : 5.5
  const jargonTol = s.isTech ? (s.isExpert ? 9.0 : 5.5) : s.isExec ? 3.8 : 3.2
  const toneScore = s.isFormal ? 85 : s.isTech ? 60 : s.isExec ? 55 : 50
  const gapCount  = s.isTech ? 4 : s.isExec ? 3 : s.isNovice ? 6 : 5
  const vocabLevel = s.isTech ? (s.isExpert ? 'C1' : 'B2') : s.isNovice ? 'A2' : 'B1'
  const confidence = Math.min(97, 55 + Math.floor(description.length / 9))

  const personaName =
    s.isExpert && s.isTech ? 'Senior Engineer' :
    s.isNovice ? 'Beginner / Non-Technical' :
    s.isExec ? 'Executive / Decision-Maker' :
    s.isCreative ? 'Creative Professional' :
    s.isTech ? 'Technical Practitioner' :
    'General Reader'

  // ── Profile bars ─────────────────────────────────────────────────────────
  const bars = [
    { label: 'Technical depth',  value: Math.round(techDepth * 10) },
    { label: 'Domain expertise', value: Math.round(domExp * 10) },
    { label: 'Reading patience', value: Math.round(patience * 10) },
    { label: 'Jargon tolerance', value: Math.round(jargonTol * 10) },
  ]

  // ── Traits ───────────────────────────────────────────────────────────────
  const traitSets = {
    senior_tech:  [['Code-first reader','blue'],['CLI fluent','blue'],['Skims structure','green'],['Time-pressured','amber'],['Error-driven reader','neutral']],
    exec:         [['Outcome-focused','blue'],['Skips details','amber'],['Visual learner','blue'],['Decision-maker','green'],['Delegates deep reading','neutral']],
    novice:       [['Task-oriented','blue'],['Context-hungry','amber'],['Sequential reader','green'],['Example-driven','blue'],['Easily lost','amber']],
    creative:     [['Visual thinker','purple'],['Narrative reader','blue'],['Skips numbers','amber'],['Brand-sensitive','neutral']],
    general_tech: [['Problem-focused','blue'],['Moderately technical','green'],['Goal-driven','blue'],['Reference-style reader','neutral']],
    general:      [['Task-oriented','blue'],['Moderate patience','green'],['Example-driven','blue'],['Context-aware','neutral']],
  }
  const traitKey = s.isExpert && s.isTech ? 'senior_tech' :
                   s.isExec ? 'exec' :
                   s.isNovice ? 'novice' :
                   s.isCreative ? 'creative' :
                   s.isTech ? 'general_tech' : 'general'
  const traits = traitSets[traitKey].map(([label, color]) => ({ label, color }))

  // ── Vocab ─────────────────────────────────────────────────────────────────
  const vocabData = {
    senior_tech:  { rec: ['HTTP verbs','Status codes','JSON/YAML syntax','CLI flags','SDK method names'],    avoid: ['Marketing language','Abstract metaphors','Feature names without context'] },
    exec:         { rec: ['ROI / business impact','Timeline language','Outcome statements','Percentages'],    avoid: ['Technical acronyms','Command syntax','Implementation detail'] },
    novice:       { rec: ['Plain English','Step labels','Before/after examples','Definitions on first use'], avoid: ['Unexplained jargon','Implied knowledge','Multi-step single sentences'] },
    creative:     { rec: ['Visual metaphors','Outcome-first sentences','Concrete examples'],                  avoid: ['Dense technical prose','Unexplained math','System architecture detail'] },
    general_tech: { rec: ['Task-goal framing','Concrete examples','Reference tables'],                        avoid: ['Over-explaining basics','Marketing openers','Passive voice'] },
    general:      { rec: ['Plain language','Numbered steps','Decision tables'],                               avoid: ['Jargon without glossary','Long paragraphs','Unexplained abbreviations'] },
  }
  const vd = vocabData[traitKey]

  // ── Gaps ──────────────────────────────────────────────────────────────────
  const gapSets = {
    senior_tech: [
      { severity:'high',   gap:'Your proprietary auth flow',   action:'Assume zero prior context — explain from the first API call, not the second.' },
      { severity:'high',   gap:'Rate limiting specifics',       action:'Surface exact limits and 429-handling before they hit production.' },
      { severity:'medium', gap:'Error code taxonomy',           action:'Map your error codes to HTTP conventions they already know.' },
      { severity:'medium', gap:'Versioning and deprecation',    action:'Add a clear changelog and migration path inline.' },
      { severity:'low',    gap:'Standard pagination patterns',  action:'One reference sentence is enough — they know cursor pagination.' },
    ],
    exec: [
      { severity:'high',   gap:'Why this matters to their OKRs', action:'Open every section with a business-outcome statement, not a feature name.' },
      { severity:'high',   gap:'Decision criteria',              action:'Make the recommendation explicit — they won\'t infer it from evidence.' },
      { severity:'medium', gap:'Technical prerequisites',        action:'Replace with business-context setup (what problem this solves, not how).' },
      { severity:'low',    gap:'Implementation detail',          action:'Move to appendix — executives forward docs, they don\'t read the appendix.' },
    ],
    novice: [
      { severity:'high',   gap:'What the product does at all',   action:'Lead with a one-sentence plain-language definition before anything else.' },
      { severity:'high',   gap:'Prerequisites and setup context',action:'Add an explicit checklist of what they need before starting.' },
      { severity:'high',   gap:'When to use each feature',       action:'Add decision tables — help them self-triage before reaching out for help.' },
      { severity:'medium', gap:'Error recovery paths',           action:'Add a troubleshooting section per task, not one global FAQ.' },
      { severity:'low',    gap:'Advanced configuration options',  action:'Move to appendix with a clear "when you\'re ready" framing.' },
    ],
    creative: [
      { severity:'high',   gap:'How this fits into their workflow', action:'Frame every concept as: what changes for you when you use this.' },
      { severity:'medium', gap:'Technical constraints that affect design decisions', action:'Surface constraints early as creative constraints, not tech debt.' },
      { severity:'low',    gap:'Backend/infrastructure detail',  action:'Omit entirely or move to a separate technical spec.' },
    ],
    general_tech: [
      { severity:'high',   gap:'Task-to-feature mapping',         action:'Organise by user task, not by system component.' },
      { severity:'medium', gap:'Error handling guidance',         action:'Provide example error messages and what action to take.' },
      { severity:'low',    gap:'Architecture overview',           action:'One diagram is enough — readers don\'t need to understand the whole system.' },
    ],
    general: [
      { severity:'high',   gap:'Goal of the document',            action:'State what the reader can do after reading — in the first two sentences.' },
      { severity:'medium', gap:'Glossary of key terms',           action:'Define terms inline on first use, link to a glossary for later reference.' },
      { severity:'low',    gap:'Background context',              action:'Move history / theory to an appendix — most readers won\'t need it.' },
    ],
  }
  const gaps = gapSets[traitKey]

  // ── Tone ──────────────────────────────────────────────────────────────────
  const toneData = {
    senior_tech: {
      pct: 60,
      use:   ['Code sample before explanation','Imperative voice: "Call the endpoint"','Parameter tables over prose','Active voice throughout'],
      avoid: ['Marketing openers','Abstract analogies','Hedging ("you can optionally")','Weak verbs: utilize, leverage, facilitate'],
    },
    exec: {
      pct: 30,
      use:   ['Outcome-first sentences','Bold recommendation blocks','Short paragraphs (2–3 sentences)','Data before context'],
      avoid: ['Technical how-it-works in body text','Passive constructions','Jargon without instant definition','Lengthy setup sections'],
    },
    novice: {
      pct: 70,
      use:   ['Numbered steps, one action each','Confirmation prompts after key steps','Screenshots with callout annotations','Define all terms on first use'],
      avoid: ['Skipping assumed knowledge','Multi-action steps','Passive constructions','Ambiguous pronouns (it, this, that)'],
    },
    creative: {
      pct: 65,
      use:   ['Visual metaphors and comparisons','Concrete before-and-after examples','Short punchy sentences'],
      avoid: ['Dense technical paragraphs','Unexplained system terminology','Pure specification language'],
    },
    general_tech: {
      pct: 55,
      use:   ['Task-goal framing per section','Examples for every abstract concept','Reference tables over inline lists'],
      avoid: ['Over-explaining common concepts','Marketing tone in technical sections','Passive voice'],
    },
    general: {
      pct: 60,
      use:   ['Plain language throughout','Step-by-step numbered instructions','Decision tables for options'],
      avoid: ['Unexplained jargon','Long dense paragraphs','Passive constructions'],
    },
  }
  const td = toneData[traitKey]

  // ── Journey ───────────────────────────────────────────────────────────────
  const journeySets = {
    senior_tech: [
      { title:'Orient in 10 seconds', desc:'Scan heading and one-line description to decide if this endpoint is relevant.', badge:'≤10 sec', badgeColor:'amber' },
      { title:'Jump to the method',   desc:'Navigate directly via sidebar or CTRL+F to the specific endpoint needed.', badge:'scan', badgeColor:'neutral' },
      { title:'Copy a working example', desc:'Extract curl command or code block and test against their environment.', badge:'task', badgeColor:'blue' },
      { title:'Read edge cases if something breaks', desc:'Return to prose only when behaviour is unexpected.', badge:'optional', badgeColor:'green' },
    ],
    exec: [
      { title:'Read executive summary', desc:'3–5 sentences: problem, solution, expected outcome.', badge:'≤30 sec', badgeColor:'amber' },
      { title:'Check the recommendation', desc:'An explicit "we recommend X because Y" block with one supporting table.', badge:'decision', badgeColor:'blue' },
      { title:'Review key metrics', desc:'ROI, timeline, and risk in a scannable table or callout.', badge:'data', badgeColor:'neutral' },
      { title:'Delegate or approve', desc:'Forward to team or sign off — they rarely read the appendix.', badge:'action', badgeColor:'green' },
    ],
    novice: [
      { title:'Understand what this is for', desc:'"What will I be able to do?" — answer this in the opening sentence.', badge:'orient', badgeColor:'amber' },
      { title:'Check prerequisites', desc:'What do I need before I start? A checklist reduces setup failures by half.', badge:'before', badgeColor:'neutral' },
      { title:'Follow numbered steps', desc:'Complete each action in sequence, confirming success before continuing.', badge:'task', badgeColor:'blue' },
      { title:'Troubleshoot if stuck', desc:'Reference an error table or FAQ without leaving the page.', badge:'support', badgeColor:'green' },
    ],
    creative: [
      { title:'Understand the creative impact', desc:'How does this tool change what I can make or how I work?', badge:'orient', badgeColor:'amber' },
      { title:'See a before-and-after example', desc:'Show the output first — they\'ll reverse-engineer the process if interested.', badge:'example', badgeColor:'blue' },
      { title:'Try the core flow', desc:'A minimal guided walkthrough of the most impressive capability.', badge:'task', badgeColor:'neutral' },
      { title:'Explore edge cases', desc:'Only after they\'ve had a win — then they want to push limits.', badge:'explore', badgeColor:'green' },
    ],
    general_tech: [
      { title:'Identify the relevant task', desc:'What am I trying to do? Help them find the right entry point fast.', badge:'orient', badgeColor:'amber' },
      { title:'Follow task-based steps', desc:'Each section answers one task goal, not one feature description.', badge:'task', badgeColor:'blue' },
      { title:'Check for common errors', desc:'Inline troubleshooting reduces support tickets significantly.', badge:'support', badgeColor:'neutral' },
      { title:'Reference advanced options', desc:'Appendix or aside — not in the main flow unless they ask.', badge:'optional', badgeColor:'green' },
    ],
    general: [
      { title:'Learn what this helps with', desc:'The goal statement sets expectations and prevents wrong-door support tickets.', badge:'orient', badgeColor:'amber' },
      { title:'Check prerequisites', desc:'List what they need before starting — date, account, file, permission.', badge:'before', badgeColor:'neutral' },
      { title:'Complete guided steps', desc:'Numbered, sequential, one action per step with visual confirmation points.', badge:'task', badgeColor:'blue' },
      { title:'Get help if stuck', desc:'Troubleshooting inline, FAQ link, support channel — in that order.', badge:'support', badgeColor:'green' },
    ],
  }
  const journey = journeySets[traitKey]

  // ── Brief ─────────────────────────────────────────────────────────────────
  const briefs = {
    senior_tech: `Your reader is a time-pressured engineer who scans, not reads. Structure must do the heavy lifting. Lead every section with a working code example — save conceptual context for optional callouts or collapsed sections. Skip product marketing entirely. Assume fluency with HTTP, JSON, and async patterns, but provide explicit context for your specific auth flow and error codes, which will be unfamiliar territory. Use second-person imperative throughout: "Call the endpoint", not "You can call the endpoint." Target Flesch-Kincaid grade level 10–12. Keep paragraph count under 4 sentences. Every heading should answer: what does this do for me right now?`,
    exec: `Your reader makes decisions from summaries. They will not read the body unless the summary hooks them. Open with a crisp problem statement — one sentence. Present the recommendation in the second paragraph as a clear assertion with supporting evidence in a table. All subsequent sections are for delegates. Assume the executive stops reading after the recommendation block. Use assertive, outcome-first language. Avoid all technical implementation detail in the main body. Grade target: 10–12. Maximum passive voice: 5%.`,
    novice: `Your reader needs to build understanding progressively and has no tolerance for assumed knowledge. Define every term on first use. Structure as numbered tasks with one action per step and a success checkpoint before continuing. Add a prerequisites checklist at the top of every major task. Keep sentences under 20 words. Use screenshots with callout annotations at every critical decision point. Target Flesch-Kincaid grade 7–9. Passive voice: maximum 5%. Test every draft against this question: could someone who has never used software follow this and succeed on their first attempt?`,
    creative: `Your reader thinks visually and responds to concrete outcomes. Lead with a compelling example of what's possible — they'll reverse-engineer the how from the what. Structure by creative goal, not system feature. Every abstract concept needs a concrete visual analogy. Keep prose punchy: short sentences, short paragraphs. Grade target: 9–11. Avoid dense specification language — it signals "not for me" to this audience and creates instant abandonment.`,
    general_tech: `Your reader is task-oriented and moderately technical. They arrive with a problem to solve, not a desire to learn the system. Organise by task sequence, not system architecture. Lead each section with the user goal — what does this allow me to do? — not the feature name. Provide concrete examples for every abstract concept. Grade target: 9–11. Avoid over-explaining concepts they likely know (basic web, file management, accounts) and under-explaining concepts specific to your product.`,
    general: `Your reader is goal-driven and comes to your documentation to accomplish a specific task. They are not reading for learning — they are reading to act. Open every section by stating what the reader will be able to do. Structure as sequential numbered steps, one action each. Define all jargon. Keep sentences under 20 words where possible. Grade target: 8–10. Test drafts against this standard: could a motivated person with no prior context follow this and succeed on their first attempt?`,
  }

  // ── Brief stats ───────────────────────────────────────────────────────────
  const gradeMap  = { senior_tech:'10–12', exec:'10–12', novice:'7–9',  creative:'9–11', general_tech:'9–11', general:'8–10' }
  const pvMap     = { senior_tech:'≤5%',   exec:'≤5%',   novice:'≤5%',  creative:'≤8%',  general_tech:'≤8%',  general:'≤8%' }
  const leadMap   = { senior_tech:'Code first', exec:'Outcome first', novice:'Goal first', creative:'Example first', general_tech:'Task first', general:'Task first' }
  const paraMap   = { senior_tech:'<4',    exec:'<3',    novice:'<5',   creative:'<4',   general_tech:'<5',   general:'<5' }

  const briefStats = [
    { value:'Gr. ' + gradeMap[traitKey],  label:'Target grade' },
    { value:pvMap[traitKey],              label:'Passive voice' },
    { value:paraMap[traitKey],            label:'Sentences/para' },
    { value:leadMap[traitKey],            label:'Lead structure' },
    { value:confidence + '%',             label:'Confidence' },
  ]

  return {
    personaName,
    metrics: {
      techDepth: techDepth.toFixed(1),
      gapCount,
      vocabLevel,
      toneScore: toneScore + '%',
      confidence: confidence + '%',
    },
    bars,
    traits,
    vocabRecommended: vd.rec,
    vocabAvoid: vd.avoid,
    gaps,
    tonePercent: td.pct,
    toneUse:     td.use,
    toneAvoid:   td.avoid,
    journey,
    briefText: briefs[traitKey],
    briefStats,
  }
}
