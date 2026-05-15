/**
 * AudienceIQ — Main Entry Point
 */

import '../css/main.css'
import { analyzeHeuristic }     from './engine.js'
import { analyzeWithClaude, saveKey, loadKey, clearKey, hasKey } from './claude.js'
import {
  renderMetrics, renderProfile, renderGaps,
  renderTone, renderJourney, renderBrief, resetUI
} from './renderer.js'
import { savePersona, renderLibrary } from './library.js'
import { exportMarkdown, exportText, copyToClipboard } from './export.js'

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentResult      = null
let currentDescription = ''
let activeTab          = 'single'

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const audienceInput = document.getElementById('audience-input')
const charCountEl   = document.getElementById('char-count')
const loadingBar    = document.getElementById('loading-bar')
const analyzeBtn    = document.getElementById('analyze-btn')
const clearBtn      = document.getElementById('clear-btn')
const exportBtn     = document.getElementById('export-btn')
const themeBtn      = document.getElementById('theme-btn')
const toast         = document.getElementById('toast')
const apiKeyInput   = document.getElementById('api-key-input')
const apiSaveBtn    = document.getElementById('api-save-btn')
const apiClearBtn   = document.getElementById('api-clear-btn')
const apiStatus     = document.getElementById('api-status')
const modeIndicator = document.getElementById('mode-indicator')

// ── THEME ─────────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('audienceiq_theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)
if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? 'Light' : 'Dark'

themeBtn?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const next   = isDark ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('audienceiq_theme', next)
  themeBtn.textContent = next === 'dark' ? 'Light' : 'Dark'
})

// ── API KEY ───────────────────────────────────────────────────────────────────
function updateApiStatus() {
  if (!apiStatus || !modeIndicator) return
  if (hasKey()) {
    apiStatus.textContent   = 'Key saved ✓'
    apiStatus.style.color   = 'var(--green)'
    modeIndicator.textContent = 'claude ai'
    modeIndicator.className = 'mode-badge mode-ai'
    if (apiKeyInput) { apiKeyInput.value = '••••••••••••••••••••••••'; apiKeyInput.type = 'password' }
    if (apiClearBtn) apiClearBtn.style.display = 'inline-flex'
  } else {
    apiStatus.textContent   = 'No key — using heuristics'
    apiStatus.style.color   = 'var(--text-3)'
    modeIndicator.textContent = 'heuristic'
    modeIndicator.className = 'mode-badge mode-heuristic'
    if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.type = 'text' }
    if (apiClearBtn) apiClearBtn.style.display = 'none'
  }
}

apiSaveBtn?.addEventListener('click', () => {
  const val = apiKeyInput?.value.trim()
  if (!val || val.includes('•')) return
  if (!val.startsWith('sk-ant-')) { showToast('Key should start with sk-ant-'); return }
  saveKey(val)
  updateApiStatus()
  showToast('API key saved — Claude AI mode active.')
})

apiKeyInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') apiSaveBtn?.click()
})

apiKeyInput?.addEventListener('focus', () => {
  if (apiKeyInput.type === 'password') { apiKeyInput.type = 'text'; apiKeyInput.value = '' }
})

apiClearBtn?.addEventListener('click', () => {
  clearKey()
  updateApiStatus()
  showToast('API key removed.')
})

updateApiStatus()

// ── TABS ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeTab = btn.dataset.tab
    const singleView  = document.getElementById('single-view')
    const libraryView = document.getElementById('library-view')
    if (activeTab === 'library') {
      if (singleView)  singleView.style.display  = 'none'
      if (libraryView) libraryView.style.display = ''
      renderLibraryView()
    } else {
      if (singleView)  singleView.style.display  = ''
      if (libraryView) libraryView.style.display = 'none'
    }
  })
})

// ── CHAR COUNT ────────────────────────────────────────────────────────────────
audienceInput?.addEventListener('input', () => {
  if (charCountEl) charCountEl.textContent = audienceInput.value.length + ' chars'
})

// ── CLEAR ─────────────────────────────────────────────────────────────────────
clearBtn?.addEventListener('click', () => {
  if (audienceInput) audienceInput.value = ''
  if (charCountEl)   charCountEl.textContent = '0 chars'
  currentResult = null
  resetUI()
})

// ── KEYBOARD SHORTCUT ─────────────────────────────────────────────────────────
audienceInput?.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runAnalysis()
})

// ── ANALYZE ───────────────────────────────────────────────────────────────────
analyzeBtn?.addEventListener('click', runAnalysis)

async function runAnalysis() {
  const description = audienceInput?.value.trim() ?? ''
  if (description.length < 20) {
    if (audienceInput) { audienceInput.style.borderColor = 'var(--red)'; setTimeout(() => { audienceInput.style.borderColor = '' }, 1200) }
    showToast('Please describe your audience in more detail.')
    return
  }

  const docType     = document.getElementById('doc-type')?.value    ?? ''
  const domain      = document.getElementById('domain')?.value      ?? ''
  const deliverable = document.getElementById('deliverable')?.value ?? ''

  if (loadingBar) loadingBar.style.opacity = '1'
  if (analyzeBtn) { analyzeBtn.textContent = 'Analyzing…'; analyzeBtn.disabled = true }
  if (exportBtn)  exportBtn.disabled = true

  try {
    let result
    if (hasKey()) {
      result = await analyzeWithClaude(description, docType, domain, deliverable)
    } else {
      await new Promise(r => setTimeout(r, 800))
      result = analyzeHeuristic(description, docType, domain, deliverable)
    }

    currentResult      = result
    currentDescription = description

    renderMetrics(result.metrics)
    renderProfile(result)
    renderGaps(result.gaps)
    renderTone(result)
    renderJourney(result.journey)
    renderBrief(result)

    showToast(hasKey() ? 'AI analysis complete.' : 'Analysis complete (heuristic mode).')
  } catch (err) {
    console.error('Analysis error:', err)
    showToast(err.message || 'Something went wrong — please try again.')
  } finally {
    if (loadingBar) loadingBar.style.opacity = '0'
    if (analyzeBtn) { analyzeBtn.textContent = 'Analyze ⌘↵'; analyzeBtn.disabled = false }
    if (exportBtn)  exportBtn.disabled = false
  }
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
exportBtn?.addEventListener('click', () => {
  if (!currentResult) return
  exportMarkdown(currentResult, currentDescription, document.getElementById('doc-type')?.value ?? '', document.getElementById('domain')?.value ?? '')
})

document.getElementById('save-persona-btn')?.addEventListener('click', () => {
  if (!currentResult) return
  savePersona(currentDescription, document.getElementById('doc-type')?.value ?? '', document.getElementById('domain')?.value ?? '', currentResult)
  showToast('Persona saved to library.')
})

document.getElementById('copy-brief-btn')?.addEventListener('click', async () => {
  if (!currentResult) return
  const ok = await copyToClipboard(currentResult.briefText)
  if (ok) {
    const btn = document.getElementById('copy-brief-btn')
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy' }, 1600) }
  }
})

document.getElementById('export-txt-btn')?.addEventListener('click', () => {
  if (!currentResult) return
  exportText(currentResult)
})

// ── GAP FILTER ────────────────────────────────────────────────────────────────
document.getElementById('gap-filter')?.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn')
  if (!btn) return
  document.querySelectorAll('#gap-filter .filter-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  const filter = btn.dataset.filter
  document.querySelectorAll('#gap-tbody tr').forEach(row => {
    row.style.display = (filter === 'all' || row.dataset.sev === filter) ? '' : 'none'
  })
})

// ── LIBRARY ───────────────────────────────────────────────────────────────────
function renderLibraryView() {
  const container = document.getElementById('library-grid')
  if (!container) return
  renderLibrary(container, persona => {
    if (audienceInput) audienceInput.value = persona.description
    if (charCountEl)   charCountEl.textContent = persona.description.length + ' chars'
    const docTypeEl = document.getElementById('doc-type')
    if (docTypeEl && persona.docType) docTypeEl.value = persona.docType
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'))
    document.querySelector('.nav-tab[data-tab="single"]')?.classList.add('active')
    document.getElementById('single-view').style.display  = ''
    document.getElementById('library-view').style.display = 'none'
    activeTab = 'single'
    runAnalysis()
  })
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  if (!toast) return
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2400)
}
