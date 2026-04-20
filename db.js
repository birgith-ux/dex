const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'dex.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS training_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    emoji TEXT,
    phase_id INTEGER,
    age_weeks INTEGER,
    result TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phase_introduced INTEGER,
    status TEXT DEFAULT 'not_started',
    last_practiced TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    plan_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial skills if empty
const skillCount = db.prepare('SELECT COUNT(*) as count FROM skills').get();
if (skillCount.count === 0) {
  const insert = db.prepare('INSERT INTO skills (name, phase_introduced, status) VALUES (?, ?, ?)');
  const skills = [
    ['Naam herkennen', 1, 'not_started'],
    ['Zit', 1, 'not_started'],
    ['Poot geven', 1, 'not_started'],
    ['Komen op roep', 1, 'not_started'],
    ['Af (liggen)', 2, 'not_started'],
    ['Blijf', 3, 'not_started'],
    ['Plek', 3, 'not_started'],
    ['Los (speel-commando)', 3, 'not_started'],
    ['Alleen zijn', 3, 'not_started'],
    ['Looptraining aan riem', 4, 'not_started'],
    ['Tungel', 4, 'not_started'],
    ['Wacht', 4, 'not_started'],
    ["Verlenging commando's", 5, 'not_started'],
    ["Afstandscommando's", 5, 'not_started'],
    ['Advanced looptraining', 6, 'not_started'],
    ['Complexere commando\'s', 6, 'not_started'],
    ['Tricks (geavanceerd)', 6, 'not_started'],
    ['Gevorderde gehoorzaamheid', 7, 'not_started'],
    ['Sport & activiteiten', 7, 'not_started'],
  ];
  for (const [name, phase, status] of skills) {
    insert.run(name, phase, status);
  }
}

module.exports = db;
