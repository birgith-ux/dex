const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_logs (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      emoji TEXT,
      phase_id INTEGER,
      age_weeks INTEGER,
      result TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phase_introduced INTEGER,
      status TEXT DEFAULT 'not_started',
      last_practiced TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_plans (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      plan_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed initial skills if empty
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM skills');
  if (parseInt(rows[0].count) === 0) {
    const skills = [
      ['Naam herkennen', 1],
      ['Zit', 1],
      ['Poot geven', 1],
      ['Komen op roep', 1],
      ['Af (liggen)', 2],
      ['Blijf', 3],
      ['Plek', 3],
      ['Los (speel-commando)', 3],
      ['Alleen zijn', 3],
      ['Looptraining aan riem', 4],
      ['Tungel', 4],
      ['Wacht', 4],
      ["Verlenging commando's", 5],
      ["Afstandscommando's", 5],
      ['Advanced looptraining', 6],
      ["Complexere commando's", 6],
      ['Tricks (geavanceerd)', 6],
      ['Gevorderde gehoorzaamheid', 7],
      ['Sport & activiteiten', 7],
    ];
    for (const [name, phase] of skills) {
      await pool.query(
        "INSERT INTO skills (name, phase_introduced, status) VALUES ($1, $2, 'not_started')",
        [name, phase]
      );
    }
  }
}

module.exports = { pool, initDb };
