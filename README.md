# Dex — Puppy Trainer 🐾

Persoonlijke trainingsapp voor Dex, een labradoodle pup geboren op 18 januari 2026.

## Setup

```bash
# 1. Installeer dependencies
npm install

# 2. Maak een .env bestand aan
cp .env.example .env

# 3. Voeg je Anthropic API sleutel toe in .env
#    ANTHROPIC_API_KEY=sk-ant-...

# 4. Start de app
npm start

# 5. Open in de browser
open http://localhost:3000
```

## Functies

- **Vandaag** — Dagelijks trainingsplan gegenereerd via Claude AI, met stap-voor-stap instructies en feedback logging
- **Groei** — Dex's leeftijd, ontwikkelingsfase, vaardigheidschecklist en mijlpalen
- **Voortgang** — Streak teller, 7-dagenkalender, vaardighedenmatrix
- **Logboek** — Volledige geschiedenis van alle trainingssessies

## Zonder API sleutel

Als er geen `ANTHROPIC_API_KEY` is ingesteld, gebruikt de app ingebouwde oefeningen die passend zijn voor Dex's huidige leeftijdsfase.

## Tech stack

- Node.js + Express (backend)
- SQLite via better-sqlite3 (database)
- Vanilla HTML/CSS/JS (frontend, geen frameworks)
- Anthropic Claude API (trainingsplan generatie)
