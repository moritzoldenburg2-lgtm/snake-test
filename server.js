import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

const state = { players: {} };

function load() {
  try {
    state.players = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    state.players = {};
  }
}

function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state.players, null, 2));
}

function leaderboard() {
  return Object.values(state.players)
    .sort((a, b) => b.bestScore - a.bestScore || a.gamesPlayed - b.gamesPlayed)
    .slice(0, 10);
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    bestScore: p.bestScore,
    gamesPlayed: p.gamesPlayed,
    createdAt: p.createdAt,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e5) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/login' && req.method === 'POST') {
    const { name } = await readBody(req);
    const clean = String(name || '').trim().slice(0, 20);
    if (!clean) return send(res, 400, { error: 'Name required' });
    const existing = Object.values(state.players).find(
      (p) => p.name.toLowerCase() === clean.toLowerCase()
    );
    if (existing) return send(res, 200, publicPlayer(existing));
    const player = {
      id: crypto.randomUUID(),
      name: clean,
      bestScore: 0,
      gamesPlayed: 0,
      createdAt: Date.now(),
    };
    state.players[player.id] = player;
    save();
    return send(res, 201, publicPlayer(player));
  }

  if (url.pathname === '/api/score' && req.method === 'POST') {
    const { playerId, score } = await readBody(req);
    const player = state.players[playerId];
    const points = Number(score);
    if (!player) return send(res, 404, { error: 'Unknown player' });
    if (!Number.isFinite(points) || points < 0 || points > 1e6) {
      return send(res, 400, { error: 'Invalid score' });
    }
    player.gamesPlayed += 1;
    const isNewBest = points > player.bestScore;
    if (isNewBest) player.bestScore = points;
    save();
    const rank = Object.values(state.players).filter((p) => p.bestScore > player.bestScore).length + 1;
    return send(res, 200, { ...publicPlayer(player), isNewBest, rank });
  }

  if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
    return send(res, 200, leaderboard());
  }

  if (url.pathname === '/api/health') {
    return send(res, 200, { ok: true });
  }

  let pathname = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (pathname === '/' || pathname === '') pathname = 'index.html';
  const filePath = path.join(__dirname, 'public', pathname);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

load();
server.listen(PORT, () => {
  console.log(`Snake app running at http://localhost:${PORT}`);
});
