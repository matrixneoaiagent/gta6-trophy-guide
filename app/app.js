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
  { key: 'choices', name: 'Interactive Choices Made', target: 500, trophyId: 48, step: 25, unit: 'choices' }
];

// Load persisted state from localStorage
function loadState() {
  try {
    const savedEarned = localStorage.getItem(STORAGE_EARNED_KEY);
    if (savedEarned) {
      earnedSet = new Set(JSON.parse(savedEarned));
    }
  } catch (e) {
    console.error('Failed to load earned state:', e);
  }

  try {
    const savedCounters = localStorage.getItem(STORAGE_COUNTERS_KEY);
    if (savedCounters) {
      countersState = JSON.parse(savedCounters);
    }
  } catch (e) {
    console.error('Failed to load counters state:', e);
  }

  try {
    const savedSpoiler = localStorage.getItem(STORAGE_SPOILER_KEY);
    if (savedSpoiler !== null) {
      spoilerShieldActive = JSON.parse(savedSpoiler);
    }
  } catch (e) {
    console.error('Failed to load spoiler setting:', e);
  }

  updateSpoilerBtn();
}

// Persist state to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify([...earnedSet]));
    localStorage.setItem(STORAGE_COUNTERS_KEY, JSON.stringify(countersState));
    localStorage.setItem(STORAGE_SPOILER_KEY, JSON.stringify(spoilerShieldActive));
  } catch (e) {
    console.error('Failed to persist state:', e);
  }
}

// Show temporary notification
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2200);
}

// Update Spoiler button state
function updateSpoilerBtn() {
  if (spoilerShieldActive) {
    spoilerBtnLabel.textContent = 'Spoiler Shield: ON';
    spoilerToggleBtn.classList.remove('shield-off');
  } else {
    spoilerBtnLabel.textContent = 'Spoiler Shield: OFF';
    spoilerToggleBtn.classList.add('shield-off');
  }
}

// Update Top Dashboard Statistics
function updateStats() {
  const total = trophiesData.length || 55;
  const earnedCount = earnedSet.size;
  const percent = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  metricEarnedEl.textContent = earnedCount;
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

  countPlatinumEl.textContent = `${platCount} / ${platTotal}`;
  countGoldEl.textContent = `${goldCount} / ${goldTotal}`;
  countSilverEl.textContent = `${silverCount} / ${silverTotal}`;
  countBronzeEl.textContent = `${bronzeCount} / ${bronzeTotal}`;
}

// Filter and Sort Trophies
function getFilteredTrophies() {
  const query = searchInput.value.trim().toLowerCase();
  const gradeVal = filterGrade.value;
  const kindVal = filterKind.value;
  const statusVal = filterStatus.value;
  const sortVal = sortBy.value;

  let list = trophiesData.filter(t => {
    if (gradeVal !== 'all' && t.grade !== gradeVal) return false;
    if (kindVal !== 'all' && t.kind !== kindVal) return false;

    const isEarned = earnedSet.has(t.id);
    if (statusVal === 'earned' && !isEarned) return false;
    if (statusVal === 'unearned' && isEarned) return false;

    if (query) {
      const matchName = t.name.toLowerCase().includes(query);
      const matchDesc = t.description.toLowerCase().includes(query);
      const matchGuide = t.guide.toLowerCase().includes(query);
      const matchKind = t.kind.toLowerCase().includes(query);
      const matchId = String(t.id) === query || `#${t.id}` === query;
      if (!matchName && !matchDesc && !matchGuide && !matchKind && !matchId) return false;
    }

    return true;
  });

  // Sorting
  const gradeOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
  list.sort((a, b) => {
    if (sortVal === 'id-asc') return a.id - b.id;
    if (sortVal === 'grade-desc') {
      const diff = gradeOrder[b.grade] - gradeOrder[a.grade];
      return diff !== 0 ? diff : a.id - b.id;
    }
    if (sortVal === 'name-asc') return a.name.localeCompare(b.name);
    if (sortVal === 'stage-asc') {
      const diff = a.roadmap_stage - b.roadmap_stage;
      return diff !== 0 ? diff : a.id - b.id;
    }
    return a.id - b.id;
  });

  return list;
}

// Render Trophy Cards in Checklist
function renderTrophiesList() {
  const filtered = getFilteredTrophies();
  trophiesContainer.replaceChildren();

  resultsCountEl.textContent = `Showing ${filtered.length} of ${trophiesData.length} trophies`;

  if (filtered.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.padding = '40px 20px';
    emptyState.style.textAlign = 'center';
    emptyState.style.color = 'var(--text-muted)';
    emptyState.style.gridColumn = '1 / -1';
    emptyState.innerHTML = `
      <p style="font-size: 1.2rem; margin-bottom: 8px;">No trophies match your current filters.</p>
      <button class="pill-action-btn" id="empty-reset-btn" type="button">Reset All Filters</button>
    `;
    trophiesContainer.append(emptyState);
    emptyState.querySelector('#empty-reset-btn').addEventListener('click', resetFilters);
    return;
  }

  for (const t of filtered) {
    const isEarned = earnedSet.has(t.id);
    const card = document.createElement('article');
    card.className = `trophy-card ${t.grade} ${isEarned ? 'earned' : ''}`;
    card.dataset.id = t.id;

    // Mask story spoiler if spoiler shield is active and trophy is unearned
    const isSpoiler = spoilerShieldActive && t.kind === 'story' && !isEarned;
    const descClass = isSpoiler ? 'trophy-desc spoiler-masked' : 'trophy-desc';
    const previewClass = isSpoiler ? 'trophy-preview-guide spoiler-masked' : 'trophy-preview-guide';

    const medalEmoji = t.grade === 'platinum' ? '🏆' : t.grade === 'gold' ? '🥇' : t.grade === 'silver' ? '🥈' : '🥉';

    card.innerHTML = `
      <div class="trophy-card-header">
        <div class="trophy-checkbox-wrap">
          <input type="checkbox" class="trophy-check" id="check-${t.id}" ${isEarned ? 'checked' : ''} aria-label="Mark ${t.name} as earned">
        </div>
        <div class="trophy-title-wrap">
          <div class="trophy-meta-tags">
            <span class="trophy-id">#${t.id}</span>
            <span class="tag-grade ${t.grade}">${medalEmoji} ${t.grade}</span>
            <span class="tag-kind">${t.kind}</span>
            <span class="tag-stage">Stage ${t.roadmap_stage}</span>
          </div>
          <h3 class="trophy-name">${t.name}</h3>
        </div>
      </div>
      <p class="${descClass}" data-spoiler-toggle="true">${t.description}</p>
      <div class="${previewClass}" data-spoiler-toggle="true">
        <strong>Guide:</strong> ${t.guide}
      </div>
      <div class="trophy-card-footer">
        <button class="detail-link-btn" type="button" data-detail-id="${t.id}">
          Walkthrough &amp; Sources &rarr;
        </button>
        <span class="status-badge ${isEarned ? 'earned' : 'unearned'}">
          ${isEarned ? '✓ Earned' : 'Unearned'}
        </span>
      </div>
    `;

    // Checkbox toggle listener
    const checkbox = card.querySelector('.trophy-check');
    checkbox.addEventListener('change', () => {
      toggleTrophyEarned(t.id, checkbox.checked);
    });

    // Detail button listener
    const detailBtn = card.querySelector('.detail-link-btn');
    detailBtn.addEventListener('click', () => {
      openTrophyModal(t.id);
    });

    // Spoiler unmask on click
    if (isSpoiler) {
      card.querySelectorAll('[data-spoiler-toggle="true"]').forEach(el => {
        el.addEventListener('click', () => {
          el.classList.toggle('spoiler-revealed');
        });
      });
    }

    trophiesContainer.append(card);
  }
}

// Toggle trophy earned state
function toggleTrophyEarned(id, state) {
  if (state) {
    earnedSet.add(id);
    showToast(`Trophy #${id} marked as earned!`);
  } else {
    earnedSet.delete(id);
  }
  saveState();
  updateStats();
  renderTrophiesList();

  // If modal is open for this trophy, update modal button too
  if (currentModalTrophyId === id) {
    updateModalEarnedButton(id);
  }
}

// Open Trophy Detail Modal
function openTrophyModal(id) {
  const trophy = trophiesData.find(t => t.id === id);
  if (!trophy) return;
  currentModalTrophyId = id;

  const isEarned = earnedSet.has(trophy.id);
  const medalEmoji = trophy.grade === 'platinum' ? '🏆' : trophy.grade === 'gold' ? '🥇' : trophy.grade === 'silver' ? '🥈' : '🥉';

  modalContent.innerHTML = `
    <div class="modal-trophy-header">
      <div class="modal-medal-icon">${medalEmoji}</div>
      <div class="modal-title-group">
        <div class="trophy-meta-tags">
          <span class="trophy-id">#${trophy.id}</span>
          <span class="tag-grade ${trophy.grade}">${trophy.grade.toUpperCase()}</span>
          <span class="tag-kind">${trophy.kind.toUpperCase()}</span>
          <span class="tag-stage">ROADMAP STAGE ${trophy.roadmap_stage}</span>
        </div>
        <h2 id="modal-title">${trophy.name}</h2>
        <p class="modal-desc"><em>&ldquo;${trophy.description}&rdquo;</em></p>
      </div>
    </div>

    <div class="modal-meta-grid">
      <div class="modal-meta-item">
        <span class="meta-label">Category</span>
        <span class="meta-value">${trophy.kind}</span>
      </div>
      <div class="modal-meta-item">
        <span class="meta-label">Roadmap Stage</span>
        <span class="meta-value">Stage ${trophy.roadmap_stage}</span>
      </div>
      <div class="modal-meta-item">
        <span class="meta-label">Target Count</span>
        <span class="meta-value">${trophy.target_count || 1}</span>
      </div>
      <div class="modal-meta-item">
        <span class="meta-label">Missable</span>
        <span class="meta-value" style="color: ${trophy.missable ? 'var(--neon-pink)' : 'var(--success-green)'}">${trophy.missable ? 'YES (Caution)' : 'NO'}</span>
      </div>
    </div>

    <div class="modal-section-title">📋 Comprehensive Walkthrough &amp; Strategy</div>
    <div class="modal-walkthrough-text">
      ${trophy.guide}
    </div>

    ${trophy.missable_note ? `
      <div class="modal-section-title">⚠️ Missability &amp; Checkpoint Note</div>
      <div class="modal-walkthrough-text" style="border-left-color: var(--sunset-amber); background: rgba(255, 170, 0, 0.08);">
        ${trophy.missable_note}
      </div>
    ` : ''}

    ${trophy.steps && trophy.steps.length > 0 ? `
      <div class="modal-section-title">🎯 Step-by-Step Tactical Directives</div>
      <ul class="modal-steps-list">
        ${trophy.steps.map((s, idx) => `
          <li>
            <span class="step-marker">Step ${idx + 1}:</span>
            <span>${s}</span>
          </li>
        `).join('')}
      </ul>
    ` : ''}

    <div class="modal-sources-box">
      <div class="meta-label">📚 Verified Sources &amp; Citation</div>
      <p>${trophy.sources}</p>
    </div>

    <div class="modal-footer-actions">
      <button id="modal-toggle-btn" class="modal-toggle-earned-btn ${isEarned ? 'mark-unearned' : 'mark-earned'}" type="button">
        ${isEarned ? '✕ Mark as Unearned' : '✓ Mark as Earned'}
      </button>

      <div class="modal-nav-group">
        <button id="modal-prev-btn" class="modal-nav-btn" type="button" ${id <= 1 ? 'disabled' : ''}>&larr; Previous (#${id - 1})</button>
        <button id="modal-next-btn" class="modal-nav-btn" type="button" ${id >= trophiesData.length ? 'disabled' : ''}>Next (#${id + 1}) &rarr;</button>
      </div>
    </div>
  `;

  // Modal button events
  const modalToggleBtn = document.getElementById('modal-toggle-btn');
  modalToggleBtn.addEventListener('click', () => {
    const currentlyEarned = earnedSet.has(trophy.id);
    toggleTrophyEarned(trophy.id, !currentlyEarned);
  });

  const modalPrevBtn = document.getElementById('modal-prev-btn');
  if (id > 1) {
    modalPrevBtn.addEventListener('click', () => openTrophyModal(id - 1));
  }

  const modalNextBtn = document.getElementById('modal-next-btn');
  if (id < trophiesData.length) {
    modalNextBtn.addEventListener('click', () => openTrophyModal(id + 1));
  }

  trophyModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateModalEarnedButton(id) {
  const modalToggleBtn = document.getElementById('modal-toggle-btn');
  if (!modalToggleBtn) return;
  const isEarned = earnedSet.has(id);
  modalToggleBtn.className = `modal-toggle-earned-btn ${isEarned ? 'mark-unearned' : 'mark-earned'}`;
  modalToggleBtn.textContent = isEarned ? '✕ Mark as Unearned' : '✓ Mark as Earned';
}

function closeModal() {
  trophyModal.classList.add('hidden');
  document.body.style.overflow = '';
  currentModalTrophyId = null;
}

// Reset filters to default
function resetFilters() {
  searchInput.value = '';
  filterGrade.value = 'all';
  filterKind.value = 'all';
  filterStatus.value = 'all';
  sortBy.value = 'id-asc';
  renderTrophiesList();
}

// Render Activities Counters in Tab 4
function renderActivitiesCounters() {
  countersGrid.replaceChildren();

  for (const act of ACTIVITY_COUNTERS) {
    const currentVal = countersState[act.key] ?? 0;
    const step = act.step ?? 1;
    const percent = Math.min(100, Math.round((currentVal / act.target) * 100));
    const isCompleted = currentVal >= act.target;

    const card = document.createElement('div');
    card.className = 'counter-card';
    card.innerHTML = `
      <div class="counter-header">
        <span class="counter-title">${act.name}</span>
        <span class="counter-trophy-tag">Trophy #${act.trophyId}</span>
      </div>
      <div class="counter-controls">
        <button class="counter-btn" data-action="dec" type="button">-</button>
        <input type="number" class="counter-input" value="${currentVal}" min="0" max="${act.target * 2}">
        <button class="counter-btn" data-action="inc" type="button">+</button>
        <span class="counter-target">/ ${act.target.toLocaleString()} ${act.unit}</span>
      </div>
      <div class="counter-progress-bar">
        <div class="counter-progress-fill" style="width: ${percent}%; background-color: ${isCompleted ? 'var(--success-green)' : 'var(--neon-cyan)'}"></div>
      </div>
    `;

    const input = card.querySelector('.counter-input');
    const decBtn = card.querySelector('[data-action="dec"]');
    const incBtn = card.querySelector('[data-action="inc"]');

    const updateCounterVal = (val) => {
      const clamped = Math.max(0, val);
      countersState[act.key] = clamped;
      saveState();
      renderActivitiesCounters();
      // If reached target, automatically suggest or mark the trophy
      if (clamped >= act.target && !earnedSet.has(act.trophyId)) {
        toggleTrophyEarned(act.trophyId, true);
      }
    };

    decBtn.addEventListener('click', () => updateCounterVal(currentVal - step));
    incBtn.addEventListener('click', () => updateCounterVal(currentVal + step));
    input.addEventListener('change', () => updateCounterVal(parseInt(input.value, 10) || 0));

    countersGrid.append(card);
  }
}

// Tab Switching Logic
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (tab.dataset.tab === 'activities') {
        renderActivitiesCounters();
      }
    });
  });
}

// Grade Pills Click Quick Filter
function initGradePills() {
  document.querySelectorAll('.grade-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const grade = pill.dataset.filterGrade;
      filterGrade.value = grade;
      // Switch to tracker tab
      document.querySelector('.nav-tab[data-tab="tracker"]').click();
      renderTrophiesList();
    });
  });
}

// Event Listeners for Filters & Actions
function initEventListeners() {
  searchInput.addEventListener('input', renderTrophiesList);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderTrophiesList();
  });

  filterGrade.addEventListener('change', renderTrophiesList);
  filterKind.addEventListener('change', renderTrophiesList);
  filterStatus.addEventListener('change', renderTrophiesList);
  sortBy.addEventListener('change', renderTrophiesList);
  showAllBtn.addEventListener('click', resetFilters);

  // Spoiler shield toggle
  spoilerToggleBtn.addEventListener('click', () => {
    spoilerShieldActive = !spoilerShieldActive;
    updateSpoilerBtn();
    saveState();
    renderTrophiesList();
    showToast(spoilerShieldActive ? 'Spoiler Shield Activated' : 'Spoiler Shield Deactivated');
  });

  // Modal close handlers and keyboard shortcuts
  modalCloseBtn.addEventListener('click', closeModal);
  trophyModal.addEventListener('click', (e) => {
    if (e.target === trophyModal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    // If modal is open, handle Esc, ArrowLeft, ArrowRight
    if (!trophyModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft' && currentModalTrophyId && currentModalTrophyId > 1) {
        openTrophyModal(currentModalTrophyId - 1);
      } else if (e.key === 'ArrowRight' && currentModalTrophyId && currentModalTrophyId < trophiesData.length) {
        openTrophyModal(currentModalTrophyId + 1);
      }
      return;
    }

    // Hotkey: press '/' to quickly focus search bar when not typing in an input
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Export JSON
  exportBtn.addEventListener('click', () => {
    const backup = {
      app: 'GTA VI Trophy Atlas',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      earned_trophy_ids: [...earnedSet],
      activity_counters: countersState,
      total_earned: earnedSet.size,
      total_trophies: trophiesData.length
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gta6-trophy-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Progress exported as JSON');
  });

  // Import JSON
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        // Simple array of IDs or names
        earnedSet = new Set(imported);
      } else if (imported.earned_trophy_ids && Array.isArray(imported.earned_trophy_ids)) {
        earnedSet = new Set(imported.earned_trophy_ids);
        if (imported.activity_counters) {
          countersState = imported.activity_counters;
        }
      } else {
        alert('Invalid trophy progress file format.');
        return;
      }
      saveState();
      updateStats();
      renderTrophiesList();
      renderActivitiesCounters();
      showToast('Progress successfully imported!');
    } catch (err) {
      alert('Error parsing JSON progress file: ' + err.message);
    } finally {
      importInput.value = '';
    }
  });

  // Reset Progress
  resetBtn.addEventListener('click', () => {
    const confirmed = confirm('Are you sure you want to reset all earned trophies and activity counters?');
    if (!confirmed) return;
    earnedSet.clear();
    countersState = {};
    saveState();
    updateStats();
    renderTrophiesList();
    renderActivitiesCounters();
    showToast('All progress has been reset.');
  });
}

// Main initialization
async function initApp() {
  try {
    loadState();
    const res = await fetch('data/trophies.json');
    const data = await res.json();
    trophiesData = data.trophies || [];

    initTabs();
    initGradePills();
    initEventListeners();

    updateStats();
    renderTrophiesList();
    renderActivitiesCounters();
  } catch (err) {
    console.error('Failed to initialize Trophy Atlas:', err);
  }
}

initApp();
