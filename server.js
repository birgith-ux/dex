require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Constants ────────────────────────────────────────────────────────────────

const DEX_BIRTHDAY = new Date('2026-01-18T00:00:00');

const PHASES = [
  {
    id: 1,
    naam: 'Socialisatie',
    start_weeks: 3,
    end_weeks: 12,
    emoji: '🌍',
    wat_er_gebeurt: 'Dex leert de wereld kennen. Alles wat hij nu ervaart wordt genormaliseerd.',
    aandachtspunten: 'Zoveel mogelijk positieve ervaringen — mensen, geluiden, oppervlakken, dieren.',
    kan_leren: ['Naam herkennen', 'Zit', 'Poot geven', 'Komen op roep (basis)'],
  },
  {
    id: 2,
    naam: 'Angstperiode 1',
    start_weeks: 8,
    end_weeks: 11,
    emoji: '🫶',
    wat_er_gebeurt: 'Plotseling bang voor bekende dingen. Traumatische ervaringen beklijven extra.',
    aandachtspunten: 'NOOIT forceren. Rustig en positief blijven. Geen grote schrikmomenten.',
    kan_leren: ['Zit', 'Af', 'Naam herkennen'],
  },
  {
    id: 3,
    naam: 'Rangorde & Zelfstandigheid',
    start_weeks: 12,
    end_weeks: 16,
    emoji: '🐾',
    wat_er_gebeurt: 'Test grenzen, meer zelfvertrouwen, begint eigen wil te tonen.',
    aandachtspunten: 'Consistente grenzen stellen. Begin met alleen-thuis-training.',
    kan_leren: ['Zit', 'Af', 'Blijf', 'Plek', 'Los', 'Alleen zijn (kort)'],
  },
  {
    id: 4,
    naam: 'Puberteit vroeg',
    start_weeks: 16,
    end_weeks: 26,
    emoji: '🌱',
    wat_er_gebeurt: 'Hormonen, vergeet commando\'s die hij al kende, test grenzen opnieuw.',
    aandachtspunten: 'Geduld! Niet straffen. Oefeningen vaker herhalen. Korte vrolijke sessies.',
    kan_leren: ['Alles basis', 'Looptraining aan riem', 'Tungel', 'Wacht'],
  },
  {
    id: 5,
    naam: 'Puberteit piek',
    start_weeks: 26,
    end_weeks: 39,
    emoji: '🔥',
    wat_er_gebeurt: 'Afleidbaar, koppig, roedel-bewust.',
    aandachtspunten: 'Extra socialisatie, consistent blijven, spel als beloning.',
    kan_leren: ["Verlenging commando's", "Afstandscommando's"],
  },
  {
    id: 6,
    naam: 'Volwassen worden',
    start_weeks: 39,
    end_weeks: 52,
    emoji: '🎓',
    wat_er_gebeurt: 'Rustiger, consistenter — maar nog steeds puber.',
    aandachtspunten: 'Consolideren wat hij al kan. Diepte in plaats van breedte.',
    kan_leren: ["Complexere commando's", 'Tricks', 'Advanced looptraining'],
  },
  {
    id: 7,
    naam: 'Sociaal volwassen',
    start_weeks: 52,
    end_weeks: 78,
    emoji: '⭐',
    wat_er_gebeurt: 'Karakter kristalliseert zich. Gedrag stabiliseert.',
    aandachtspunten: 'Onderhoud routines. Blijf stimuleren mentaal én fysiek.',
    kan_leren: ['Gevorderde gehoorzaamheid', 'Sport', 'Advanced tricks'],
  },
];

const FALLBACK_EXERCISES = {
  3:  [
    { naam: 'Zit', emoji: '🎯', doel: 'Basiscommando beheersen', stappen: ['Neem een snackje in je hand en hou het boven Dex zijn neus', 'Beweeg je hand langzaam naar achteren — zijn kont gaat automatisch naar beneden', 'Zodra hij zit: "Zit!" zeggen en meteen belonen', 'Herhaal 5× en stop dan'], duur_minuten: 3, beloning: 'Klein stukje kip of kibble', tip: 'Bij 13 weken: houd het superkorter — succes is alles!', herhaling_reden: null },
    { naam: 'Naam herkennen', emoji: '👂', doel: 'Reageren op naam', stappen: ['Ga op Dex zijn niveau zitten', 'Zeg rustig "Dex!" één keer', 'Zodra hij je aankijkt: YES! en belonen', 'Doe dit op 5 verschillende momenten', 'Probeer ook met lichte afleiding'], duur_minuten: 4, beloning: 'Heel veel lof + stukje snack', tip: 'Nooit zijn naam gebruiken voor iets negatiefs', herhaling_reden: null },
    { naam: 'Alleen zijn (intro)', emoji: '🏠', doel: 'Kort alleen zijn oefenen', stappen: ['Loop rustig de kamer uit, zonder theater', 'Wacht 10 seconden buiten de deur', 'Kom rustig terug — geen overdreven begroeting', 'Bouw op naar 30 seconden, dan 1 minuut', 'Stop zodra hij onrustig wordt'], duur_minuten: 5, beloning: 'Rustige aai als je terugkomt', tip: 'Rustig wegaan = rustig terugkomen. Geen drama in beide richtingen.', herhaling_reden: null },
  ],
  4:  [
    { naam: 'Af (liggen)', emoji: '⬇️', doel: 'Ligcommando leren', stappen: ['Begin met Dex in zit-positie', 'Hou snack voor zijn neus en beweeg langzaam naar de grond', 'Wacht tot hij volledig ligt — geef dan "Af!" en beloon', 'Herhaal 5×', 'Eindig altijd met een commando dat hij al kent'], duur_minuten: 4, beloning: 'Jackpot beloning (3 snackjes!)', tip: 'Als hij niet meewerkt, stop dan — kom later terug', herhaling_reden: null },
    { naam: 'Poot geven', emoji: '🤝', doel: 'Vriendelijk contact oefenen', stappen: ['Vraag Dex om te zitten', 'Hou je handpalm open voor zijn poot', 'Zodra hij zijn poot licht optilt: "Poot!" zeggen en belonen', 'Herhaal met geduld — forceer nooit de poot', 'Eindig na 5 successen'], duur_minuten: 3, beloning: 'Veel enthousiasme + snack', tip: 'Kies een moment waarop hij rustig is', herhaling_reden: null },
    { naam: 'Socialisatie loopje', emoji: '🚶', doel: 'Nieuwe omgeving verkennen', stappen: ['Neem Dex mee op een rustige plek buiten', 'Laat hem de omgeving verkennen op zijn eigen tempo', 'Beloon kalm gedrag bij nieuwe prikkels', 'Forceer nooit contact met iets wat hem schrikt', 'Hou het bij 10 minuten'], duur_minuten: 10, beloning: 'Rustige aandacht en lof', tip: 'Zijn tempo is leidend — jij bent zijn veilige basis', herhaling_reden: null },
  ],
};

function getFallbackExercises(ageWeeks) {
  if (ageWeeks < 12) return FALLBACK_EXERCISES[3];
  if (ageWeeks < 16) return FALLBACK_EXERCISES[3];
  return FALLBACK_EXERCISES[4];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDexAge() {
  const now = new Date();
  const diffMs = now - DEX_BIRTHDAY;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays };
}

function getCurrentPhase(weeks) {
  if (weeks >= 52) return PHASES[6];
  if (weeks >= 39) return PHASES[5];
  if (weeks >= 26) return PHASES[4];
  if (weeks >= 16) return PHASES[3];
  if (weeks >= 12) return PHASES[2];
  if (weeks >= 8)  return PHASES[1];
  return PHASES[0];
}

function getNextPhase(currentPhase) {
  return PHASES.find(p => p.id === currentPhase.id + 1) || null;
}

function getPhaseProgress(weeks, phase) {
  const elapsed = Math.max(0, weeks - phase.start_weeks);
  const total = phase.end_weeks - phase.start_weeks;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function generateWithClaude(ageWeeks, phase, masteredSkills, strugglingSkills) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return getFallbackExercises(ageWeeks);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Jij bent een expert hondentrainer gespecialiseerd in positieve bekrachtiging voor labradoodles. Genereer een dagelijks puppytrainingsplan in het Nederlands. Geef ALLEEN geldige JSON terug, geen tekst, geen uitleg, geen markdown. De JSON moet een array zijn van precies 3 oefeningen.`;

  const userPrompt = `Genereer een trainingsplan voor Dex, een labradoodle pup van ${ageWeeks} weken oud.
Huidige fase: Fase ${phase.id} — ${phase.naam}
Wat er nu speelt: ${phase.wat_er_gebeurt}
Aandachtspunten: ${phase.aandachtspunten}

${masteredSkills.length > 0 ? `Commando's die Dex al beheerst: ${masteredSkills.join(', ')}` : ''}
${strugglingSkills.length > 0 ? `Punten waar Dex moeite mee heeft: ${strugglingSkills.join(', ')}` : ''}

Geef ALLEEN een JSON array terug van exact 3 oefeningen, elk met dit formaat:
[
  {
    "naam": "Oefeningstitel",
    "emoji": "🎯",
    "doel": "Korte doelomschrijving",
    "stappen": ["Stap 1", "Stap 2", "Stap 3", "Stap 4"],
    "duur_minuten": 3,
    "beloning": "Beschrijving beloning",
    "tip": "Leeftijdsspecifieke tip voor ${ageWeeks} weken",
    "herhaling_reden": null
  }
]`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].text.trim();
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  const { weeks, days } = getDexAge();
  const phase = getCurrentPhase(weeks);
  const nextPhase = getNextPhase(phase);
  const phaseProgress = getPhaseProgress(weeks, phase);
  res.json({ ageWeeks: weeks, ageDays: days, phase, nextPhase, phaseProgress });
});

app.get('/api/training/today', async (req, res) => {
  try {
    const today = todayString();
    const cached = db.prepare('SELECT plan_json FROM daily_plans WHERE date = ?').get(today);
    if (cached) {
      const exercises = JSON.parse(cached.plan_json);
      const logs = db.prepare('SELECT * FROM training_logs WHERE date = ?').all(today);
      return res.json({ exercises, date: today, cached: true, logs });
    }

    const { weeks } = getDexAge();
    const phase = getCurrentPhase(weeks);
    const mastered = db.prepare("SELECT name FROM skills WHERE status = 'mastered'").all().map(r => r.name);
    const struggling = db.prepare("SELECT name FROM skills WHERE status = 'struggling'").all().map(r => r.name);

    const exercises = await generateWithClaude(weeks, phase, mastered, struggling);
    db.prepare('INSERT OR REPLACE INTO daily_plans (date, plan_json) VALUES (?, ?)').run(today, JSON.stringify(exercises));

    const logs = db.prepare('SELECT * FROM training_logs WHERE date = ?').all(today);
    res.json({ exercises, date: today, cached: false, logs });
  } catch (err) {
    console.error('Training generation error:', err);
    const { weeks } = getDexAge();
    const fallback = getFallbackExercises(weeks);
    const today = todayString();
    const logs = db.prepare('SELECT * FROM training_logs WHERE date = ?').all(today);
    res.json({ exercises: fallback, date: today, cached: false, logs, fallback: true });
  }
});

app.post('/api/training/generate', async (req, res) => {
  try {
    const today = todayString();
    db.prepare('DELETE FROM daily_plans WHERE date = ?').run(today);

    const { weeks } = getDexAge();
    const phase = getCurrentPhase(weeks);
    const mastered = db.prepare("SELECT name FROM skills WHERE status = 'mastered'").all().map(r => r.name);
    const struggling = db.prepare("SELECT name FROM skills WHERE status = 'struggling'").all().map(r => r.name);

    const exercises = await generateWithClaude(weeks, phase, mastered, struggling);
    db.prepare('INSERT INTO daily_plans (date, plan_json) VALUES (?, ?)').run(today, JSON.stringify(exercises));

    const logs = db.prepare('SELECT * FROM training_logs WHERE date = ?').all(today);
    res.json({ exercises, date: today, cached: false, logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon geen trainingsplan genereren', details: err.message });
  }
});

app.post('/api/training/log', (req, res) => {
  const { exercise_name, emoji, result, notes } = req.body;
  if (!exercise_name || !result) return res.status(400).json({ error: 'exercise_name en result zijn verplicht' });

  const { weeks } = getDexAge();
  const phase = getCurrentPhase(weeks);
  const today = todayString();

  const info = db.prepare(
    'INSERT INTO training_logs (date, exercise_name, emoji, phase_id, age_weeks, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(today, exercise_name, emoji || '', phase.id, weeks, result, notes || '');

  // Update skill status based on result
  if (result === 'goed') {
    db.prepare("UPDATE skills SET status = 'practicing', last_practiced = ? WHERE name = ? AND status = 'not_started'")
      .run(today, exercise_name);
  } else if (result === 'lastig') {
    db.prepare("UPDATE skills SET status = 'struggling', last_practiced = ? WHERE name = ?")
      .run(today, exercise_name);
  }

  res.json({ id: info.lastInsertRowid, date: today, exercise_name, result });
});

app.get('/api/progress', (req, res) => {
  // Streak: count consecutive days with at least one log
  const allDates = db.prepare("SELECT DISTINCT date FROM training_logs ORDER BY date DESC").all().map(r => r.date);
  let streak = 0;
  const today = todayString();
  const msPerDay = 86400000;
  const todayTs = new Date(today).getTime();

  for (let i = 0; i < allDates.length; i++) {
    const expected = new Date(todayTs - i * msPerDay).toISOString().slice(0, 10);
    if (allDates[i] === expected) streak++;
    else break;
  }

  // 7-day calendar
  const calendar = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayTs - i * msPerDay).toISOString().slice(0, 10);
    const logs = db.prepare('SELECT result FROM training_logs WHERE date = ?').all(d);
    let status = 'geen';
    if (logs.length > 0) {
      const allGood = logs.every(l => l.result === 'goed');
      status = allGood ? 'groen' : 'bezig';
    }
    calendar.push({ date: d, status, count: logs.length });
  }

  const skills = db.prepare('SELECT * FROM skills ORDER BY phase_introduced, name').all();
  const milestones = db.prepare('SELECT * FROM milestones ORDER BY date DESC').all();

  res.json({ streak, calendar, skills, milestones });
});

app.get('/api/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM training_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json(logs);
});

app.post('/api/milestones', (req, res) => {
  const { date, title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel is verplicht' });
  const d = date || todayString();
  const info = db.prepare('INSERT INTO milestones (date, title, description) VALUES (?, ?, ?)').run(d, title, description || '');
  res.json({ id: info.lastInsertRowid, date: d, title, description });
});

app.get('/api/milestones', (req, res) => {
  const milestones = db.prepare('SELECT * FROM milestones ORDER BY date DESC').all();
  res.json(milestones);
});

app.patch('/api/skills/:id', (req, res) => {
  const { status } = req.body;
  const valid = ['not_started', 'practicing', 'mastered', 'struggling'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Ongeldige status' });
  db.prepare('UPDATE skills SET status = ?, last_practiced = ? WHERE id = ?').run(status, todayString(), req.params.id);
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🐾 Dex Trainer draait op http://localhost:${PORT}`);
});
