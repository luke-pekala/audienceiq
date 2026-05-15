/**
 * AudienceIQ — Renderer
 * Takes analysis results and renders them into the DOM.
 * Completely decoupled from the analysis engine.
 */

// ── HELPERS ──────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id) }

function show(id) { const e = el(id); if (e) e.style.display = '' }
function hide(id) { const e = el(id); if (e) e.style.display = 'none' }
function showFlex(id) { const e = el(id); if (e) e.style.display = 'flex' }

function setHTML(id, html) { const e = el(id); if (e) e.innerHTML = html }
function setText(id, text) { const e = el(id); if (e) e.textContent = text }

function tag(label, color) {
  return `<span class="tag tag-${color}">${label}</span>`
}

function sev(level) {
  const cls = { high: 'sev-high', medium: 'sev-medium', low: 'sev-low' }
  return `<span class="sev-dot ${cls[level] || 'sev-low'}"></span><span style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-3)">${level}</span>`
}

// ── METRIC STRIP ─────────────────────────────────────────────────────────────

export function renderMetrics(metrics) {
  const map = {
    'm-tech-depth': metrics.techDepth,
    'm-gap-count':  metrics.gapCount,
    'm-vocab':      metrics.vocabLevel,
    'm-tone':       metrics.toneScore,
    'm-confidence': metrics.confidence,
  }
  for (const [id, val] of Object.entries(map)) {
    const e = el(id)
    if (e) {
      e.textContent = val
      e.classList.remove('empty')
    }
  }
}

// ── PROFILE (SECTION 02) ──────────────────────────────────────────────────────

export function renderProfile(result) {
  hide('placeholder-02')
  show('profile-grid')

  // Bars
  setHTML('bars-container', result.bars.map(b => `
    <div class="bar-row">
      <span class="bar-label">${b.label}</span>
      <div class="bar-track">
        <div class="bar-fill" data-target="${b.value}"></div>
      </div>
      <span class="bar-value">${(b.value / 10).toFixed(1)}</span>
    </div>
  `).join(''))

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%'
    })
  })

  // Traits
  setHTML('traits-container', result.traits.map(t => tag(t.label, t.color)).join(''))

  // Vocab
  setHTML('vocab-container', `
    <div style="margin-bottom: 12px">
      <div class="card-title" style="margin-bottom: 8px">Recommended</div>
      <div class="tag-row">${result.vocabRecommended.map(v => tag(v, 'green')).join('')}</div>
    </div>
    <div>
      <div class="card-title" style="margin-bottom: 8px">Avoid</div>
      <div class="tag-row">${result.vocabAvoid.map(v => tag(v, 'red')).join('')}</div>
    </div>
  `)
}

// ── GAPS (SECTION 03) ─────────────────────────────────────────────────────────

export function renderGaps(gaps) {
  hide('placeholder-03')
  show('gap-section-content')

  setHTML('gap-tbody', gaps.map(g => `
    <tr data-sev="${g.severity}">
      <td style="white-space:nowrap">${sev(g.severity)}</td>
      <td style="color:var(--text)">${g.gap}</td>
      <td>${g.action}</td>
    </tr>
  `).join(''))
}

// ── TONE (SECTION 04) ─────────────────────────────────────────────────────────

export function renderTone(result) {
  hide('placeholder-04')
  show('tone-content')

  // Spectrum
  setTimeout(() => {
    const fill  = el('spectrum-fill')
    const thumb = el('spectrum-thumb')
    if (fill)  fill.style.width = result.tonePercent + '%'
    if (thumb) thumb.style.left = result.tonePercent + '%'
  }, 80)

  // Use / Avoid lists
  setHTML('tone-use-list',   result.toneUse.map(t   => `<div class="tone-item">${t}</div>`).join(''))
  setHTML('tone-avoid-list', result.toneAvoid.map(t => `<div class="tone-item">${t}</div>`).join(''))
}

// ── JOURNEY (SECTION 05) ──────────────────────────────────────────────────────

export function renderJourney(journey) {
  hide('placeholder-05')
  show('journey-content')

  setHTML('journey-list', journey.map((step, i) => `
    <div class="journey-step">
      <span class="journey-step-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="journey-step-body">
        <div class="journey-step-title">${step.title}</div>
        <div class="journey-step-desc">${step.desc}</div>
      </div>
      <span class="journey-step-badge tag tag-${step.badgeColor}">${step.badge}</span>
    </div>
  `).join(''))
}

// ── BRIEF (SECTION 06) ────────────────────────────────────────────────────────

export function renderBrief(result) {
  hide('placeholder-06')
  show('brief-content')

  setText('brief-persona-name', result.personaName + ' · Audience Brief')
  setText('brief-generated-at', 'Generated ' + new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }))
  setText('brief-text', result.briefText)

  setHTML('brief-stats', result.briefStats.map(s => `
    <div class="brief-stat">
      <div class="brief-stat-value">${s.value}</div>
      <div class="brief-stat-label">${s.label}</div>
    </div>
  `).join(''))
}

// ── RESET ALL ────────────────────────────────────────────────────────────────

export function resetUI() {
  const placeholders = ['placeholder-02', 'placeholder-03', 'placeholder-04', 'placeholder-05', 'placeholder-06']
  const contents     = ['profile-grid', 'gap-section-content', 'tone-content', 'journey-content', 'brief-content']
  const metrics      = ['m-tech-depth', 'm-gap-count', 'm-vocab', 'm-tone', 'm-confidence']

  placeholders.forEach(show)
  contents.forEach(hide)

  metrics.forEach(id => {
    const e = el(id)
    if (e) { e.textContent = '—'; e.classList.add('empty') }
  })
}
