// GTA VI Trophy Atlas - Main Application Logic
const STORAGE_KEY = 'gta6-trophy-checklist';
const ACTIVITIES_KEY = 'gta6-activity-counts';
const SPOILER_KEY = 'gta6-spoiler-mode';

// Initial default activities data
const DEFAULT_ACTIVITIES = [
  { id: 'stunts', name: 'Cunning Stunts', trophy: 'Cunning Stunts', target: 250, unit: 'Stunts', count: 0 },
  { id: 'shooting', name: 'Shooting Range Gold Medals', trophy: 'The Shootist', target: 42, unit: 'Medals', count: 0 },
  { id: 'drones', name: 'Top Fun Drone Races', trophy: 'Top Fun', target: 14, unit: 'Races', count: 0 },
  { id: 'street_races', name: 'Street & Offshore Races', trophy: 'Earn Cash, Not Kudos', target: 20, unit: 'Wins', count: 0 },
  { id: 'strangers', name: 'Strangers & Freaks Strands', trophy: 'Strangers & Freaks', target: 8, unit: 'Strands', count: 0 },
  { id: 'meditation', name: 'Scenic Meditation Spots', trophy: 'Positive Mental Attitude', target: 18, unit: 'Spots', count: 0 },
  { id: 'waink', name: 'WAiNK It Graffiti Locations', trophy: 'You WAiNKer!', target: 100, unit: 'Tags', count: 0 },
  { id: 'card_decks', name: 'Collectible Card Sets', trophy: 'Don’t Touch My Deck', target: 3, unit: 'Decks', count: 0 },
  { id: 'challenges', name: 'Career Challenges', trophy: 'One Last Thing', target: 50, unit: 'Challenges', count: 0 },
  { id: 'vehicles', name: 'Discovered Vehicle Models', trophy: 'Whip It Good', target: 100, unit: 'Vehicles', count: 0 },
  { id: 'bank_vaults', name: 'Commercial Bank Vaults', trophy: 'Maximum Withdrawal', target: 5, unit: 'Vaults', count: 0 },
  { id: 'gang_ops', name: 'Illegal Gang Operations', trophy: 'Pest Control', target: 9, unit: 'Operations', count: 0 },
  { id: 'scooter_bros', name: 'Scooter Bros Registrations', trophy: 'On the Spot', target: 10, unit: 'Bikes', count: 0 },
  { id: 'garages', name: 'Purchased Garage Properties', trophy: 'Little Boxes', target: 8, unit: 'Garages', count: 0 },
  { id: 'choices', name: 'Narrative Decision Points', trophy: 'Actions Speak Louder', target: 500, unit: 'Choices', count: 0 }
];

// App State
let doc = null;
let earned = new Set();
let activityCounts = {};
let spoilerMode = true;
let revealedSpoilers = new Set();

let activeTab = 'checklist';
let activeGrade = 'all';
let activeKind = 'all';
let activeSort = 'id';
let activeStatus = 'all';
let searchQuery = '';
let activeModalTrophy = null;

// Load persisted state
function loadStorage() {
  try {
    const rawEarned = localStorage.getItem(STORAGE_KEY);
    if (rawEarned) earned = new Set(JSON.parse(rawEarned));
  } catch (err) {
    earned = new Set();
  }

  try {
    const rawActs = localStorage.getItem(ACTIVITIES_KEY);
    activityCounts = rawActs ? JSON.parse(rawActs) : {};
  } catch (err) {
    activityCounts = {};
  }

  try {
    const rawSpoiler = localStorage.getItem(SPOILER_KEY);
    spoilerMode = rawSpoiler !== null ? JSON.parse(rawSpoiler) : true;
  } catch (err) {
    spoilerMode = true;
  }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activityCounts));
  localStorage.setItem(SPOILER_KEY, JSON.stringify(spoilerMode));
}

// Grade letter mapping
function gradeLetter(grade) {
  switch (grade) {
    case 'platinum': return 'P';
    case 'gold': return 'G';
    case 'silver': return 'S';
    default: return 'B';
  }
}

// Update Header Summary Bar
function updateStats() {
  if (!doc) return;
  const total = doc.trophies.length;
  const count = earned.size;
  const pct = Math.round((count / total) * 100);

  document.getElementById('earned-count').textContent = count;
  document.getElementById('earned-pct').textContent = `${pct}%`;
  document.getElementById('progress-fill-bar').style.width = `${pct}%`;

  // Grade breakdowns
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };

  for (const t of doc.trophies) {
    if (earned.has(t.name) && counts[t.grade] !== undefined) {
      counts[t.grade]++;
    }
  }

  document.getElementById('plat-val').textContent = `${counts.platinum}/${totals.platinum}`;
  document.getElementById('gold-val').textContent = `${counts.gold}/${totals.gold}`;
  document.getElementById('silver-val').textContent = `${counts.silver}/${totals.silver}`;
  document.getElementById('bronze-val').textContent = `${counts.bronze}/${totals.bronze}`;

  // Update spoiler toggle status
  const spoilerStatus = document.getElementById('spoiler-status');
  const spoilerBtn = document.getElementById('toggle-spoiler');
  if (spoilerMode) {
    spoilerStatus.textContent = 'HIDDEN';
    spoilerStatus.className = 'status-on';
    spoilerBtn.setAttribute('aria-pressed', 'true');
  } else {
    spoilerStatus.textContent = 'SHOWN';
    spoilerStatus.className = 'status-off';
    spoilerBtn.setAttribute('aria-pressed', 'false');
  }
}

// Filter and Sort Trophies
function getFilteredTrophies() {
  if (!doc) return [];
  let list = [...doc.trophies];

  // Grade filter
  if (activeGrade !== 'all') {
    list = list.filter(t => t.grade === activeGrade);
  }

  // Kind filter
  if (activeKind !== 'all') {
    if (activeKind === 'missable') {
      list = list.filter(t => t.missable === true);
    } else {
      list = list.filter(t => t.kind === activeKind);
    }
  }

  // Status filter
  if (activeStatus === 'earned') {
    list = list.filter(t => earned.has(t.name));
  } else if (activeStatus === 'unearned') {
    list = list.filter(t => !earned.has(t.name));
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(t => {
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchGuide = t.guide.toLowerCase().includes(q);
      const matchKind = t.kind.toLowerCase().includes(q);
      return matchName || matchDesc || matchGuide || matchKind;
    });
  }

  // Sort
  list.sort((a, b) => {
    if (activeSort === 'id') {
      return a.id - b.id;
    }
    if (activeSort === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (activeSort === 'grade') {
      const weight = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
      return (weight[b.grade] || 0) - (weight[a.grade] || 0) || a.id - b.id;
    }
    if (activeSort === 'status') {
      const aEarned = earned.has(a.name) ? 1 : 0;
      const bEarned = earned.has(b.name) ? 1 : 0;
      return aEarned - bEarned || a.id - b.id;
    }
    return a.id - b.id;
  });

  return list;
}

// Render Trophy Cards in Checklist View
function renderChecklist() {
  const grid = document.getElementById('trophy-grid');
  const emptyState = document.getElementById('empty-results');
  grid.replaceChildren();

  const trophies = getFilteredTrophies();

  const matchCounter = document.getElementById('match-counter');
  if (matchCounter && doc) {
    matchCounter.textContent = `Showing ${trophies.length} of ${doc.trophies.length}`;
  }

  if (trophies.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const t of trophies) {
    const isEarned = earned.has(t.name);
    const card = document.createElement('div');
    card.className = `trophy-card ${isEarned ? 'earned' : ''}`;
    card.dataset.id = t.id;

    // Header row
    const header = document.createElement('div');
    header.className = 'trophy-card-header';

    // Checkbox
    const checkWrap = document.createElement('div');
    checkWrap.className = 'trophy-checkbox-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'trophy-checkbox';
    checkbox.checked = isEarned;
    checkbox.title = `Mark "${t.name}" as earned`;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        earned.add(t.name);
      } else {
        earned.delete(t.name);
      }
      saveStorage();
      updateStats();
      renderChecklist();
      renderActivities();
    });
    checkWrap.appendChild(checkbox);

    // Medal badge
    const medal = document.createElement('div');
    medal.className = `trophy-medal medal-${t.grade}`;
    medal.textContent = gradeLetter(t.grade);
    medal.title = `${t.grade.toUpperCase()} Trophy #${t.id}`;

    // Info container
    const info = document.createElement('div');
    info.className = 'trophy-header-info';

    // Meta pills
    const pills = document.createElement('div');
    pills.className = 'trophy-meta-pills';

    const gradePill = document.createElement('span');
    gradePill.className = `pill pill-${t.grade}`;
    gradePill.textContent = t.grade;
    pills.appendChild(gradePill);

    const kindPill = document.createElement('span');
    kindPill.className = `pill pill-cyan`;
    kindPill.textContent = t.kind;
    pills.appendChild(kindPill);

    if (t.missable) {
      const missPill = document.createElement('span');
      missPill.className = 'pill pill-red';
      missPill.textContent = 'MISSABLE';
      pills.appendChild(missPill);
    }

    if (t.roadmap_stage) {
      const stagePill = document.createElement('span');
      stagePill.className = 'pill pill-muted';
      stagePill.textContent = `STAGE ${t.roadmap_stage}`;
      pills.appendChild(stagePill);
    }

    info.appendChild(pills);

    // Check spoiler condition
    const isSpoilerMasked = spoilerMode && t.kind === 'story' && !isEarned && !revealedSpoilers.has(t.id);

    if (isSpoilerMasked) {
      const mask = document.createElement('div');
      mask.className = 'spoiler-mask';
      mask.innerHTML = `
        <span class="spoiler-mask-text">🛡️ Story Spoiler - Trophy #${t.id}</span>
        <button class="btn-reveal" type="button">Reveal</button>
      `;
      mask.querySelector('.btn-reveal').addEventListener('click', (e) => {
        e.stopPropagation();
        revealedSpoilers.add(t.id);
        renderChecklist();
      });
      info.appendChild(mask);
    } else {
      const title = document.createElement('h3');
      title.className = 'trophy-title';
      title.textContent = t.name;
      info.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'trophy-desc';
      desc.textContent = t.description;
      info.appendChild(desc);
    }

    header.appendChild(checkWrap);
    header.appendChild(medal);
    header.appendChild(info);
    card.appendChild(header);

    // Guide snippet
    if (!isSpoilerMasked) {
      const snippet = document.createElement('p');
      snippet.className = 'trophy-guide-snippet';
      snippet.textContent = t.guide;
      card.appendChild(snippet);
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'trophy-card-footer';

    const sourceCite = document.createElement('span');
    sourceCite.className = 'trophy-source-cite';
    sourceCite.textContent = `Sources: Exophase / PSNProfiles`;
    footer.appendChild(sourceCite);

    const btnView = document.createElement('button');
    btnView.className = 'btn-view-guide';
    btnView.type = 'button';
    btnView.innerHTML = `View Guide &amp; Steps &rarr;`;
    btnView.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(t);
    });
    footer.appendChild(btnView);

    card.appendChild(footer);

    // Clicking card opens modal
    card.addEventListener('click', () => {
      openDetailModal(t);
    });

    grid.appendChild(card);
  }
}

// Render Missables Watchlist
function renderMissables() {
  const container = document.getElementById('missables-list');
  container.replaceChildren();

  const missables = doc.trophies.filter(t => t.missable);

  for (const t of missables) {
    const isEarned = earned.has(t.name);
    const card = document.createElement('div');
    card.className = `missable-item-card ${isEarned ? 'earned' : ''}`;

    card.innerHTML = `
      <div class="missable-item-header">
        <div>
          <h3 class="missable-title">
            <span class="pill pill-${t.grade}">${t.grade}</span>
            ${t.name}
          </h3>
          <p class="trophy-desc">${t.description}</p>
        </div>
        <div>
          <button class="btn ${isEarned ? 'btn-primary' : 'btn-secondary'} btn-mark-missable" type="button">
            ${isEarned ? '✓ Earned' : 'Mark Earned'}
          </button>
        </div>
      </div>

      <div class="missable-box-warn">
        <strong>⚠️ Why It Is Missable:</strong>
        <p style="margin-top: 4px; font-size: 0.88rem; color: #ffd8df;">${t.missable_note || 'Requires careful timing before narrative branch points.'}</p>
      </div>

      <div class="missable-step-box">
        <h4>Comprehensive Guide &amp; Avoidance Protocol</h4>
        <p style="font-size: 0.88rem; color: #d0d9e8; line-height: 1.6;">${t.guide}</p>
      </div>

      <div class="modal-sources-box" style="margin-top: 10px;">
        <span class="sources-label">Sources &amp; Verification:</span>
        <p class="sources-text">${t.sources}</p>
      </div>
    `;

    card.querySelector('.btn-mark-missable').addEventListener('click', () => {
      if (earned.has(t.name)) {
        earned.delete(t.name);
      } else {
        earned.add(t.name);
      }
      saveStorage();
      updateStats();
      renderChecklist();
      renderMissables();
    });

    container.appendChild(card);
  }
}

// Render 100% Activities Tracker
function renderActivities() {
  const container = document.getElementById('activities-container');
  container.replaceChildren();

  for (const act of DEFAULT_ACTIVITIES) {
    const current = activityCounts[act.id] !== undefined ? activityCounts[act.id] : 0;
    const pct = Math.min(100, Math.round((current / act.target) * 100));

    const card = document.createElement('div');
    card.className = 'activity-card';

    card.innerHTML = `
      <div>
        <div class="activity-header">
          <div>
            <h3 class="activity-name">${act.name}</h3>
            <span class="activity-trophy-tag">Linked: ${act.trophy}</span>
          </div>
          <span class="activity-target-badge">Goal: ${act.target} ${act.unit}</span>
        </div>
      </div>

      <div class="activity-counter-row">
        <div class="activity-val-display">
          <span class="act-current" id="act-val-${act.id}">${current}</span>
          <span class="act-target">/ ${act.target} (${pct}%)</span>
        </div>
        <div class="stepper-btns">
          <button class="btn-stepper btn-minus" type="button" title="Decrement">-</button>
          <button class="btn-stepper btn-plus" type="button" title="Increment">+</button>
        </div>
      </div>

      <div class="activity-progress-bar">
        <div class="activity-progress-fill" style="width: ${pct}%;"></div>
      </div>
    `;

    // Minus button
    card.querySelector('.btn-minus').addEventListener('click', () => {
      const cur = activityCounts[act.id] !== undefined ? activityCounts[act.id] : 0;
      const step = act.target > 1000 ? 5000 : 1;
      activityCounts[act.id] = Math.max(0, cur - step);
      saveStorage();
      renderActivities();
    });

    // Plus button
    card.querySelector('.btn-plus').addEventListener('click', () => {
      const cur = activityCounts[act.id] !== undefined ? activityCounts[act.id] : 0;
      const step = act.target > 1000 ? 5000 : 1;
      activityCounts[act.id] = cur + step;
      // Auto mark linked trophy as earned if target met
      if (activityCounts[act.id] >= act.target) {
        earned.add(act.trophy);
        updateStats();
      }
      saveStorage();
      renderActivities();
    });

    container.appendChild(card);
  }
}

// Detail Modal
function openDetailModal(trophy) {
  activeModalTrophy = trophy;
  const isEarned = earned.has(trophy.name);

  const modal = document.getElementById('detail-modal');
  const gradeIcon = document.getElementById('modal-grade-icon');
  gradeIcon.textContent = gradeLetter(trophy.grade);
  gradeIcon.className = `modal-grade-icon medal-${trophy.grade}`;

  const gradePill = document.getElementById('modal-grade-pill');
  gradePill.textContent = trophy.grade.toUpperCase();
  gradePill.className = `pill pill-${trophy.grade}`;

  const kindPill = document.getElementById('modal-kind-pill');
  kindPill.textContent = trophy.kind.toUpperCase();

  const missablePill = document.getElementById('modal-missable-pill');
  if (trophy.missable) {
    missablePill.classList.remove('hidden');
  } else {
    missablePill.classList.add('hidden');
  }

  const stagePill = document.getElementById('modal-stage-pill');
  stagePill.textContent = `STAGE ${trophy.roadmap_stage || 1}`;

  document.getElementById('modal-trophy-name').textContent = trophy.name;
  document.getElementById('modal-trophy-desc').textContent = trophy.description;

  // Missable box
  const missableBox = document.getElementById('modal-missable-box');
  const missableNote = document.getElementById('modal-missable-note');
  if (trophy.missable && trophy.missable_note) {
    missableBox.classList.remove('hidden');
    missableNote.textContent = trophy.missable_note;
  } else {
    missableBox.classList.add('hidden');
  }

  // Guide
  document.getElementById('modal-trophy-guide').textContent = trophy.guide;

  // Steps
  const stepsContainer = document.getElementById('modal-steps-container');
  const stepsList = document.getElementById('modal-steps-list');
  stepsList.replaceChildren();
  if (trophy.steps && trophy.steps.length > 0) {
    stepsContainer.classList.remove('hidden');
    for (const s of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = s;
      stepsList.appendChild(li);
    }
  } else {
    stepsContainer.classList.add('hidden');
  }

  // Target Counter
  const counterContainer = document.getElementById('modal-counter-container');
  if (trophy.target_count) {
    counterContainer.classList.remove('hidden');
    document.getElementById('modal-counter-label').textContent = `Target Requirement:`;
    document.getElementById('modal-counter-val').textContent = `${trophy.target_count}`;
  } else {
    counterContainer.classList.add('hidden');
  }

  // Sources
  document.getElementById('modal-trophy-sources').textContent = trophy.sources || 'Official PlayStation 5 Trophy list & Exophase.';

  // Earned Toggle Button
  const toggleBtn = document.getElementById('modal-toggle-earned');
  updateModalEarnedButton(isEarned);

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateModalEarnedButton(isEarned) {
  const toggleBtn = document.getElementById('modal-toggle-earned');
  if (isEarned) {
    toggleBtn.className = 'btn btn-primary';
    toggleBtn.innerHTML = `<span class="icon">✓</span> Earned`;
  } else {
    toggleBtn.className = 'btn btn-secondary';
    toggleBtn.innerHTML = `<span class="icon">○</span> Mark as Earned`;
  }
}

function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  activeModalTrophy = null;
}

// Setup Event Listeners
function setupEvents() {
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.dataset.tab;
      activeTab = target;
      const viewEl = document.getElementById(`view-${target}`);
      if (viewEl) viewEl.classList.add('active');

      if (target === 'missables') renderMissables();
      if (target === 'activities') renderActivities();
      if (target === 'checklist') renderChecklist();
    });
  });

  // Grade filters
  document.querySelectorAll('#grade-filters .btn-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grade-filters .btn-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGrade = btn.dataset.grade;
      renderChecklist();
    });
  });

  // Kind filters
  document.querySelectorAll('#kind-filters .btn-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#kind-filters .btn-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeKind = btn.dataset.kind;
      renderChecklist();
    });
  });

  // Sort & Status selects
  document.getElementById('sort-select').addEventListener('change', (e) => {
    activeSort = e.target.value;
    renderChecklist();
  });
  document.getElementById('status-select').addEventListener('change', (e) => {
    activeStatus = e.target.value;
    renderChecklist();
  });

  // Live search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery) {
      searchClear.classList.remove('hidden');
    } else {
      searchClear.classList.add('hidden');
    }
    renderChecklist();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.add('hidden');
    renderChecklist();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    activeGrade = 'all';
    activeKind = 'all';
    activeSort = 'id';
    activeStatus = 'all';
    searchQuery = '';
    searchInput.value = '';
    searchClear.classList.add('hidden');
    document.querySelectorAll('#grade-filters .btn-chip').forEach(b => b.classList.toggle('active', b.dataset.grade === 'all'));
    document.querySelectorAll('#kind-filters .btn-chip').forEach(b => b.classList.toggle('active', b.dataset.kind === 'all'));
    document.getElementById('sort-select').value = 'id';
    document.getElementById('status-select').value = 'all';
    renderChecklist();
  });

  // Spoiler toggle button
  document.getElementById('toggle-spoiler').addEventListener('click', () => {
    spoilerMode = !spoilerMode;
    saveStorage();
    updateStats();
    renderChecklist();
  });

  // Export JSON
  document.getElementById('btn-export').addEventListener('click', () => {
    const payload = {
      app: 'gta6-trophy-atlas',
      exportedAt: new Date().toISOString(),
      earned: [...earned],
      activities: activityCounts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Import JSON
  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        earned = new Set(data);
      } else if (data && Array.isArray(data.earned)) {
        earned = new Set(data.earned);
        if (data.activities && typeof data.activities === 'object') {
          activityCounts = data.activities;
        }
      }
      saveStorage();
      updateStats();
      renderChecklist();
      renderActivities();
      renderMissables();
      alert('Trophy and activity progress successfully imported!');
    } catch (err) {
      alert('Error parsing progress JSON file.');
    }
    e.target.value = '';
  });

  // Reset Progress
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all earned trophies and activity counts?')) {
      earned.clear();
      activityCounts = {};
      saveStorage();
      updateStats();
      renderChecklist();
      renderActivities();
      renderMissables();
    }
  });

  // Modal events
  document.getElementById('modal-close').addEventListener('click', closeDetailModal);
  document.getElementById('modal-btn-dismiss').addEventListener('click', closeDetailModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeDetailModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModalTrophy) closeDetailModal();
  });

  document.getElementById('modal-toggle-earned').addEventListener('click', () => {
    if (!activeModalTrophy) return;
    if (earned.has(activeModalTrophy.name)) {
      earned.delete(activeModalTrophy.name);
      updateModalEarnedButton(false);
    } else {
      earned.add(activeModalTrophy.name);
      updateModalEarnedButton(true);
    }
    saveStorage();
    updateStats();
    renderChecklist();
    renderActivities();
    renderMissables();
  });
}

// Bootstrap
async function init() {
  loadStorage();
  try {
    const res = await fetch('data/trophies.json');
    doc = await res.json();
    setupEvents();
    updateStats();
    renderChecklist();
    renderActivities();
    renderMissables();
  } catch (err) {
    console.error('Failed to load trophies.json', err);
  }
}

init();
