// ==========================================================================
// GTA VI TROPHY ATLAS - Leonida Platinum Companion
// Fully Offline Interactive Application Logic (ES Module)
// ==========================================================================

const KEY_CHECKLIST = 'gta6-trophy-checklist';
const KEY_ACTIVITIES = 'gta6-activity-progress';
const KEY_SPOILER = 'gta6-spoiler-mode';

// Default state initialization
let earned = new Set(JSON.parse(localStorage.getItem(KEY_CHECKLIST) ?? '[]'));
let activities = JSON.parse(localStorage.getItem(KEY_ACTIVITIES) ?? '{}');
let spoilerMode = localStorage.getItem(KEY_SPOILER) !== 'false'; // default true (shielded)
let revealedSpoilers = new Set();
let doc = { trophies: [] };

// DOM Elements
const overallProgressBar = document.getElementById('overall-progress-bar');
const overallPercentage = document.getElementById('overall-percentage');
const overallCount = document.getElementById('overall-count');

const countPlatinum = document.getElementById('count-platinum');
const countGold = document.getElementById('count-gold');
const countSilver = document.getElementById('count-silver');
const countBronze = document.getElementById('count-bronze');

const trophyListContainer = document.getElementById('trophy-list-container');
const missablesListContainer = document.getElementById('missables-cards-list');
const activitiesTrackerContainer = document.getElementById('activities-tracker-container');
const resultsCount = document.getElementById('results-count');

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const filterGrade = document.getElementById('filter-grade');
const filterKind = document.getElementById('filter-kind');
const filterStatus = document.getElementById('filter-status');
const sortOrder = document.getElementById('sort-order');

const toggleSpoilerBtn = document.getElementById('toggle-spoiler-btn');
const spoilerStatusText = document.getElementById('spoiler-status-text');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');
const resetBtn = document.getElementById('reset-btn');

const modalBackdrop = document.getElementById('trophy-modal-backdrop');
const modalContentBody = document.getElementById('modal-content-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

const expandAllBtn = document.getElementById('expand-all-btn');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const navMissablesBadge = document.getElementById('nav-missables-badge');

// Save helpers
function saveChecklist() {
  localStorage.setItem(KEY_CHECKLIST, JSON.stringify([...earned]));
}

function saveActivities() {
  localStorage.setItem(KEY_ACTIVITIES, JSON.stringify(activities));
}

function saveSpoilerSetting() {
  localStorage.setItem(KEY_SPOILER, spoilerMode ? 'true' : 'false');
}

// Toast notification helper
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

// Grade rank order for sorting
const GRADE_RANK = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1
};

// Activity definitions with target caps
const ACTIVITY_DEFINITIONS = [
  { id: 15, name: "Cunning Stunts", category: "Stunt Jumps & Chains", target: 250, unit: "stunts" },
  { id: 17, name: "The Shootist", category: "Shooting Range Gold Medals", target: 42, unit: "medals" },
  { id: 18, name: "Top Fun", category: "Drone Race Victories", target: 14, unit: "races" },
  { id: 19, name: "Earn Cash, Not Kudos", category: "Distinct Race Wins", target: 20, unit: "wins" },
  { id: 28, name: "Positive Mental Attitude", category: "Zen Meditation Spots", target: 18, unit: "spots" },
  { id: 30, name: "Don't Touch My Deck", category: "Completed Card Decks", target: 3, unit: "decks" },
  { id: 31, name: "You WAiNKer!", category: "WAiNK Social Check-ins", target: 100, unit: "spots" },
  { id: 32, name: "One Last Thing", category: "Gameplay Challenges", target: 50, unit: "challenges" },
  { id: 35, name: "Whip It Good", category: "Discovered Vehicles", target: 100, unit: "vehicles" },
  { id: 40, name: "Maximum Withdrawal", category: "Bank Vaults Robbed", target: 5, unit: "vaults" },
  { id: 42, name: "The Goodtime State", category: "Leonida Areas Explored", target: 52, unit: "areas" },
  { id: 43, name: "Pest Control", category: "Gang Operations Raided", target: 9, unit: "gangs" },
  { id: 48, name: "Actions Speak Louder", category: "Dialogue Choices Made", target: 500, unit: "choices" },
  { id: 52, name: "Dime on the Dollar", category: "Marked Bills Laundered ($)", target: 250000, unit: "$" },
  { id: 53, name: "Treat Yo Self", category: "Retail Store Spending ($)", target: 100000, unit: "$" },
  { id: 54, name: "Little Boxes", category: "Garage Properties Bought", target: 8, unit: "garages" },
  { id: 55, name: "On the Spot", category: "Scooter Bros Registered", target: 10, unit: "scooters" }
];

// Initialize application
async function initApp() {
  try {
    const res = await fetch('data/trophies.json');
    doc = await res.json();
  } catch (err) {
    console.error('Failed to load trophies.json', err);
    return;
  }

  setupEventListeners();
  updateSpoilerButtonUI();
  renderAllViews();
}

// Update Dashboard Counters
function updateDashboard() {
  const total = doc.trophies.length;
  const earnedCount = earned.size;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  overallProgressBar.style.width = `${pct}%`;
  overallPercentage.textContent = `${pct}%`;
  overallCount.textContent = `${earnedCount} of ${total} Trophies Earned`;

  // Grade breakdowns
  const grades = { platinum: { earned: 0, total: 0 }, gold: { earned: 0, total: 0 }, silver: { earned: 0, total: 0 }, bronze: { earned: 0, total: 0 } };

  let unearnedMissables = 0;
  for (const t of doc.trophies) {
    const g = t.grade;
    if (grades[g]) {
      grades[g].total++;
      if (earned.has(t.name)) {
        grades[g].earned++;
      }
    }
    if (t.missable && !earned.has(t.name)) {
      unearnedMissables++;
    }
  }

  countPlatinum.textContent = `${grades.platinum.earned} / ${grades.platinum.total}`;
  countGold.textContent = `${grades.gold.earned} / ${grades.gold.total}`;
  countSilver.textContent = `${grades.silver.earned} / ${grades.silver.total}`;
  countBronze.textContent = `${grades.bronze.earned} / ${grades.bronze.total}`;

  if (navMissablesBadge) {
    navMissablesBadge.textContent = unearnedMissables;
  }
}

// Render Checklist View
function renderChecklist() {
  trophyListContainer.replaceChildren();

  const query = searchInput.value.trim().toLowerCase();
  const selectedGrade = filterGrade.value;
  const selectedKind = filterKind.value;
  const selectedStatus = filterStatus.value;
  const selectedSort = sortOrder.value;

  // Filter
  const filtered = doc.trophies.filter(t => {
    // Grade filter
    if (selectedGrade !== 'all' && t.grade !== selectedGrade) return false;

    // Kind filter
    if (selectedKind !== 'all') {
      if (selectedKind === 'missable') {
        if (!t.missable) return false;
      } else if (t.kind !== selectedKind) {
        return false;
      }
    }

    // Status filter
    const isEarned = earned.has(t.name);
    if (selectedStatus === 'earned' && !isEarned) return false;
    if (selectedStatus === 'unearned' && isEarned) return false;

    // Search query
    if (query) {
      const matchName = t.name.toLowerCase().includes(query);
      const matchDesc = t.description.toLowerCase().includes(query);
      const matchGuide = t.guide.toLowerCase().includes(query);
      const matchSources = (t.sources || '').toLowerCase().includes(query);
      const matchKind = (t.kind || '').toLowerCase().includes(query);
      if (!matchName && !matchDesc && !matchGuide && !matchSources && !matchKind) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (selectedSort) {
      case 'id-desc':
        return b.id - a.id;
      case 'grade-desc': {
        const diff = GRADE_RANK[b.grade] - GRADE_RANK[a.grade];
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'roadmap-asc': {
        const diff = (a.roadmap_stage || 1) - (b.roadmap_stage || 1);
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'id-asc':
      default:
        return a.id - b.id;
    }
  });

  resultsCount.textContent = `Showing ${filtered.length} of ${doc.trophies.length} trophies`;

  // Render cards
  for (const t of filtered) {
    const isEarned = earned.has(t.name);
    const isStory = t.kind === 'story';
    const isShielded = spoilerMode && isStory && !isEarned && !revealedSpoilers.has(t.id);

    const card = document.createElement('div');
    card.className = `trophy-card ${isEarned ? 'is-earned' : ''}`;
    card.dataset.id = t.id;

    // Checkbox column
    const checkWrap = document.createElement('div');
    checkWrap.className = 'trophy-check-wrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'custom-checkbox';
    checkbox.checked = isEarned;
    checkbox.title = `Toggle status for: ${t.name}`;
    checkbox.setAttribute('aria-label', `Mark ${t.name} as earned`);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        earned.add(t.name);
        showToast(`Earned: ${t.name}!`);
      } else {
        earned.delete(t.name);
      }
      saveChecklist();
      updateDashboard();
      renderChecklist();
      renderMissablesView();
    });
    checkWrap.appendChild(checkbox);

    // Main content column
    const content = document.createElement('div');
    content.className = 'trophy-content';

    if (isShielded) {
      // Shielded story spoiler card
      const shield = document.createElement('div');
      shield.className = 'spoiler-shield';

      const shieldInfo = document.createElement('div');
      shieldInfo.innerHTML = `
        <div class="shield-text">
          <span>🛡️</span> <strong>Story Mission Spoiler</strong> (Trophy #${t.id} • ${t.grade.toUpperCase()})
        </div>
        <div class="shield-hint">Protected to avoid narrative spoilers. Click 'Reveal' or mark earned to view details.</div>
      `;

      const revealBtn = document.createElement('button');
      revealBtn.type = 'button';
      revealBtn.className = 'btn-reveal-spoiler';
      revealBtn.textContent = 'Reveal Spoiler';
      revealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revealedSpoilers.add(t.id);
        renderChecklist();
      });

      shield.appendChild(shieldInfo);
      shield.appendChild(revealBtn);
      content.appendChild(shield);
    } else {
      // Regular / revealed card content
      const headerLine = document.createElement('div');
      headerLine.className = 'trophy-header-line';

      const idNum = document.createElement('span');
      idNum.className = 'trophy-id-num';
      idNum.textContent = `#${t.id}`;

      const title = document.createElement('h3');
      title.className = 'trophy-title';
      title.textContent = t.name;

      const gradeBadge = document.createElement('span');
      gradeBadge.className = `badge badge-${t.grade}`;
      gradeBadge.textContent = t.grade;

      const kindBadge = document.createElement('span');
      kindBadge.className = 'badge badge-kind';
      kindBadge.textContent = t.kind;

      headerLine.append(idNum, title, gradeBadge, kindBadge);

      if (t.missable) {
        const missableBadge = document.createElement('span');
        missableBadge.className = 'badge badge-missable';
        missableBadge.textContent = '⚠️ MISSABLE';
        headerLine.appendChild(missableBadge);
      }

      if (t.roadmap_stage) {
        const stageBadge = document.createElement('span');
        stageBadge.className = 'badge badge-stage';
        stageBadge.textContent = `Stage ${t.roadmap_stage}`;
        headerLine.appendChild(stageBadge);
      }

      const desc = document.createElement('p');
      desc.className = 'trophy-desc';
      desc.textContent = t.description;

      const guideExcerpt = document.createElement('div');
      guideExcerpt.className = 'trophy-guide-excerpt';
      guideExcerpt.textContent = t.guide;

      const metaFooter = document.createElement('div');
      metaFooter.className = 'trophy-meta-footer';

      const sourcesLine = document.createElement('span');
      sourcesLine.className = 'trophy-sources-line';
      sourcesLine.textContent = `Sources: ${t.sources}`;
      sourcesLine.title = t.sources;

      metaFooter.appendChild(sourcesLine);

      content.append(headerLine, desc, guideExcerpt, metaFooter);
    }

    // Clicking content opens detail modal
    content.addEventListener('click', () => {
      openTrophyModal(t);
    });

    // Side action button
    const sideAction = document.createElement('div');
    sideAction.className = 'trophy-side-action';

    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'btn-open-detail';
    detailBtn.textContent = 'Full Guide ➔';
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTrophyModal(t);
    });

    sideAction.appendChild(detailBtn);

    card.append(checkWrap, content, sideAction);
    trophyListContainer.appendChild(card);
  }
}

// Render Missables Watchlist
function renderMissablesView() {
  missablesListContainer.replaceChildren();

  const missables = doc.trophies.filter(t => t.missable);

  for (const t of missables) {
    const isEarned = earned.has(t.name);
    const card = document.createElement('div');
    card.className = `missable-card ${isEarned ? 'is-earned' : ''}`;

    const header = document.createElement('div');
    header.className = 'missable-card-header';

    const titleWrap = document.createElement('div');
    titleWrap.innerHTML = `
      <span class="trophy-id-num">#${t.id}</span>
      <span class="missable-card-title">${t.name}</span>
      <span class="badge badge-${t.grade}">${t.grade}</span>
      ${isEarned ? '<span class="badge" style="background:#064e3b;color:#34d399;border:1px solid #10b981;">✓ EARNED</span>' : '<span class="badge badge-missable">CRITICAL</span>'}
    `;

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-open-detail';
    viewBtn.textContent = 'View Strategy ➔';
    viewBtn.addEventListener('click', () => openTrophyModal(t));

    header.append(titleWrap, viewBtn);

    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = t.description;

    const warnBox = document.createElement('div');
    warnBox.className = 'missable-warning-box';
    warnBox.innerHTML = `<strong>⚠️ Prevention Protocol:</strong> ${t.missable_note || t.guide}`;

    const stepsList = document.createElement('ul');
    stepsList.className = 'roadmap-checklist';
    if (t.steps) {
      for (const step of t.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        stepsList.appendChild(li);
      }
    }

    card.append(header, desc, warnBox, stepsList);
    missablesListContainer.appendChild(card);
  }
}

// Render 100% Activities Tracker
function renderActivitiesView() {
  activitiesTrackerContainer.replaceChildren();

  for (const act of ACTIVITY_DEFINITIONS) {
    const currentVal = activities[act.id] !== undefined ? activities[act.id] : 0;
    const pct = Math.min(100, Math.round((currentVal / act.target) * 100));

    const card = document.createElement('div');
    card.className = 'activity-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'activity-card-title';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = act.name;

    const targetBadge = document.createElement('span');
    targetBadge.className = 'activity-target-badge';
    targetBadge.textContent = `${currentVal} / ${act.target.toLocaleString()} ${act.unit} (${pct}%)`;

    titleRow.append(nameSpan, targetBadge);

    const categorySub = document.createElement('div');
    categorySub.style.fontSize = '0.78rem';
    categorySub.style.color = 'var(--text-muted)';
    categorySub.textContent = act.category;

    const progressBar = document.createElement('div');
    progressBar.className = 'activity-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'activity-progress-fill';
    progressFill.style.width = `${pct}%`;
    progressBar.appendChild(progressFill);

    // Controls: Minus, Input, Plus, Max
    const controls = document.createElement('div');
    controls.className = 'activity-counter-ctrl';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'btn-counter';
    minusBtn.textContent = '−';
    minusBtn.type = 'button';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'counter-input';
    input.value = currentVal;
    input.min = 0;
    input.max = act.target;

    const plusBtn = document.createElement('button');
    plusBtn.className = 'btn-counter';
    plusBtn.textContent = '+';
    plusBtn.type = 'button';

    const maxBtn = document.createElement('button');
    maxBtn.className = 'btn-open-detail';
    maxBtn.textContent = 'Max';
    maxBtn.type = 'button';

    minusBtn.addEventListener('click', () => {
      const step = act.target > 1000 ? 5000 : 1;
      const next = Math.max(0, currentVal - step);
      activities[act.id] = next;
      saveActivities();
      renderActivitiesView();
    });

    plusBtn.addEventListener('click', () => {
      const step = act.target > 1000 ? 5000 : 1;
      const next = Math.min(act.target, currentVal + step);
      activities[act.id] = next;
      saveActivities();
      renderActivitiesView();
    });

    maxBtn.addEventListener('click', () => {
      activities[act.id] = act.target;
      saveActivities();
      renderActivitiesView();
      showToast(`Completed: ${act.name} (${act.target} ${act.unit})!`);
    });

    input.addEventListener('change', () => {
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (val > act.target) val = act.target;
      activities[act.id] = val;
      saveActivities();
      renderActivitiesView();
    });

    controls.append(minusBtn, input, plusBtn, maxBtn);
    card.append(titleRow, categorySub, progressBar, controls);
    activitiesTrackerContainer.appendChild(card);
  }
}

// Open Trophy Walkthrough Modal
function openTrophyModal(t) {
  modalContentBody.replaceChildren();

  const isEarned = earned.has(t.name);

  const top = document.createElement('div');
  top.className = 'modal-trophy-top';

  const badges = document.createElement('div');
  badges.className = 'modal-badges-row';

  const idBadge = document.createElement('span');
  idBadge.className = 'badge badge-kind';
  idBadge.textContent = `Trophy #${t.id}`;

  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge badge-${t.grade}`;
  gradeBadge.textContent = t.grade;

  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge badge-kind';
  kindBadge.textContent = t.kind;

  badges.append(idBadge, gradeBadge, kindBadge);

  if (t.missable) {
    const missBadge = document.createElement('span');
    missBadge.className = 'badge badge-missable';
    missBadge.textContent = '⚠️ MISSABLE';
    badges.appendChild(missBadge);
  }

  if (t.roadmap_stage) {
    const stageBadge = document.createElement('span');
    stageBadge.className = 'badge badge-stage';
    stageBadge.textContent = `Roadmap Stage ${t.roadmap_stage}`;
    badges.appendChild(stageBadge);
  }

  const title = document.createElement('h2');
  title.id = 'modal-trophy-name';
  title.className = 'modal-title';
  title.textContent = t.name;

  const desc = document.createElement('p');
  desc.className = 'modal-desc';
  desc.textContent = `"${t.description}"`;

  top.append(badges, title, desc);

  // Status toggle in modal
  const toggleRow = document.createElement('div');
  toggleRow.style.margin = '1rem 0';
  toggleRow.style.display = 'flex';
  toggleRow.style.alignItems = 'center';
  toggleRow.style.gap = '0.75rem';

  const modalCheckbox = document.createElement('input');
  modalCheckbox.type = 'checkbox';
  modalCheckbox.className = 'custom-checkbox';
  modalCheckbox.checked = isEarned;
  modalCheckbox.id = 'modal-check-toggle';

  const modalCheckLabel = document.createElement('label');
  modalCheckLabel.htmlFor = 'modal-check-toggle';
  modalCheckLabel.style.cursor = 'pointer';
  modalCheckLabel.style.fontWeight = '700';
  modalCheckLabel.style.fontSize = '0.9rem';
  modalCheckLabel.textContent = isEarned ? 'Earned on PlayStation 5 (Click to unmark)' : 'Mark as Earned on PlayStation 5';

  modalCheckbox.addEventListener('change', () => {
    if (modalCheckbox.checked) {
      earned.add(t.name);
      modalCheckLabel.textContent = 'Earned on PlayStation 5 (Click to unmark)';
      showToast(`Earned: ${t.name}!`);
    } else {
      earned.delete(t.name);
      modalCheckLabel.textContent = 'Mark as Earned on PlayStation 5';
    }
    saveChecklist();
    updateDashboard();
    renderChecklist();
    renderMissablesView();
  });

  toggleRow.append(modalCheckbox, modalCheckLabel);

  // Missable warning callout if applicable
  let warnCallout = null;
  if (t.missable) {
    warnCallout = document.createElement('div');
    warnCallout.className = 'missable-warning-box';
    warnCallout.innerHTML = `<strong>⚠️ CRITICAL MISSABLE NOTICE:</strong> ${t.missable_note || t.guide}`;
  }

  // Detailed Walkthrough Guide
  const guideHeading = document.createElement('h4');
  guideHeading.className = 'modal-section-title';
  guideHeading.textContent = 'Comprehensive Trophy Guide & Strategy';

  const guideText = document.createElement('p');
  guideText.className = 'modal-guide-text';
  guideText.textContent = t.guide;

  // Step-by-step checklist
  const stepsHeading = document.createElement('h4');
  stepsHeading.className = 'modal-section-title';
  stepsHeading.textContent = 'Step-by-Step Tactical Walkthrough';

  const stepsList = document.createElement('ul');
  stepsList.className = 'modal-steps-list';
  if (t.steps && t.steps.length > 0) {
    t.steps.forEach((st, idx) => {
      const li = document.createElement('li');
      const numTag = document.createElement('span');
      numTag.className = 'step-number-tag';
      numTag.textContent = idx + 1;
      const textSpan = document.createElement('span');
      textSpan.textContent = st;
      li.append(numTag, textSpan);
      stepsList.appendChild(li);
    });
  }

  // Citations & Sources Box
  const sourcesHeading = document.createElement('h4');
  sourcesHeading.className = 'modal-section-title';
  sourcesHeading.textContent = 'Authoritative Sources & Citations';

  const sourcesBox = document.createElement('div');
  sourcesBox.className = 'modal-sources-box';
  sourcesBox.innerHTML = `<strong>Data Verification:</strong> ${t.sources}`;

  modalContentBody.append(top, toggleRow);
  if (warnCallout) modalContentBody.appendChild(warnCallout);
  modalContentBody.append(guideHeading, guideText, stepsHeading, stepsList, sourcesHeading, sourcesBox);

  modalBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
}

// Update UI for Spoiler Button
function updateSpoilerButtonUI() {
  if (spoilerMode) {
    toggleSpoilerBtn.classList.remove('spoiler-off');
    spoilerStatusText.textContent = 'SHIELDED';
  } else {
    toggleSpoilerBtn.classList.add('spoiler-off');
    spoilerStatusText.textContent = 'UNSHIELDED';
  }
}

// Render Roadmap Stage Trophy Pills
function renderRoadmapStagePills() {
  for (let stage = 1; stage <= 4; stage++) {
    const container = document.getElementById(`stage-${stage}-trophies`);
    if (!container) continue;
    container.replaceChildren();

    const stageTrophies = doc.trophies.filter(t => t.roadmap_stage === stage);
    const pillGroup = document.createElement('div');
    pillGroup.style.display = 'flex';
    pillGroup.style.flexWrap = 'wrap';
    pillGroup.style.gap = '0.5rem';
    pillGroup.style.margin = '0.65rem 0';

    for (const t of stageTrophies) {
      const isEarned = earned.has(t.name);
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `stage-trophy-pill ${isEarned ? 'is-earned' : ''}`;
      pill.title = `${t.name} (${t.grade}) - Click to open walkthrough`;

      const checkIcon = isEarned ? '✓ ' : '';
      pill.innerHTML = `<span>${checkIcon}#${t.id} ${t.name}</span> <span class="badge badge-${t.grade}" style="font-size:0.62rem;padding:0.1rem 0.35rem;">${t.grade}</span>`;

      pill.addEventListener('click', () => {
        openTrophyModal(t);
      });

      pillGroup.appendChild(pill);
    }

    // Add action row for the stage
    const actionsRow = document.createElement('div');
    actionsRow.className = 'stage-actions-row';

    const countEarned = stageTrophies.filter(t => earned.has(t.name)).length;
    const stageSummary = document.createElement('span');
    stageSummary.style.fontSize = '0.78rem';
    stageSummary.style.color = 'var(--text-muted)';
    stageSummary.textContent = `Stage Progress: ${countEarned} / ${stageTrophies.length} Earned`;

    const filterStageBtn = document.createElement('button');
    filterStageBtn.type = 'button';
    filterStageBtn.className = 'btn-stage-action';
    filterStageBtn.textContent = 'View in Checklist ➔';
    filterStageBtn.addEventListener('click', () => {
      filterKind.value = 'all';
      filterGrade.value = 'all';
      filterStatus.value = 'all';
      sortOrder.value = 'roadmap-asc';
      document.querySelector('.tab-btn[data-tab="tab-checklist"]').click();
      renderChecklist();
    });

    actionsRow.append(stageSummary, filterStageBtn);

    container.append(pillGroup, actionsRow);
  }
}

// Render All Views
function renderAllViews() {
  updateDashboard();
  renderChecklist();
  renderMissablesView();
  renderActivitiesView();
  renderRoadmapStagePills();
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation Tabs
  const tabButtons = document.querySelectorAll('.nav-tabs .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.remove('active');
      });
      const targetSec = document.getElementById(targetId);
      if (targetSec) targetSec.classList.add('active');
    });
  });

  // Grade filter clicks from dashboard pills
  document.querySelectorAll('.grade-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const g = pill.dataset.grade;
      filterGrade.value = g;
      // Switch to checklist tab
      document.querySelector('.tab-btn[data-tab="tab-checklist"]').click();
      renderChecklist();
    });
  });

  // Search and Filters
  searchInput.addEventListener('input', renderChecklist);
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderChecklist();
  });
  filterGrade.addEventListener('change', renderChecklist);
  filterKind.addEventListener('change', renderChecklist);
  filterStatus.addEventListener('change', renderChecklist);
  sortOrder.addEventListener('change', renderChecklist);

  // Keyboard shortcut '/' or 'Ctrl+K' to quickly search
  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) && document.activeElement !== searchInput) {
      e.preventDefault();
      document.querySelector('.tab-btn[data-tab="tab-checklist"]').click();
      searchInput.focus();
      searchInput.select();
    }
  });

  // Spoiler Mode Toggle
  toggleSpoilerBtn.addEventListener('click', () => {
    spoilerMode = !spoilerMode;
    revealedSpoilers.clear();
    saveSpoilerSetting();
    updateSpoilerButtonUI();
    renderChecklist();
    showToast(spoilerMode ? 'Story Spoilers Shielded' : 'Story Spoilers Revealed');
  });

  // Modal Close
  modalCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalBackdrop.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Expand / Collapse Guides
  expandAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.trophy-card').forEach(c => c.classList.add('expanded'));
  });
  collapseAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.trophy-card').forEach(c => c.classList.remove('expanded'));
  });

  // Export JSON
  exportBtn.addEventListener('click', () => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      earned: [...earned],
      activities: activities
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Progress exported to gta6-trophy-progress.json');
  });

  // Import JSON
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (Array.isArray(imported)) {
        earned = new Set(imported);
      } else if (imported && Array.isArray(imported.earned)) {
        earned = new Set(imported.earned);
        if (imported.activities) activities = imported.activities;
      }
      saveChecklist();
      saveActivities();
      renderAllViews();
      showToast(`Imported ${earned.size} trophies successfully!`);
    } catch (err) {
      alert('Error parsing JSON progress file: ' + err.message);
    }
    importInput.value = '';
  });

  // Reset Progress
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all tracked trophy progress and activity counters?')) {
      earned.clear();
      activities = {};
      revealedSpoilers.clear();
      saveChecklist();
      saveActivities();
      renderAllViews();
      showToast('All progress reset.');
    }
  });

  // Hotkey '?' to switch to sources/citations tab
  window.addEventListener('keydown', (e) => {
    if (e.key === '?' && document.activeElement !== searchInput) {
      const sourcesTabBtn = document.querySelector('.tab-btn[data-tab="tab-sources"]');
      if (sourcesTabBtn) sourcesTabBtn.click();
    }
  });
}

// Start application
initApp();