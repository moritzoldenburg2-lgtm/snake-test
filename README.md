# 🐍 Snake App

Minimale Snake-Web-App mit globalem Highscore und Spielerprofilen.

## Starten

```bash
npm start
```

Danach http://localhost:3000 öffnen (Port per `PORT`-Umgebungsvariable änderbar).

Keine Abhängigkeiten — nur Node.js (>= 18).

## Features

- Snake auf Canvas (Pfeiltasten/WASD, Leertaste = Pause)
- Spielerprofile: Anmeldung per Name, Wiedererkennung via localStorage
- Globale Highscore-Tabelle (Top 10) über alle Spieler
- Persistenz in `data/db.json` (wird automatisch angelegt)

## API

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/login` | Profil anlegen/anmelden (`{"name": "..."}`) |
| POST | `/api/score` | Score melden (`{"playerId": "...", "score": 0}`) |
| GET | `/api/leaderboard` | Top 10 |
| GET | `/api/health` | Healthcheck |
