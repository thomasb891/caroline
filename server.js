const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3050;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA = path.join(__dirname, 'data');

function readJSON(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// --- Etablissements ---
app.get('/api/etablissements', (req, res) => res.json(readJSON('etablissements.json')));
app.post('/api/etablissements', (req, res) => {
  const list = readJSON('etablissements.json');
  const item = { id: uid(), ...req.body };
  list.push(item);
  writeJSON('etablissements.json', list);
  res.json(item);
});
app.put('/api/etablissements/:id', (req, res) => {
  const list = readJSON('etablissements.json');
  const i = list.findIndex(e => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  list[i] = { ...list[i], ...req.body };
  writeJSON('etablissements.json', list);
  res.json(list[i]);
});
app.delete('/api/etablissements/:id', (req, res) => {
  let list = readJSON('etablissements.json');
  list = list.filter(e => e.id !== req.params.id);
  writeJSON('etablissements.json', list);
  res.json({ ok: true });
});

// --- Missions ---
app.get('/api/missions', (req, res) => {
  let list = readJSON('missions.json');
  if (req.query.mois) list = list.filter(m => m.date && m.date.startsWith(req.query.mois));
  res.json(list);
});
app.post('/api/missions', (req, res) => {
  const list = readJSON('missions.json');
  const item = { id: uid(), ...req.body };
  list.push(item);
  writeJSON('missions.json', list);
  res.json(item);
});
app.put('/api/missions/:id', (req, res) => {
  const list = readJSON('missions.json');
  const i = list.findIndex(e => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  list[i] = { ...list[i], ...req.body };
  writeJSON('missions.json', list);
  res.json(list[i]);
});
app.delete('/api/missions/:id', (req, res) => {
  let list = readJSON('missions.json');
  list = list.filter(e => e.id !== req.params.id);
  writeJSON('missions.json', list);
  res.json({ ok: true });
});

// --- Paiements ---
app.get('/api/paiements', (req, res) => {
  let list = readJSON('paiements.json');
  if (req.query.mois) list = list.filter(p => p.dateVersement && p.dateVersement.startsWith(req.query.mois));
  if (req.query.annee) list = list.filter(p => p.dateVersement && p.dateVersement.startsWith(req.query.annee));
  res.json(list);
});
app.post('/api/paiements', (req, res) => {
  const list = readJSON('paiements.json');
  const item = { id: uid(), ...req.body };
  list.push(item);
  writeJSON('paiements.json', list);
  res.json(item);
});
app.put('/api/paiements/:id', (req, res) => {
  const list = readJSON('paiements.json');
  const i = list.findIndex(e => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  list[i] = { ...list[i], ...req.body };
  writeJSON('paiements.json', list);
  res.json(list[i]);
});
app.delete('/api/paiements/:id', (req, res) => {
  let list = readJSON('paiements.json');
  list = list.filter(e => e.id !== req.params.id);
  writeJSON('paiements.json', list);
  res.json({ ok: true });
});

// --- Vacances ---
app.get('/api/vacances', (req, res) => {
  let list = readJSON('vacances.json');
  if (req.query.mois) {
    list = list.filter(v => {
      return v.dateDebut <= req.query.mois + '-31' && v.dateFin >= req.query.mois + '-01';
    });
  }
  res.json(list);
});
app.post('/api/vacances', (req, res) => {
  const list = readJSON('vacances.json');
  const item = { id: uid(), ...req.body };
  list.push(item);
  writeJSON('vacances.json', list);
  res.json(item);
});
app.delete('/api/vacances/:id', (req, res) => {
  let list = readJSON('vacances.json');
  list = list.filter(e => e.id !== req.params.id);
  writeJSON('vacances.json', list);
  res.json({ ok: true });
});

// --- Config ---
app.get('/api/config', (req, res) => {
  const p = path.join(DATA, 'config.json');
  if (!fs.existsSync(p)) return res.json({ puissanceFiscale: 4, baremeKm: 0.523 });
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});
app.put('/api/config', (req, res) => {
  writeJSON('config.json', req.body);
  res.json(req.body);
});

// --- Stats ---
app.get('/api/stats/annuel', (req, res) => {
  const annee = req.query.annee || new Date().getFullYear().toString();
  const missions = readJSON('missions.json').filter(m => m.date && m.date.startsWith(annee));
  const paiements = readJSON('paiements.json').filter(p => p.dateVersement && p.dateVersement.startsWith(annee));
  const configPath = path.join(DATA, 'config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : { puissanceFiscale: 4, baremeKm: 0.523 };

  const moisData = {};
  for (let m = 0; m < 12; m++) {
    const key = `${annee}-${String(m + 1).padStart(2, '0')}`;
    const moisMissions = missions.filter(mi => mi.date && mi.date.startsWith(key));
    const moisPaiements = paiements.filter(p => p.dateVersement && p.dateVersement.startsWith(key));
    moisData[key] = {
      heures: moisMissions.reduce((s, mi) => s + (mi.heuresTravaillees || 0), 0),
      km: moisMissions.reduce((s, mi) => s + (mi.km || 0), 0),
      revenus: moisPaiements.reduce((s, p) => s + (p.montant || 0), 0),
      nbMissions: moisMissions.length,
      nbPaiements: moisPaiements.length
    };
  }
  const totalKm = Object.values(moisData).reduce((s, d) => s + d.km, 0);
  const totalRevenus = Object.values(moisData).reduce((s, d) => s + d.revenus, 0);
  const fraisKm = +(totalKm * config.baremeKm).toFixed(2);

  res.json({ annee, moisData, totalKm, totalRevenus, fraisKm, config });
});

app.listen(PORT, () => console.log(`Hublo Gestion running on http://localhost:${PORT}`));
