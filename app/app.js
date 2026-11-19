// GTA VI Trophy Atlas: Leonida Platinum Companion & Dossier Tracker
const STORAGE_EARNED_KEY = 'gta6_trophy_atlas_earned_v1';
const STORAGE_COUNTERS_KEY = 'gta6_trophy_atlas_counters_v1';
const STORAGE_SPOILER_KEY = 'gta6_trophy_atlas_spoiler_v1';

// Initial state
let trophiesData = [];
let earnedSet = new Set();
let countersState = {};
let spoilerShieldActive = true;
let currentModalTrophyId = null;

// DOM Elements
const trophiesContainer = document.getElementById('trophies-container');
const resultsCountEl = document.getElementById('results-count');
const metricEarnedEl = document.getElementById('metric-earned');
const metricPercentEl = document.getElementById('metric-percent');
const progressBarFillEl = document.getElementById('progress-bar-fill');

const countPlatinumEl = document.getElementById('count-platinum');
const countGoldEl = document.getElementById('count-gold');
const countSilverEl = document.getElementById('count-silver');
const countBronzeEl = document.getElementById('count-bronze');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterGrade = document.getElementById('filter-grade');
const filterKind = document.getElementById('filter-kind');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');
const showAllBtn = document.getElementById('show-all-btn');

const spoilerToggleBtn = document.getElementById('spoiler-toggle-btn');
const spoilerBtnLabel = document.getElementById('spoiler-btn-label');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const resetBtn = document.getElementById('reset-btn');

const trophyModal = document.getElementById('trophy-modal');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const toastEl = document.getElementById('toast');
const countersGrid = document.getElementById('counters-grid');

// Activity counter definitions mapped to specific trophies
const ACTIVITY_COUNTERS = [
  { key: 'stunts', name: 'Stunts Completed', target: 250, trophyId: 15, unit: 'stunts' },
  { key: 'shooting_range', name: 'Shooting Range Gold Medals', target: 42, trophyId: 17, unit: 'challenges' },
  { key: 'waink', name: 'WAiNK AR Spots Scanned', target: 100, trophyId: 31, unit: 'spots' },
  { key: 'cards', name: 'Card Sets Completed', target: 3, trophyId: 30, unit: 'sets' },
  { key: 'meditations', name: 'Meditation Overlooks', target: 18, trophyId: 28, unit: 'spots' },
  { key: 'races', name: 'Races Won', target: 20, trophyId: 19, unit: 'races' },
  { key: 'strangers', name: 'Stranger Strands Completed', target: 8, trophyId: 25, unit: 'strands' },
  { key: 'garages', name: 'Garage Properties Owned', target: 8, trophyId: 54, unit: 'garages' },
  { key: 'scooter_bros', name: 'Scooter Bros Vehicles', target: 10, trophyId: 55, unit: 'vehicles' },
  { key: 'challenges', name: 'Challenges Completed', target: 50, trophyId: 32, unit: 'challenges' },
  { key: 'gang_ops', name: 'Gang Operations Raided', target: 9, trophyId: 43, unit: 'operations' },
  { key: 'bank_vaults', name: 'Bank Vaults Robbed', target: 5, trophyId: 40, unit: 'vaults' },
  { key: 'laundered_cash', name: 'Marked Bills Laundered ($)', target: 250000, trophyId: 52, step: 10000, unit: 'USD' },
  { key: 'spending', name: 'Shop Spending Total ($)', target: 100000, trophyId: 53, step: 5000, unit: 'USD' },
  { key: 'choices', name: 'Choices Made (Passive)', target: 500, trophyId: 48, step: 25, unit: 'choices' }
];

// Grade values for sorting
const GRADE_RANKS = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1
};

// Medals icons
const GRADE_ICONS = {
  platinum: '🏆',
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉'
};

// Initialize Application
async function initApp() {
  loadStoredPreferences();
  setupEventListeners();
  await loadTrophiesData();
  renderCounters();
  renderTrophies();
  updateDashboardMetrics();
}

// Load persisted state from localStorage
function loadStoredPreferences() {
  try {
    const storedEarned = localStorage.getItem(STORAGE_EARNED_KEY);
    if (storedEarned) {
      earnedSet = new Set(JSON.parse(storedEarned));
    }
  } catch (e) {
    console.error('Failed to load earned state:', e);
    earnedSet = new Set();
  }

  try {
    const storedCounters = localStorage.getItem(STORAGE_COUNTERS_KEY);
    if (storedCounters) {
      countersState = JSON.parse(storedCounters);
    }
  } catch (e) {
    console.error('Failed to load counters state:', e);
    countersState = {};
  }

  try {
    const storedSpoiler = localStorage.getItem(STORAGE_SPOILER_KEY);
    if (storedSpoiler !== null) {
      spoilerShieldActive = JSON.parse(storedSpoiler);
    }
  } catch (e) {
    console.error('Failed to load spoiler state:', e);
    spoilerShieldActive = true;
  }

  updateSpoilerButtonUI();
}

// Fetch trophies dataset
async function loadTrophiesData() {
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    trophiesData = data.trophies || [];
  } catch (err) {
    console.error('Failed to fetch local trophies JSON:', err);
    trophiesContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #ff6b81;">
        <h3>Error loading trophy catalog</h3>
        <p>Ensure app/data/trophies.json is accessible.</p>
      </div>`;
  }
}

// Save current state
function saveState() {
  try {
    localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify([...earnedSet]));
    localStorage.setItem(STORAGE_COUNTERS_KEY, JSON.stringify(countersState));
    localStorage.setItem(STORAGE_SPOILER_KEY, JSON.stringify(spoilerShieldActive));
  } catch (e) {
    console.warn('Unable to persist to localStorage:', e);
  }
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

// Dashboard metrics update
function updateDashboardMetrics() {
  const total = trophiesData.length || 55;
  const earned = earnedSet.size;
  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;

  metricEarnedEl.textContent = earned;
  metricPercentEl.textContent = `(${percent}%)`;
  progressBarFillEl.style.width = `${percent}%`;

  let platCount = 0, platTotal = 0;
  let goldCount = 0, goldTotal = 0;
  let silverCount = 0, silverTotal = 0;
  let bronzeCount = 0, bronzeTotal = 0;

  for (const t of trophiesData) {
    const isEarned = earnedSet.has(t.id);
    if (t.grade === 'platinum') {
      platTotal++;
      if (isEarned) platCount++;
    } else if (t.grade === 'gold') {
      goldTotal++;
      if (isEarned) goldCount++;
    } else if (t.grade === 'silver') {
      silverTotal++;
      if (isEarned) silverCount++;
    } else if (t.grade === 'bronze') {
      bronzeTotal++;
      if (isEarned) bronzeCount++;
    }
  }

  countPlatinumEl.textContent = `${platCount} / ${platTotal || 1}`;
  countGoldEl.textContent = `${goldCount} / ${goldTotal || 2}`;
  countSilverEl.textContent = `${silverCount} / ${silverTotal || 6}`;
  countBronzeEl.textContent = `${bronzeCount} / ${bronzeTotal || 46}`;
}

// Toggle trophy earned state
function toggleTrophy(id) {
  if (earnedSet.has(id)) {
    earnedSet.delete(id);
    showToast(`Trophy #${id} marked unearned`);
  } else {
    earnedSet.add(id);
    showToast(`Trophy #${id} marked as EARNED!`);

    // Check if all 54 other trophies are earned, auto-grant platinum (#1)
    if (id !== 1 && earnedSet.size === 54 && !earnedSet.has(1)) {
      earnedSet.add(1);
      showToast('🏆 CONGRATULATIONS! Platinum Trophy #1 Unlocked!');
    }
  }

  saveState();
  updateDashboardMetrics();

  // Re-render only changed card state or re-render list if filtered by status
  const card = document.querySelector(`.trophy-card[data-id="${id}"]`);
  if (card) {
    const isNowEarned = earnedSet.has(id);
    card.classList.toggle('is-earned', isNowEarned);
    const cb = card.querySelector('.trophy-check');
    if (cb) cb.checked = isNowEarned;
    const statusLabel = card.querySelector('.quick-status-label');
    if (statusLabel) statusLabel.textContent = isNowEarned ? 'Earned' : 'Unearned';
  }

  // If status filter is active, update grid
  if (filterStatus.value !== 'all') {
    renderTrophies();
  }
}

// Spoiler Shield UI update
function updateSpoilerButtonUI() {
  if (spoilerShieldActive) {
    spoilerToggleBtn.classList.remove('off');
    spoilerBtnLabel.textContent = 'Spoiler Shield: ON';
    spoilerToggleBtn.title = 'Story mission descriptions and steps are shielded. Click to reveal.';
  } else {
    spoilerToggleBtn.classList.add('off');
    spoilerBtnLabel.textContent = 'Spoiler Shield: OFF';
    spoilerToggleBtn.title = 'Story mission descriptions are visible. Click to shield.';
  }
}

function toggleSpoilerShield() {
  spoilerShieldActive = !spoilerShieldActive;
  saveState();
  updateSpoilerButtonUI();
  renderTrophies();
  showToast(spoilerShieldActive ? 'Spoiler Shield Enabled' : 'Spoiler Shield Disabled');
}

// Render Trophy Cards Grid
function renderTrophies() {
  if (!trophiesContainer) return;

  const query = searchInput.value.trim().toLowerCase();
  const selectedGrade = filterGrade.value;
  const selectedKind = filterKind.value;
  const selectedStatus = filterStatus.value;
  const selectedSort = sortBy.value;

  // Filter
  let filtered = trophiesData.filter(trophy => {
    // Grade filter
    if (selectedGrade !== 'all' && trophy.grade !== selectedGrade) return false;

    // Kind filter
    if (selectedKind !== 'all') {
      if (selectedKind === 'strangers' && trophy.kind !== 'strangers') return false;
      else if (selectedKind === 'activities' && trophy.kind !== 'activities') return false;
      else if (selectedKind === 'exploration' && trophy.kind !== 'exploration') return false;
      else if (selectedKind !== 'strangers' && selectedKind !== 'activities' && selectedKind !== 'exploration' && trophy.kind !== selectedKind) return false;
    }

    // Status filter
    const isEarned = earnedSet.has(trophy.id);
    if (selectedStatus === 'earned' && !isEarned) return false;
    if (selectedStatus === 'unearned' && isEarned) return false;

    // Search query
    if (query) {
      const matchName = trophy.name.toLowerCase().includes(query);
      const matchDesc = trophy.description.toLowerCase().includes(query);
      const matchGuide = trophy.guide.toLowerCase().includes(query);
      const matchId = String(trophy.id) === query;
      if (!matchName && !matchDesc && !matchGuide && !matchId) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (selectedSort === 'id-asc') return a.id - b.id;
    if (selectedSort === 'grade-desc') {
      const diff = (GRADE_RANKS[b.grade] || 0) - (GRADE_RANKS[a.grade] || 0);
      return diff !== 0 ? diff : a.id - b.id;
    }
    if (selectedSort === 'name-asc') return a.name.localeCompare(b.name);
    if (selectedSort === 'stage-asc') {
      const diff = (a.roadmap_stage || 1) - (b.roadmap_stage || 1);
      return diff !== 0 ? diff : a.id - b.id;
    }
    return a.id - b.id;
  });

  // Results count
  resultsCountEl.textContent = `Showing ${filtered.length} of ${trophiesData.length} trophies`;

  if (filtered.length === 0) {
    trophiesContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">No trophies match your current filters.</p>
        <button id="empty-reset-btn" class="action-btn" type="button" style="margin-top: 12px;">Reset All Filters</button>
      </div>`;
    const emptyResetBtn = document.getElementById('empty-reset-btn');
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);
    return;
  }

  // Generate cards HTML
  const cardsHtml = filtered.map(t => {
    const isEarned = earnedSet.has(t.id);
    const isStory = t.kind === 'story' || t.roadmap_stage === 1;
    const applySpoiler = spoilerShieldActive && isStory && !isEarned;
    const medal = GRADE_ICONS[t.grade] || '🥉';

    return `
      <article class="trophy-card ${isEarned ? 'is-earned' : ''} ${applySpoiler ? 'is-spoiler' : ''}" data-id="${t.id}">
        <div class="trophy-card-header">
          <div class="checkbox-wrap">
            <input type="checkbox" class="trophy-check" data-id="${t.id}" aria-label="Mark ${t.name} as earned" ${isEarned ? 'checked' : ''}>
          </div>
          <div class="trophy-title-area">
            <span class="trophy-id-badge">#${t.id} · STAGE ${t.roadmap_stage || 1}</span>
            <h3 class="trophy-title">${t.name}</h3>
            <div class="trophy-meta-tags">
              <span class="meta-tag stage">Stage ${t.roadmap_stage || 1}</span>
              <span class="meta-tag">${t.kind || 'general'}</span>
              ${t.missable ? '<span class="meta-tag missable-tag">⚠️ Missable Risk</span>' : ''}
              ${t.target_count ? `<span class="meta-tag">Target: ${t.target_count.toLocaleString()}</span>` : ''}
            </div>
          </div>
          <div class="trophy-grade-badge ${t.grade}" title="Grade: ${t.grade}">
            <span>${medal}</span>
            <span>${t.grade}</span>
          </div>
        </div>

        <p class="trophy-desc">${t.description}</p>
        <button class="spoiler-unmask-btn" type="button" data-unmask-id="${t.id}">Reveal Hidden Story Details</button>

        <div class="trophy-guide-preview">
          ${t.guide.length > 140 ? t.guide.slice(0, 140) + '...' : t.guide}
        </div>

        <div class="trophy-card-footer">
          <button class="view-guide-btn" type="button" data-open-modal="${t.id}">
            <span>View Full Guide &amp; Steps</span> &rarr;
          </button>
          <span class="quick-status-label">${isEarned ? 'Earned' : 'Unearned'}</span>
        </div>
      </article>
    `;
  }).join('');

  trophiesContainer.innerHTML = cardsHtml;
}

// Trophy Detail Modal
function openTrophyModal(id) {
  const trophy = trophiesData.find(t => t.id === Number(id));
  if (!trophy) return;
  currentModalTrophyId = trophy.id;

  const isEarned = earnedSet.has(trophy.id);
  const medal = GRADE_ICONS[trophy.grade] || '🥉';

  modalContent.innerHTML = `
    <div class="modal-header-section">
      <div class="modal-title-row">
        <span class="trophy-id-badge" style="font-size: 0.9rem;">TROPHY #${trophy.id}</span>
        <div class="trophy-grade-badge ${trophy.grade}">
          <span>${medal}</span>
          <span>${trophy.grade}</span>
        </div>
        ${trophy.missable ? '<span class="meta-tag missable-tag" style="font-size: 0.8rem;">⚠️ Missable Warning</span>' : ''}
      </div>
      <h2>${trophy.name}</h2>
      <p class="modal-description">${trophy.description}</p>
      
      <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
        <button id="modal-toggle-earned" class="action-btn ${isEarned ? 'danger-action' : 'primary-action'}" type="button">
          ${isEarned ? 'Mark as Unearned' : '✔ Mark as Earned'}
        </button>
        <span style="font-size: 0.85rem; color: var(--text-dim);">
          Roadmap Stage: <strong>Stage ${trophy.roadmap_stage || 1}</strong> · Category: <strong>${trophy.kind}</strong>
        </span>
      </div>
    </div>

    ${trophy.missable_note ? `
      <div class="missable-card danger" style="padding: 12px 16px;">
        <div class="missable-badge">PREVENTIVE ADVICE</div>
        <p style="font-size: 0.9rem; color: #ffb8c6; margin-top: 4px;">${trophy.missable_note}</p>
      </div>
    ` : ''}

    <div>
      <h4 class="modal-section-title">Strategic Walkthrough Guide</h4>
      <div class="modal-guide-text">${trophy.guide}</div>
    </div>

    ${trophy.steps && trophy.steps.length ? `
      <div>
        <h4 class="modal-section-title">Actionable Checklist Steps</h4>
        <ol class="modal-steps-list">
          ${trophy.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    ` : ''}

    <div class="modal-sources-box">
      <strong>Citation &amp; Provenance:</strong> ${trophy.sources}
    </div>
  `;

  // Hook modal toggle button
  const modalToggleBtn = document.getElementById('modal-toggle-earned');
  if (modalToggleBtn) {
    modalToggleBtn.addEventListener('click', () => {
      toggleTrophy(trophy.id);
      openTrophyModal(trophy.id);
    });
  }

  trophyModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeTrophyModal() {
  trophyModal.classList.add('hidden');
  document.body.style.overflow = '';
  currentModalTrophyId = null;
}

// 100% Activities Tracker Cards
function renderCounters() {
  if (!countersGrid) return;

  const html = ACTIVITY_COUNTERS.map(c => {
    const val = countersState[c.key] || 0;
    const pct = Math.min(100, Math.round((val / c.target) * 100));
    const step = c.step || 1;

    return `
      <div class="counter-card" data-counter-key="${c.key}">
        <div class="counter-card-header">
          <span class="counter-card-title">${c.name}</span>
          <span class="counter-ratio"><span class="val">${val.toLocaleString()}</span> / ${c.target.toLocaleString()} ${c.unit}</span>
        </div>
        <div class="counter-progress-bar">
          <div class="counter-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="counter-controls">
          <button class="counter-btn dec-btn" data-key="${c.key}" data-step="${step}" type="button" title="Decrease">&minus;</button>
          <input type="range" class="counter-slider" data-key="${c.key}" min="0" max="${c.target}" step="${step}" value="${val}">
          <button class="counter-btn inc-btn" data-key="${c.key}" data-step="${step}" type="button" title="Increase">&plus;</button>
          <button class="counter-max-btn" data-key="${c.key}" data-max="${c.target}" type="button">MAX</button>
        </div>
      </div>
    `;
  }).join('');

  countersGrid.innerHTML = html;
}

function updateCounter(key, newValue) {
  const def = ACTIVITY_COUNTERS.find(c => c.key === key);
  if (!def) return;

  const bounded = Math.max(0, Math.min(def.target, Number(newValue)));
  countersState[key] = bounded;

  // Auto-earn mapped trophy if reached target
  if (bounded >= def.target && def.trophyId && !earnedSet.has(def.trophyId)) {
    toggleTrophy(def.trophyId);
    showToast(`🎯 Counter complete! Trophy #${def.trophyId} earned!`);
  }

  saveState();

  // Update counter card UI
  const card = document.querySelector(`.counter-card[data-counter-key="${key}"]`);
  if (card) {
    const valEl = card.querySelector('.val');
    if (valEl) valEl.textContent = bounded.toLocaleString();
    const fillEl = card.querySelector('.counter-progress-fill');
    const pct = Math.min(100, Math.round((bounded / def.target) * 100));
    if (fillEl) fillEl.style.width = `${pct}%`;
    const slider = card.querySelector('.counter-slider');
    if (slider) slider.value = bounded;
  }
}

// Reset all search and filter selectors
function resetAllFilters() {
  searchInput.value = '';
  clearSearchBtn.classList.remove('visible');
  filterGrade.value = 'all';
  filterKind.value = 'all';
  filterStatus.value = 'all';
  sortBy.value = 'id-asc';
  document.querySelectorAll('.grade-pill').forEach(p => p.classList.remove('active-filter'));
  renderTrophies();
}

// Export checklist JSON
function exportData() {
  const exportPayload = {
    app: 'GTA VI Trophy Atlas',
    version: '2026.11.19',
    exported_at: new Date().toISOString(),
    earned_trophies: [...earnedSet],
    earned_count: earnedSet.size,
    activity_counters: countersState
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gta6-trophy-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Progress exported as JSON file');
}

// Import checklist JSON
function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.earned_trophies)) {
        earnedSet = new Set(data.earned_trophies);
      }
      if (data.activity_counters && typeof data.activity_counters === 'object') {
        countersState = data.activity_counters;
      }
      saveState();
      updateDashboardMetrics();
      renderCounters();
      renderTrophies();
      showToast(`Imported ${earnedSet.size} earned trophies!`);
    } catch (err) {
      alert('Error parsing uploaded JSON backup.');
    }
  };
  reader.readAsText(file);
}

// Reset all checklist and counters
function resetAllData() {
  if (confirm('Are you sure you want to reset all earned trophies and activity counters? This cannot be undone.')) {
    earnedSet.clear();
    countersState = {};
    saveState();
    updateDashboardMetrics();
    renderCounters();
    renderTrophies();
    showToast('All progress reset to zero');
  }
}

// Event Listeners Wiring
function setupEventListeners() {
  // Tabs Navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.getAttribute('data-tab')}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Grade Pills Filtering
  document.querySelectorAll('.grade-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const grade = pill.getAttribute('data-filter-grade');
      if (filterGrade.value === grade) {
        filterGrade.value = 'all';
        pill.classList.remove('active-filter');
      } else {
        filterGrade.value = grade;
        document.querySelectorAll('.grade-pill').forEach(p => p.classList.remove('active-filter'));
        pill.classList.add('active-filter');
      }
      // Switch to tracker tab if not active
      const trackerTab = document.querySelector('.nav-tab[data-tab="tracker"]');
      if (trackerTab && !trackerTab.classList.contains('active')) {
        trackerTab.click();
      }
      renderTrophies();
    });
  });

  // Search Input
  searchInput.addEventListener('input', () => {
    clearSearchBtn.classList.toggle('visible', searchInput.value.length > 0);
    renderTrophies();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('visible');
    searchInput.focus();
    renderTrophies();
  });

  // Select Filters
  filterGrade.addEventListener('change', () => {
    document.querySelectorAll('.grade-pill').forEach(p => {
      p.classList.toggle('active-filter', p.getAttribute('data-filter-grade') === filterGrade.value);
    });
    renderTrophies();
  });
  filterKind.addEventListener('change', renderTrophies);
  filterStatus.addEventListener('change', renderTrophies);
  sortBy.addEventListener('change', renderTrophies);
  showAllBtn.addEventListener('click', resetAllFilters);

  // Spoiler Shield Toggle
  spoilerToggleBtn.addEventListener('click', toggleSpoilerShield);

  // Backup & Reset Actions
  exportBtn.addEventListener('click', exportData);
  importInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importData(e.target.files[0]);
      e.target.value = '';
    }
  });
  resetBtn.addEventListener('click', resetAllData);

  // Delegate Trophy Card Interactions
  trophiesContainer.addEventListener('click', (e) => {
    const cb = e.target.closest('.trophy-check');
    if (cb) {
      const id = Number(cb.getAttribute('data-id'));
      toggleTrophy(id);
      return;
    }

    const openBtn = e.target.closest('.view-guide-btn');
    if (openBtn) {
      const id = Number(openBtn.getAttribute('data-open-modal'));
      openTrophyModal(id);
      return;
    }

    const unmaskBtn = e.target.closest('.spoiler-unmask-btn');
    if (unmaskBtn) {
      const card = unmaskBtn.closest('.trophy-card');
      if (card) {
        card.classList.remove('is-spoiler');
        unmaskBtn.style.display = 'none';
      }
      return;
    }
  });

  // Delegate Counter Interactions
  if (countersGrid) {
    countersGrid.addEventListener('click', (e) => {
      const dec = e.target.closest('.dec-btn');
      if (dec) {
        const key = dec.getAttribute('data-key');
        const step = Number(dec.getAttribute('data-step') || 1);
        const curr = countersState[key] || 0;
        updateCounter(key, curr - step);
        return;
      }

      const inc = e.target.closest('.inc-btn');
      if (inc) {
        const key = inc.getAttribute('data-key');
        const step = Number(inc.getAttribute('data-step') || 1);
        const curr = countersState[key] || 0;
        updateCounter(key, curr + step);
        return;
      }

      const maxBtn = e.target.closest('.counter-max-btn');
      if (maxBtn) {
        const key = maxBtn.getAttribute('data-key');
        const max = Number(maxBtn.getAttribute('data-max'));
        updateCounter(key, max);
        return;
      }
    });

    countersGrid.addEventListener('input', (e) => {
      const slider = e.target.closest('.counter-slider');
      if (slider) {
        const key = slider.getAttribute('data-key');
        updateCounter(key, Number(slider.value));
      }
    });
  }

  // Modal Close Interactions
  modalCloseBtn.addEventListener('click', closeTrophyModal);
  trophyModal.addEventListener('click', (e) => {
    if (e.target === trophyModal) closeTrophyModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!trophyModal.classList.contains('hidden')) {
        closeTrophyModal();
        return;
      }
      if (document.activeElement === searchInput) {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        searchInput.blur();
        renderTrophies();
        return;
      }
    }

    // Don't intercept shortcuts when user is typing in input or select
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (isTyping) return;

    // Quick Search shortcut ('/' or 's')
    if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    // Spoiler Shield quick toggle ('s')
    if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleSpoilerShield();
      return;
    }

    // Number keys 1-5 switch navigation tabs
    const tabKeys = {
      '1': 'tracker',
      '2': 'roadmap',
      '3': 'missables',
      '4': 'activities',
      '5': 'sources'
    };
    if (tabKeys[e.key]) {
      const targetTab = document.querySelector(`.nav-tab[data-tab="${tabKeys[e.key]}"]`);
      if (targetTab) targetTab.click();
    }
  });
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', initApp);
