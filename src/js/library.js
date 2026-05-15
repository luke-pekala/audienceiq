/**
 * AudienceIQ — Persona Library
 * Saves and retrieves personas from localStorage.
 */

const STORAGE_KEY = 'audienceiq_personas'

export function savePersona(description, docType, domain, result) {
  const personas = loadAll()
  const entry = {
    id:          Date.now().toString(36),
    name:        result.personaName,
    description,
    docType,
    domain,
    confidence:  result.metrics.confidence,
    briefText:   result.briefText,
    savedAt:     new Date().toISOString(),
  }
  personas.unshift(entry)
  // Keep a max of 20 saved personas
  const trimmed = personas.slice(0, 20)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)) } catch {}
  return entry
}

export function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function deletePersona(id) {
  const personas = loadAll().filter(p => p.id !== id)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(personas)) } catch {}
}

export function renderLibrary(containerEl, onLoad) {
  const personas = loadAll()

  if (personas.length === 0) {
    containerEl.innerHTML = `
      <div class="placeholder persona-empty">
        No saved personas yet.<br>
        Run an analysis and click "Save persona" to build your library.
      </div>
    `
    return
  }

  containerEl.innerHTML = personas.map(p => `
    <div class="persona-card" data-id="${p.id}">
      <div class="persona-card-header">
        <span class="persona-card-name">${p.name}</span>
        <span class="tag tag-neutral">${p.confidence}</span>
      </div>
      <div class="persona-card-doc">${[p.docType, p.domain].filter(Boolean).join(' · ') || 'No doc type specified'}</div>
      <div style="font-size:12px;color:var(--text-3);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.description}</div>
      <div class="persona-card-footer">
        <span class="persona-card-date">${new Date(p.savedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm load-btn" data-id="${p.id}">Load ↗</button>
          <button class="btn btn-sm delete-btn" data-id="${p.id}" style="color:var(--red)">Delete</button>
        </div>
      </div>
    </div>
  `).join('')

  // Wire buttons
  containerEl.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const persona = personas.find(p => p.id === btn.dataset.id)
      if (persona && onLoad) onLoad(persona)
    })
  })

  containerEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      deletePersona(btn.dataset.id)
      renderLibrary(containerEl, onLoad)
    })
  })
}
