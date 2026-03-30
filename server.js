const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const app = express();
const PORT = 3050;
const POTAGER_PORT = 8282;

app.use(express.json());

// Page d'accueil
const accueilPath = path.join(__dirname, '..', 'index.html');
if (fs.existsSync(accueilPath)) {
  app.get('/accueil', (req, res) => res.sendFile(accueilPath));
}

// Proxy potager -> port interne 8282
const potagerDir = path.join(__dirname, '..', 'potager');
if (fs.existsSync(potagerDir)) {
  const potager = spawn(process.execPath, ['server.js'], {
    cwd: potagerDir,
    stdio: 'pipe',
    env: { ...process.env, PORT: POTAGER_PORT.toString(), HOST: '127.0.0.1' }
  });
  potager.stdout.on('data', d => console.log('[Potager]', d.toString().trim()));
  potager.stderr.on('data', d => console.error('[Potager]', d.toString().trim()));
  process.on('exit', () => { try { potager.kill(); } catch {} });

  app.use('/potager', createProxyMiddleware({
    target: `http://127.0.0.1:${POTAGER_PORT}`,
    changeOrigin: true,
    pathRewrite: { '^/potager': '' },
    ws: true
  }));
}

app.use(express.static(path.join(__dirname, 'public')));
module.exports = app;

const DATA = path.join(__dirname, 'data');

// --- Activity Log Middleware ---
function logActivity(action, details) {
  const logsPath = path.join(DATA, 'logs.json');
  let logs = [];
  if (fs.existsSync(logsPath)) {
    try { logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch(e) { logs = []; }
  }
  logs.unshift({ timestamp: new Date().toISOString(), action, details });
  if (logs.length > 500) logs = logs.slice(0, 500);
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
}

// Log POST/PUT/DELETE requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/') && !req.path.includes('/logs')) {
    const origSend = res.json.bind(res);
    res.json = (data) => {
      const section = req.path.split('/')[2] || 'unknown';
      logActivity(`${req.method} ${req.path}`, { section, body: req.body, params: req.params });
      return origSend(data);
    };
  }
  next();
});

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

// --- Documents (suivi par mois) ---
app.get('/api/documents', (req, res) => {
  let list = readJSON('documents.json');
  if (req.query.mois) list = list.filter(d => d.mois === req.query.mois);
  res.json(list);
});
app.post('/api/documents', (req, res) => {
  const list = readJSON('documents.json');
  // Upsert: update if same mois+etablissement exists
  const i = list.findIndex(d => d.mois === req.body.mois && d.etablissement === req.body.etablissement);
  if (i >= 0) {
    list[i] = { ...list[i], ...req.body };
    writeJSON('documents.json', list);
    res.json(list[i]);
  } else {
    const item = { id: uid(), ...req.body };
    list.push(item);
    writeJSON('documents.json', list);
    res.json(item);
  }
});

// --- Prix gasoil par mois ---
app.get('/api/prix-gasoil', (req, res) => {
  res.json(readJSON('prix-gasoil.json'));
});
app.post('/api/prix-gasoil', (req, res) => {
  let list = readJSON('prix-gasoil.json');
  if (!Array.isArray(list)) list = [];
  const i = list.findIndex(p => p.mois === req.body.mois);
  if (i >= 0) list[i].prix = req.body.prix;
  else list.push({ mois: req.body.mois, prix: req.body.prix });
  list.sort((a, b) => b.mois.localeCompare(a.mois));
  writeJSON('prix-gasoil.json', list);
  res.json(list);
});

// --- Config ---
app.get('/api/config', (req, res) => {
  const p = path.join(DATA, 'config.json');
  if (!fs.existsSync(p)) return res.json({ puissanceFiscale: 4, baremeKm: 0.523 });
  res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
});
app.put('/api/config', (req, res) => {
  // Auto-save current month gasoil price
  if (req.body.prixGasoil) {
    const now = new Date();
    const moisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let prixList = readJSON('prix-gasoil.json');
    if (!Array.isArray(prixList)) prixList = [];
    const i = prixList.findIndex(p => p.mois === moisKey);
    if (i >= 0) prixList[i].prix = req.body.prixGasoil;
    else prixList.push({ mois: moisKey, prix: req.body.prixGasoil });
    writeJSON('prix-gasoil.json', prixList);
  }
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
    const pSalaires = moisPaiements.filter(p => !p.etablissement || !p.etablissement.toLowerCase().includes('emploi'));
    const pPoleEmploi = moisPaiements.filter(p => p.etablissement && p.etablissement.toLowerCase().includes('emploi'));
    moisData[key] = {
      heures: moisMissions.reduce((s, mi) => s + (mi.heuresTravaillees || 0), 0),
      km: moisMissions.reduce((s, mi) => s + (mi.km || 0), 0),
      revenus: moisPaiements.reduce((s, p) => s + (p.montant || 0), 0),
      salaires: pSalaires.reduce((s, p) => s + (p.montant || 0), 0),
      poleEmploi: pPoleEmploi.reduce((s, p) => s + (p.montant || 0), 0),
      nbMissions: moisMissions.length,
      nbPaiements: moisPaiements.length
    };
  }
  const totalKm = Object.values(moisData).reduce((s, d) => s + d.km, 0);
  const totalRevenus = Object.values(moisData).reduce((s, d) => s + d.revenus, 0);
  const totalSalaires = Object.values(moisData).reduce((s, d) => s + d.salaires, 0);
  const totalPoleEmploi = Object.values(moisData).reduce((s, d) => s + d.poleEmploi, 0);
  const fraisKm = +(totalKm * config.baremeKm).toFixed(2);

  res.json({ annee, moisData, totalKm, totalRevenus, totalSalaires, totalPoleEmploi, fraisKm, config });
});

// --- Document Upload (multer) ---
const DOCS_ROOT = '\\\\MYCLOUD-1KSKLK\\Serveur\\Caro Hublo\\Documents';

const os = require('os');
const upload = multer({
  dest: os.tmpdir(),
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  const { etablissement, annee, mois, typeDoc, support } = req.body;
  if (!etablissement || !annee || !mois || !typeDoc) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // Type doc labels for filename
  const typeLabels = {
    fichePaye: 'Fiche_de_paie',
    contrat: 'Contrat',
    finContrat: 'Fin_de_contrat',
    attestation: 'Attestation_employeur',
    solde: 'Solde_tout_compte',
    polEmploi: 'Document_Pole_Emploi',
    autre: 'Autre'
  };
  const moisNoms = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
  const moisLabel = moisNoms[parseInt(mois) - 1] || mois;
  const cleanEtab = etablissement.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  const types = typeDoc.split(',').filter(Boolean);

  // NAS path
  const nasBase = path.join('\\\\MYCLOUD-1KSKLK', 'Serveur', 'Caro Hublo', 'Documents', cleanEtab, annee, moisLabel);

  // Check if NAS is accessible before creating dirs
  let nasOk = false;
  try {
    const nasRoot = '\\\\MYCLOUD-1KSKLK\\Serveur\\Caro Hublo\\Documents';
    fs.accessSync(nasRoot, fs.constants.W_OK);
    nasOk = true;
  } catch (e) {
    nasOk = false;
  }

  let savedPath = null;
  if (req.file && support !== 'papier') {
    if (nasOk) {
      try { fs.mkdirSync(nasBase, { recursive: true }); } catch (e) {}

      // Build filename from all types
      const allTypeLabels = types.map(t => typeLabels[t] || t).join('_');

      // Find next number
      let num = 1;
      try {
        const existing = fs.readdirSync(nasBase);
        num = existing.length + 1;
      } catch (e) {}

      const ext = path.extname(req.file.originalname).toLowerCase();
      const newName = `${allTypeLabels}_${moisLabel}_${annee}_${String(num).padStart(2, '0')}${ext}`;
      const destPath = path.join(nasBase, newName);

      try {
        fs.copyFileSync(req.file.path, destPath);
        fs.unlinkSync(req.file.path);
        savedPath = destPath;
      } catch (e) {
        savedPath = req.file.path;
      }
    } else {
      // NAS not accessible, keep in uploads
      savedPath = req.file.path;
    }
  }

  // Update document tracking
  const moisKey = `${annee}-${mois}`;
  let docs = readJSON('documents.json');
  let doc = docs.find(d => d.mois === moisKey && d.etablissement === etablissement);
  if (!doc) {
    doc = { id: uid(), mois: moisKey, etablissement };
    docs.push(doc);
  }
  // Set all types as received
  types.forEach(t => {
    if (t === 'fichePaye') doc.fichePaye = true;
    if (t === 'contrat') doc.contrat = true;
    if (t === 'finContrat') doc.finContrat = true;
    if (t === 'attestation') doc.attestation = true;
    if (t === 'solde') doc.solde = true;
  });

  if (!doc.details) doc.details = [];
  doc.details.push({
    types,
    support: support || 'numerique',
    date: new Date().toISOString(),
    fichier: savedPath ? path.basename(savedPath) : null,
    chemin: savedPath,
    nasOk
  });

  writeJSON('documents.json', docs);
  res.json({ ok: true, path: savedPath, filename: savedPath ? path.basename(savedPath) : null, nasOk });
});

// --- Comparaison Impots ---
app.get('/api/comparaison', (req, res) => {
  const all = readJSON('comparaison.json');
  const annee = req.query.annee;
  if (annee) {
    const entry = all.find(e => e.annee === annee);
    return res.json(entry || { annee, lignes: [] });
  }
  res.json(all);
});

app.post('/api/comparaison', (req, res) => {
  let all = readJSON('comparaison.json');
  if (!Array.isArray(all)) all = [];
  const i = all.findIndex(e => e.annee === req.body.annee);
  if (i >= 0) {
    all[i] = req.body;
  } else {
    all.push(req.body);
  }
  writeJSON('comparaison.json', all);
  res.json(req.body);
});

// --- Notifications (fiches de paie manquantes) ---
app.get('/api/notifications', (req, res) => {
  const missions = readJSON('missions.json');
  const documents = readJSON('documents.json');
  const absenceNames = ['timeo', 'timéo', 'hotel', 'hôtel', 'rdv', 'stage', 'ecole', 'école'];
  const isAbsence = (name) => absenceNames.some(a => (name || '').toLowerCase().includes(a));

  // Only check from 2026
  const minDate = '2026-01-01';

  // Group missions by mois+etablissement (only work missions)
  const moisEtabs = {};
  missions.forEach(m => {
    if (!m.date || isAbsence(m.etablissement) || m.date < minDate) return;
    const moisKey = m.date.slice(0, 7); // "2026-03"
    const key = `${moisKey}|${m.etablissement}`;
    if (!moisEtabs[key]) moisEtabs[key] = { mois: moisKey, etablissement: m.etablissement, lastDate: m.date };
    if (m.date > moisEtabs[key].lastDate) moisEtabs[key].lastDate = m.date;
  });

  const now = new Date();
  const alerts = [];
  Object.values(moisEtabs).forEach(({ mois, etablissement, lastDate }) => {
    // Check if more than 30 days since last mission of that month
    const lastMissionDate = new Date(lastDate + 'T00:00:00');
    const daysSince = Math.floor((now - lastMissionDate) / (1000 * 60 * 60 * 24));
    if (daysSince <= 30) return;

    // Check if fichePaye exists in documents
    const doc = documents.find(d => d.mois === mois && d.etablissement === etablissement);
    if (doc && doc.fichePaye) return;

    const moisNoms = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
    const [y, m] = mois.split('-');
    const moisLabel = moisNoms[parseInt(m) - 1] + ' ' + y;

    alerts.push({ type: 'fichePaye_manquante', etablissement, mois, moisLabel, daysSince });
  });

  // Sort by most recent first
  alerts.sort((a, b) => b.mois.localeCompare(a.mois) || a.etablissement.localeCompare(b.etablissement));
  res.json(alerts);
});

// --- Export ICS (calendar sync) ---
app.get('/api/export/ics', (req, res) => {
  const mois = req.query.mois;
  if (!mois) return res.status(400).json({ error: 'Parametre mois requis (ex: 2026-03)' });

  const missions = readJSON('missions.json').filter(m => m.date && m.date.startsWith(mois));
  const etablissements = readJSON('etablissements.json');
  const etabMap = {};
  etablissements.forEach(e => { etabMap[e.nom] = e; });

  const pad2 = (n) => String(n).padStart(2, '0');
  const formatICSDate = (dateStr, timeStr) => {
    // dateStr: "2026-03-15", timeStr: "08:00"
    const [y, m, d] = dateStr.split('-');
    const [h, min] = (timeStr || '08:00').split(':');
    return `${y}${m}${d}T${pad2(h)}${pad2(min)}00`;
  };

  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

  let events = '';
  missions.forEach(m => {
    const etab = etabMap[m.etablissement] || {};
    const summary = m.etablissement || 'Mission';
    const location = (etab.adresse || '').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const dtstart = formatICSDate(m.date, m.heureDebut);
    const dtend = formatICSDate(m.date, m.heureFin);
    const uid = m.id + '@caroline-hublo';

    events += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${stamp}\r\nDTSTART:${dtstart}\r\nDTEND:${dtend}\r\nSUMMARY:${summary}\r\n`;
    if (location) events += `LOCATION:${location}\r\n`;
    events += `END:VEVENT\r\n`;
  });

  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Caroline Hublo//Planning//FR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Planning Caroline\r\n${events}END:VCALENDAR\r\n`;

  const moisNoms = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
  const [y, mo] = mois.split('-');
  const filename = `Planning_${moisNoms[parseInt(mo) - 1]}_${y}.ics`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(ics);
});

// --- Logs ---
app.get('/api/logs', (req, res) => {
  const logsPath = path.join(DATA, 'logs.json');
  let logs = [];
  if (fs.existsSync(logsPath)) {
    try { logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch(e) { logs = []; }
  }
  const limit = parseInt(req.query.limit) || 100;
  res.json(logs.slice(0, limit));
});

app.post('/api/logs/purge', (req, res) => {
  if (req.body.password !== 'Timeo@') return res.json({ ok: false, error: 'Mot de passe incorrect' });
  writeJSON('logs.json', []);
  res.json({ ok: true });
});

// Standalone mode
if (require.main === module) {
  app.listen(PORT, () => console.log(`Hublo Gestion running on http://localhost:${PORT}`));
}
