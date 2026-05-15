/**
 * AudienceIQ — Main Entry Point
 * Wires DOM events → engine → renderer pipeline.
 */

import '../css/main.css'
import { analyzeHeuristic } from './engine.js'
import {
  renderMetrics, renderProfile, renderGaps,
  renderTone, renderJourney, renderBrief, resetUI
} from './renderer.js'
import { savePersona, renderLibrary } from './library.js'
import { exportMarkdown, exportText, copyToClipboard } from './export.js'

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentResult = null
let currentDescription = ''
let activeTab = 'single'

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const audienceInput  = document.getElementById('audience-input')
const charCountEl    = document.getElementById('char-count')
const loadingBar     = document.getElementById('loading-bar')
const analyzeBtn     = document.getElementById('analyze-btn')
const clearBtn       = document.getElementById('clear-btn')
const exportBtn      = document.getElementById('export-btn')
const themeBtn       = document.getElementById('theme-btn')
const toast          = document.getElementById('toast')

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

// ── TABS ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeTab = btn.dataset.tab

    const singleView  = document.getElementById('single-view')
    const libraryView = document.getElementById('library-view')
    if (activeTab === 'library') {
      singleView?.style && (singleView.style.display = 'none')
      libraryView?.style && (libraryView.style.display = '')
      renderLibraryView()
    } else {
      singleView?.style && (singleView.style.display = '')
      libraryView?.style && (libraryView.style.display = 'none')
    }
  })
})

// ── CHAR COUNT ────────────────────────────────────────────────────────────────
audienceInput?.addEventListener('input', () => {
  const len = audienceInput.value.length
  if (charCountEl) charCountEl.textContent = len + ' chars'
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

function runAnalysis() {
  const description = audienceInput?.value.trim() ?? ''
  if (description.length < 20) {
    audienceInput.style.borderColor = 'var(--red)'
    setTimeout(() => { if (audienceInput) audienceInput.style.borderColor = '' }, 1200)
    showToast('Please describe your audience in more detail.')
    return
  }

  const docType    = document.getElementById('doc-type')?.value    ?? ''
  const domain     = document.getElementById('domain')?.value      ?? ''
  const deliverable = document.getElementById('deliverable')?.value ?? ''

  // Loading state
  if (loadingBar)  { loadingBar.style.opacity = '1' }
  if (analyzeBtn)  { analyzeBtn.textContent = 'Analyzing…'; analyzeBtn.disabled = true }
  if (exportBtn)   { exportBtn.disabled = true }

  // Simulate brief async delay (swap for real API call here)
  setTimeout(() => {
    try {
      const result = analyzeHeuristic(description, docType, domain, deliverable)
      currentResult      = result
      currentDescription = description

      renderMetrics(result.metrics)
      renderProfile(result)
      renderGaps(result.gaps)
      renderTone(result)
      renderJourney(result.journey)
      renderBrief(result)

      showToast('Analysis complete.')
    } catch (err) {
      console.error('Analysis error:', err)
      showToast('Something went wrong — please try again.')
    } finally {
      if (loadingBar)  { loadingBar.style.opacity = '0' }
      if (analyzeBtn)  { analyzeBtn.textContent = 'Analyze ⌘↵'; analyzeBtn.disabled = false }
      if (exportBtn)   { exportBtn.disabled = false }
    }
  }, 900)
}

// ── EXPORT BUTTON ─────────────────────────────────────────────────────────────
exportBtn?.addEventListener('click', () => {
  if (!currentResult) return
  exportMarkdown(
    currentResult,
    currentDescription,
    document.getElementById('doc-type')?.value ?? '',
    document.getElementById('domain')?.value ?? ''
  )
})

// ── SAVE PERSONA ──────────────────────────────────────────────────────────────
document.getElementById('save-persona-btn')?.addEventListener('click', () => {
  if (!currentResult) return
  savePersona(
    currentDescription,
    document.getElementById('doc-type')?.value ?? '',
    document.getElementById('domain')?.value ?? '',
    currentResult
  )
  showToast('Persona saved to library.')
})

// ── COPY BRIEF ────────────────────────────────────────────────────────────────
document.getElementById('copy-brief-btn')?.addEventListener('click', async () => {
  if (!currentResult) return
  const ok = await copyToClipboard(currentResult.briefText)
  if (ok) {
    const btn = document.getElementById('copy-brief-btn')
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy' }, 1600) }
  }
})

// ── EXPORT TEXT ───────────────────────────────────────────────────────────────
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

// ── LIBRARY VIEW ─────────────────────────────────────────────────────────────
function renderLibraryView() {
  const container = document.getElementById('library-grid')
  if (!container) return
  renderLibrary(container, persona => {
    // Load persona back into analysis view
    if (audienceInput) audienceInput.value = persona.description
    if (charCountEl)   charCountEl.textContent = persona.description.length + ' chars'
    const docTypeEl = document.getElementById('doc-type')
    if (docTypeEl && persona.docType) docTypeEl.value = persona.docType
    // Switch to single view and re-run
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'))
    const singleTab = document.querySelector('.nav-tab[data-tab="single"]')
    if (singleTab) singleTab.classList.add('active')
    const singleView  = document.getElementById('single-view')
    const libraryView = document.getElementById('library-view')
    if (singleView)  singleView.style.display  = ''
    if (libraryView) libraryView.style.display = 'none'
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
