/* ─── State ─────────────────────────────────────────────────────────────────── */
const state = {
  tab: 'vandaag',
  status: null,
  todayPlan: null,
  todayLogs: {},          // { exerciseIndex: { result, notes } }
  showResult: false,
  expandedCard: null,
  progress: null,
  allLogs: [],
  loading: true,
  generating: false,
  showMilestoneModal: false,
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const DUTCH_DAYS   = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const DUTCH_DAYS_FULL = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
const DUTCH_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

function dutchDate(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  return `${DUTCH_DAYS_FULL[d.getDay()]}, ${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}`;
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ─── API ───────────────────────────────────────────────────────────────────── */
const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(url, body) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

/* ─── Renderers ─────────────────────────────────────────────────────────────── */

function renderSkeleton() {
  return `
    <div class="today-header">
      <div class="today-date">${dutchDate()}</div>
    </div>
    <div class="skeleton-wrap">
      <p class="skeleton-text">Even nadenken voor Dex...</p>
      ${[0,1,2].map(() => `
        <div class="skeleton-card">
          <div class="sk-header">
            <div class="sk-icon"></div>
            <div class="sk-meta">
              <div class="sk-line w-60"></div>
              <div class="sk-line w-80 h-8"></div>
              <div class="sk-line w-40 h-8"></div>
            </div>
          </div>
          <div class="sk-line w-80"></div>
          <div class="sk-line w-60 h-8"></div>
        </div>`).join('')}
    </div>`;
}

function resultLabel(result) {
  if (result === 'goed')     return 'Ging goed!';
  if (result === 'herhalen') return 'Herhalen';
  if (result === 'lastig')   return 'Lastig';
  return result;
}

function resultMsg(result) {
  if (result === 'goed')     return 'Super gedaan! Dex pakt dit goed op.';
  if (result === 'herhalen') return 'We oefenen dit morgen opnieuw — herhaling is leren, geen falen.';
  if (result === 'lastig')   return 'Dit heeft meer tijd nodig. We bouwen dit rustig en positief op.';
  return '';
}

function renderExerciseCard(ex, index, log) {
  const isExpanded = state.expandedCard === index;
  const isLogged   = !!log;
  const colorClass = `color-${index % 3}`;

  const loggedBadge = isLogged
    ? `<span class="exercise-result-badge ${escHtml(log.result)}" style="
        background:${log.result==='goed'?'var(--success-bg)':log.result==='herhalen'?'var(--warning-bg)':'var(--danger-bg)'};
        color:${log.result==='goed'?'var(--success-text)':log.result==='herhalen'?'var(--warning-text)':'var(--danger-text)'}
      ">${resultLabel(log.result)}</span>`
    : '';

  const stepsHtml = (ex.stappen || []).map((s, i) => `
    <li>
      <span class="step-num">${i+1}</span>
      <span>${escHtml(s)}</span>
    </li>`).join('');

  const feedbackHtml = isLogged ? '' : `
    <div class="feedback-buttons">
      <button class="feedback-btn goed"     onclick="logExercise(${index},'goed')">Ging goed! <span>→</span></button>
      <button class="feedback-btn herhalen" onclick="logExercise(${index},'herhalen')">Oké, herhalen morgen <span>↺</span></button>
      <button class="feedback-btn lastig"   onclick="logExercise(${index},'lastig')">Lastig, meer oefening nodig <span>⚡</span></button>
    </div>
    <div class="note-input-wrap">
      <input class="note-input" id="note-${index}" type="text" placeholder="Optionele notitie..." />
    </div>`;

  return `
    <div class="exercise-card${isLogged?' logged':''}${isExpanded?' expanded':''}" id="ex-card-${index}">
      <div class="exercise-card-header" onclick="toggleExpand(${index})">
        <div class="exercise-icon-wrap">
          <div class="exercise-icon ${colorClass}">${escHtml(ex.emoji)}</div>
          <span class="exercise-num">${index+1}</span>
        </div>
        <div class="exercise-meta">
          <div class="exercise-name">${escHtml(ex.naam)}</div>
          <div class="exercise-goal">${escHtml(ex.doel)}</div>
          <div class="exercise-pills">
            <span class="pill pill-amber">⏱ ${ex.duur_minuten} min</span>
            ${loggedBadge}
          </div>
        </div>
        <span class="exercise-expand-icon">›</span>
      </div>
      <div class="exercise-body">
        ${ex.tip ? `<div class="exercise-tip">💡 ${escHtml(ex.tip)}</div>` : ''}
        <ul class="steps-list">${stepsHtml}</ul>
        ${ex.beloning ? `<div class="exercise-reward">🎁 <span><strong>Beloning:</strong> ${escHtml(ex.beloning)}</span></div>` : ''}
        ${feedbackHtml}
      </div>
    </div>`;
}

function renderVandaag() {
  if (state.loading) return renderSkeleton();

  const plan = state.todayPlan;
  const logs = state.todayLogs;

  // Empty / first time state
  if (!plan) {
    return `
      <div class="empty-state">
        <div class="empty-paw">🐾</div>
        <h2 class="empty-title">Welkom bij Dex zijn trainingsapp</h2>
        <p class="empty-text">
          Elke dag een persoonlijk trainingsprogramma voor Dex, afgestemd op zijn leeftijd en wat hij al kan.
        </p>
        <button class="btn-accent" onclick="generatePlan()">Start eerste sessie →</button>
      </div>`;
  }

  const exercises = plan.exercises || [];
  const loggedCount = Object.keys(logs).length;
  const total = exercises.length;

  // Daily result screen
  if (state.showResult) {
    return renderDagResultaat(exercises, logs);
  }

  const dots = exercises.map((_, i) => {
    const cls = i < loggedCount ? 'done' : i === loggedCount ? 'active' : '';
    return `<div class="progress-dot ${cls}"></div>`;
  }).join('');

  const status = state.status;
  const ageLabel = status ? `${status.ageWeeks} weken` : '';

  return `
    <div class="today-header">
      <div class="today-date">${dutchDate()}</div>
      <div class="today-subtitle">Sessie voor Dex · ${ageLabel}</div>
      <div class="progress-dots">
        ${dots}
        <span class="progress-counter">${loggedCount}/${total}</span>
      </div>
    </div>
    <div class="screen">
      ${exercises.map((ex, i) => renderExerciseCard(ex, i, logs[i])).join('')}
      ${loggedCount < total && loggedCount > 0 ? `
        <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:8px 0;">
          Ga door — Dex doet het geweldig! 🌟
        </p>` : ''}
      ${loggedCount === 0 ? `
        <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:8px 0;">
          Tik op een kaart om de oefening te starten
        </p>` : ''}
    </div>`;
}

function renderDagResultaat(exercises, logs) {
  const loggedCount = Object.keys(logs).length;
  const totalMinutes = exercises.reduce((sum, ex) => sum + (ex.duur_minuten || 0), 0);

  const rows = exercises.map((ex, i) => {
    const log = logs[i];
    if (!log) return '';
    return `
      <div class="result-row ${log.result}">
        <div class="result-row-emoji">${escHtml(ex.emoji)}</div>
        <div class="result-row-info">
          <div class="result-row-name">${escHtml(ex.naam)}</div>
          <div class="result-row-msg">${resultMsg(log.result)}</div>
          ${log.notes ? `<div class="result-row-msg" style="font-style:italic;">"${escHtml(log.notes)}"</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const allGood = Object.values(logs).every(l => l.result === 'goed');
  const anyStruggle = Object.values(logs).some(l => l.result === 'lastig');
  let overallMsg = '';
  if (allGood) {
    overallMsg = `Dex heeft vandaag ${totalMinutes} minuten getraind en alles super gedaan! Hij leert elke dag een beetje meer. Trots op jullie allebei! 🏆`;
  } else if (anyStruggle) {
    overallMsg = `Dex heeft vandaag ${totalMinutes} minuten geoefend. Sommige dingen hebben meer tijd nodig — en dat is precies hoe leren werkt. Morgen gaan we verder, lekker rustig en positief. 💛`;
  } else {
    overallMsg = `Dex heeft vandaag ${totalMinutes} minuten getraind. Een prima sessie! Herhaling is de beste leermeester — morgen weer doorgaan. ✨`;
  }

  return `
    <div class="result-screen">
      <div class="result-hero">
        <div class="result-dog">🐶</div>
        <div class="result-title">Sessie afgerond!</div>
        <div class="result-subtitle">${loggedCount} van ${exercises.length} oefeningen gelogd</div>
      </div>
      <div class="result-list">${rows}</div>
      <div class="result-message">${escHtml(overallMsg)}</div>
      <button class="btn-primary" onclick="closeResult()">Klaar voor vandaag →</button>
      <button class="btn-secondary" onclick="generatePlan()">↺ Nieuwe sessie genereren</button>
    </div>`;
}

function renderProgressRing(pct) {
  const r = 55;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return `
    <svg width="140" height="140" viewBox="0 0 140 140" style="display:block;">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#EEDFC8" stroke-width="10"/>
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#F4A261" stroke-width="10"
        stroke-dasharray="${circ.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(-90 70 70)"/>
      <text x="70" y="65" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="26" font-weight="700" fill="#1C1C1A">${pct}%</text>
      <text x="70" y="84" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="11" fill="#7A7060" font-weight="500">van fase</text>
    </svg>`;
}

function renderGroei() {
  const s = state.status;
  if (!s) return `<div class="screen"><p class="label-muted" style="padding-top:20px;">Laden…</p></div>`;

  const phase = s.phase;
  const next  = s.nextPhase;
  const pct   = s.phaseProgress;

  // Skills from progress (filtered to current phase or below)
  const skills = (state.progress?.skills || []).filter(sk => sk.phase_introduced <= phase.id);

  const skillsHtml = skills.length > 0
    ? skills.map(sk => `
        <div class="skill-item">
          <div class="skill-check ${sk.status === 'mastered' ? 'checked' : ''}"
               onclick="toggleSkill(${sk.id},'${escHtml(sk.status)}')">
            ${sk.status === 'mastered' ? '✓' : ''}
          </div>
          <span class="skill-name">${escHtml(sk.name)}</span>
        </div>`).join('')
    : `<p style="font-size:13px;color:var(--text-muted);">Nog geen vaardigheden voor deze fase.</p>`;

  const nextPhaseHtml = next ? `
    <div class="next-phase-card">
      <div class="np-label">Volgende fase</div>
      <h4>${escHtml(next.emoji)} ${escHtml(next.naam)}</h4>
      <p>Vanaf ${next.start_weeks} weken · ${escHtml(next.wat_er_gebeurt)}</p>
    </div>` : '';

  return `
    <div class="screen-header">
      <h1>Groei & Fases</h1>
      <p>Dex zijn ontwikkeling op een rij</p>
    </div>

    <div class="age-hero">
      <div class="age-hero-numbers">
        <div class="age-hero-big">
          <span class="num">${s.ageWeeks}</span>
          <span class="unit">weken</span>
        </div>
        <div class="age-hero-sub">en ${s.ageDays} ${s.ageDays === 1 ? 'dag' : 'dagen'}</div>
      </div>
      <div class="age-hero-avatar">🐶</div>
    </div>

    <div class="screen">
      <div class="phase-ring-wrap">
        ${renderProgressRing(pct)}
        <div class="phase-ring-subtitle">Fase ${phase.id} — ${escHtml(phase.naam)}</div>
        <div class="phase-ring-label">${phase.start_weeks}–${phase.end_weeks} weken</div>
      </div>

      <div class="phase-card">
        <div class="phase-card-title">
          <span class="phase-badge">Fase ${phase.id}</span>
          <h3>${escHtml(phase.emoji)} ${escHtml(phase.naam)}</h3>
        </div>
        <div class="phase-info-block">
          <div class="info-label">Wat er nu speelt</div>
          <p>${escHtml(phase.wat_er_gebeurt)}</p>
        </div>
        <div class="phase-info-block">
          <div class="info-label">Aandachtspunten</div>
          <p>${escHtml(phase.aandachtspunten)}</p>
        </div>
        <div class="phase-info-block">
          <div class="info-label">Kan leren</div>
          <p>${phase.kan_leren.map(escHtml).join(' · ')}</p>
        </div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0;">Wat hij nu zou moeten kunnen</div>
        <div class="skills-list">${skillsHtml}</div>
      </div>

      ${nextPhaseHtml}

      <button class="btn-small" onclick="openMilestoneModal()">
        ＋ Mijlpaal toevoegen
      </button>
    </div>

    ${renderMilestoneModal()}`;
}

function renderVoortgang() {
  const p = state.progress;
  if (!p) return `<div class="screen"><p class="label-muted" style="padding-top:20px;">Laden…</p></div>`;

  const streak = p.streak || 0;
  const cal = p.calendar || [];
  const skills = p.skills || [];
  const milestones = p.milestones || [];

  // 7-day calendar
  const calHtml = cal.map(d => {
    const date = new Date(d.date + 'T12:00:00');
    const isToday = d.date === todayStr();
    let emoji = '';
    if (d.status === 'groen') emoji = '✅';
    else if (d.status === 'bezig') emoji = '🔸';
    return `
      <div class="day-dot-wrap">
        <div class="day-label">${DUTCH_DAYS[date.getDay()]}</div>
        <div class="day-dot ${d.status} ${isToday ? 'today-ring' : ''}">
          ${emoji}
        </div>
      </div>`;
  }).join('');

  // Skills by phase group
  const byPhase = {};
  for (const sk of skills) {
    const ph = sk.phase_introduced;
    if (!byPhase[ph]) byPhase[ph] = [];
    byPhase[ph].push(sk);
  }

  const statusText = { not_started: 'Nog niet', practicing: 'Bezig', mastered: 'Beheerst', struggling: 'Lastig' };

  const skillsHtml = Object.entries(byPhase).map(([ph, list]) => `
    <div style="margin-bottom:4px;">
      <div class="label-muted" style="padding:10px 0 4px;">Fase ${ph}</div>
      ${list.map(sk => `
        <div class="skill-row">
          <span class="skill-row-name">${escHtml(sk.name)}</span>
          <span class="status-pill ${sk.status}">${statusText[sk.status] || sk.status}</span>
        </div>`).join('')}
    </div>`).join('');

  const milestonesHtml = milestones.length > 0
    ? milestones.map(m => `
        <div class="milestone-row">
          <div class="milestone-accent"></div>
          <div class="milestone-date">${shortDate(m.date)}</div>
          <div class="milestone-content">
            <div class="milestone-title">${escHtml(m.title)}</div>
            ${m.description ? `<div class="milestone-desc">${escHtml(m.description)}</div>` : ''}
          </div>
        </div>`).join('')
    : `<p style="font-size:13px;color:var(--text-muted);padding:8px 0;">Nog geen mijlpalen. Voeg ze toe via het Groei-tabblad.</p>`;

  const streakMsg = streak === 0
    ? 'Begin vandaag je eerste streak!'
    : streak === 1
    ? 'Goed bezig! Kom morgen terug voor dag 2.'
    : `${streak} dagen op rij getraind! Knap van jou en Dex! 🔥`;

  return `
    <div class="screen-header">
      <h1>Voortgang</h1>
      <p>Hoe ver jullie al gekomen zijn</p>
    </div>
    <div class="screen">
      <div class="stat-hero">
        <div class="stat-hero-num">${streak}</div>
        <div class="stat-hero-info">
          <div class="label">Dag streak</div>
          <div class="value">${streak === 1 ? '1 dag op rij' : streak + ' dagen op rij'}</div>
          <div class="sub">${streakMsg}</div>
        </div>
        <div style="font-size:40px;">${streak >= 7 ? '🔥' : streak >= 3 ? '⭐' : '🌱'}</div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0;">Laatste 7 dagen</div>
        <div class="week-calendar">${calHtml}</div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0;">Vaardigheden</div>
        ${skillsHtml}
      </div>

      <div class="card">
        <div class="section-title" style="margin-top:0;">Mijlpalen</div>
        ${milestonesHtml}
      </div>
    </div>`;
}

function renderLogboek() {
  const logs = state.allLogs;

  if (logs.length === 0) {
    return `
      <div class="screen-header"><h1>Logboek</h1><p>Alle trainingen van Dex</p></div>
      <div class="empty-state" style="min-height:40vh;">
        <div class="empty-paw">📝</div>
        <h2 class="empty-title">Nog geen logs</h2>
        <p class="empty-text">Zodra je een oefening hebt gelogd, zie je die hier terug.</p>
      </div>`;
  }

  // Group by date
  const grouped = {};
  for (const log of logs) {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  }

  const html = Object.entries(grouped).map(([date, entries]) => `
    <div class="log-group-date">${dutchDate(date)}</div>
    <div class="card" style="padding:8px 16px;">
      ${entries.map(log => `
        <div class="log-row">
          <div class="log-emoji">${escHtml(log.emoji) || '🐾'}</div>
          <div class="log-info">
            <div class="log-name">${escHtml(log.exercise_name)}</div>
            ${log.notes ? `<div class="log-note">${escHtml(log.notes)}</div>` : ''}
          </div>
          <span class="log-result ${log.result}">${resultLabel(log.result)}</span>
        </div>`).join('')}
    </div>`).join('');

  return `
    <div class="screen-header"><h1>Logboek</h1><p>Alle trainingen van Dex</p></div>
    <div class="screen">${html}</div>`;
}

function renderMilestoneModal() {
  if (!state.showMilestoneModal) return '';
  return `
    <div class="modal-overlay" onclick="closeMilestoneModal(event)">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="modal-title">Mijlpaal toevoegen</div>
        <div class="form-field">
          <label class="form-label">Mijlpaal</label>
          <input class="form-input" id="milestone-title" type="text"
            placeholder="bijv. Eerste keer 'zit' buitenshuis!" />
        </div>
        <div class="form-field">
          <label class="form-label">Beschrijving (optioneel)</label>
          <input class="form-input" id="milestone-desc" type="text"
            placeholder="Meer details..." />
        </div>
        <div class="form-field">
          <label class="form-label">Datum</label>
          <input class="form-input" id="milestone-date" type="date"
            value="${todayStr()}" />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeMilestoneModal()">Annuleren</button>
          <button class="btn-save" onclick="saveMilestone()">Opslaan →</button>
        </div>
      </div>
    </div>`;
}

/* ─── Render Dispatcher ─────────────────────────────────────────────────────── */
function render() {
  const content = $('screen-content');

  let html = '';
  if (state.tab === 'vandaag')   html = renderVandaag();
  if (state.tab === 'groei')     html = renderGroei();
  if (state.tab === 'voortgang') html = renderVoortgang();
  if (state.tab === 'logboek')   html = renderLogboek();

  content.innerHTML = html;

  // Update tab active states
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === state.tab);
  });
}

/* ─── Actions ───────────────────────────────────────────────────────────────── */
function toggleExpand(index) {
  state.expandedCard = state.expandedCard === index ? null : index;
  render();
}

async function logExercise(index, result) {
  const plan = state.todayPlan;
  if (!plan) return;

  const ex = plan.exercises[index];
  const noteEl = $(`note-${index}`);
  const notes = noteEl ? noteEl.value.trim() : '';

  try {
    await api.post('/api/training/log', {
      exercise_name: ex.naam,
      emoji: ex.emoji,
      result,
      notes,
    });

    state.todayLogs[index] = { result, notes };
    state.expandedCard = null;

    // Auto-expand next unlogged exercise
    const nextUnlogged = plan.exercises.findIndex((_, i) => !state.todayLogs[i] && i !== index);
    if (nextUnlogged !== -1) state.expandedCard = nextUnlogged;

    // Check if all done
    if (Object.keys(state.todayLogs).length === plan.exercises.length) {
      setTimeout(() => {
        state.showResult = true;
        render();
      }, 400);
      return;
    }

    render();
    // Refresh progress data in background
    loadProgress();
    loadLogs();
  } catch (err) {
    console.error('Log error:', err);
    alert('Er ging iets mis bij het opslaan. Probeer het opnieuw.');
  }
}

function closeResult() {
  state.showResult = false;
  render();
}

async function generatePlan() {
  state.loading = true;
  state.generating = true;
  state.showResult = false;
  state.todayLogs = {};
  state.expandedCard = null;
  render();

  try {
    const data = await api.post('/api/training/generate', {});
    state.todayPlan = data;
    state.todayLogs = {};

    // Pre-map any existing logs for today
    if (data.logs && data.logs.length > 0) {
      for (const log of data.logs) {
        const idx = (data.exercises || []).findIndex(e => e.naam === log.exercise_name);
        if (idx !== -1) state.todayLogs[idx] = { result: log.result, notes: log.notes };
      }
    }

    state.expandedCard = 0;
  } catch (err) {
    console.error(err);
    state.todayPlan = null;
  } finally {
    state.loading = false;
    state.generating = false;
    render();
  }
}

async function toggleSkill(id, currentStatus) {
  const newStatus = currentStatus === 'mastered' ? 'practicing' : 'mastered';
  try {
    await api.patch(`/api/skills/${id}`, { status: newStatus });
    await loadProgress();
    render();
  } catch (err) {
    console.error(err);
  }
}

function openMilestoneModal() {
  state.showMilestoneModal = true;
  render();
}

function closeMilestoneModal(e) {
  if (e && e.target !== document.querySelector('.modal-overlay')) return;
  state.showMilestoneModal = false;
  render();
}

async function saveMilestone() {
  const title = $('milestone-title')?.value.trim();
  const desc  = $('milestone-desc')?.value.trim();
  const date  = $('milestone-date')?.value;
  if (!title) { $('milestone-title')?.focus(); return; }

  try {
    await api.post('/api/milestones', { title, description: desc, date });
    state.showMilestoneModal = false;
    await loadProgress();
    render();
  } catch (err) {
    console.error(err);
    alert('Kon de mijlpaal niet opslaan.');
  }
}

/* ─── Data Loaders ──────────────────────────────────────────────────────────── */
async function loadStatus() {
  try {
    state.status = await api.get('/api/status');
  } catch (err) { console.error(err); }
}

async function loadToday() {
  try {
    const data = await api.get('/api/training/today');
    state.todayPlan = data;
    state.todayLogs = {};

    if (data.logs && data.logs.length > 0) {
      for (const log of data.logs) {
        const idx = (data.exercises || []).findIndex(e => e.naam === log.exercise_name);
        if (idx !== -1) state.todayLogs[idx] = { result: log.result, notes: log.notes };
      }
      // If all logged, go to result
      if (Object.keys(state.todayLogs).length === (data.exercises || []).length) {
        state.showResult = true;
      }
    }

    if (!state.showResult && !state.expandedCard) {
      // Expand first unlogged exercise
      const firstUnlogged = (data.exercises || []).findIndex((_, i) => !state.todayLogs[i]);
      if (firstUnlogged !== -1) state.expandedCard = firstUnlogged;
    }
  } catch (err) {
    console.error(err);
    state.todayPlan = null;
  }
}

async function loadProgress() {
  try {
    state.progress = await api.get('/api/progress');
  } catch (err) { console.error(err); }
}

async function loadLogs() {
  try {
    state.allLogs = await api.get('/api/logs');
  } catch (err) { console.error(err); }
}

/* ─── Tab Navigation ────────────────────────────────────────────────────────── */
document.getElementById('tab-bar').addEventListener('click', async e => {
  const tab = e.target.closest('[data-tab]')?.dataset.tab;
  if (!tab || tab === state.tab) return;
  state.tab = tab;
  render();

  // Lazy-load data for tabs
  if (tab === 'voortgang' && !state.progress) {
    await loadProgress();
    render();
  }
  if (tab === 'logboek' && state.allLogs.length === 0) {
    await loadLogs();
    render();
  }
  if (tab === 'groei' && !state.progress) {
    await loadProgress();
    render();
  }
});

/* ─── Init ──────────────────────────────────────────────────────────────────── */
async function init() {
  state.loading = true;
  render(); // Show skeleton immediately

  await Promise.all([loadStatus(), loadToday(), loadProgress(), loadLogs()]);

  state.loading = false;
  render();
}

init();
