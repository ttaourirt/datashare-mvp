// PERF.md — test de charge rapide des endpoints critiques de DataShare.
// Lancement : k6 run perf/k6-critical-endpoints.js   (API sur http://localhost:8080)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const API = __ENV.API_URL || 'http://localhost:8080/api/v1';
const FILE_1MB = 'x'.repeat(1024 * 1024);

export const options = {
  scenarios: {
    // US05 — l'historique est la page la plus consultée par les utilisateurs connectés
    history: {
      executor: 'ramping-vus',
      exec: 'history',
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 20 },
        { duration: '10s', target: 0 },
      ],
    },
    // US02 — tout le trafic des destinataires passe par le téléchargement public
    download: {
      executor: 'constant-vus',
      exec: 'download',
      vus: 10,
      duration: '70s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration{scenario:history}': ['p(95)<300'],
    'http_req_duration{scenario:download}': ['p(95)<500'],
  },
};

export function setup() {
  const email = `k6-${Date.now()}@datashare.test`;
  const json = { headers: { 'Content-Type': 'application/json' } };
  http.post(`${API}/auth/register`, JSON.stringify({ email, password: 'password1234' }), json);
  const token = http.post(`${API}/auth/login`, JSON.stringify({ email, password: 'password1234' }), json).json('token');
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // Historique réaliste : 25 fichiers, dont un de 1 Mo pour le téléchargement
  let publicToken = '';
  for (let i = 0; i < 25; i++) {
    const body = i === 0
      ? { file: http.file(FILE_1MB, 'rapport.pdf', 'application/pdf'), tags: 'perf' }
      : { file: http.file(`fichier ${i}`, `note-${i}.txt`, 'text/plain'), tags: 'perf' };
    const res = http.post(`${API}/files`, body, auth);
    if (i === 0) publicToken = res.json('publicToken');
  }
  return { token, publicToken };
}

export function history(data) {
  const res = http.get(`${API}/files?includeExpired=true`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: 'GET /files' },
  });
  check(res, { 'history 200': r => r.status === 200, 'history 25 fichiers': r => r.json().length === 25 });
  sleep(1);
}

export function download(data) {
  const res = http.post(`${API}/public/files/${data.publicToken}/download`, '{}', {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /public/files/{token}/download' },
  });
  check(res, { 'download 200': r => r.status === 200, 'download 1 Mo': r => r.body.length === 1024 * 1024 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
    'perf/results/k6-summary.json': JSON.stringify(data, null, 2),
    'perf/results/k6-summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
  };
}
