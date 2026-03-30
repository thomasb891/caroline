const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const BASE = '//MYCLOUD-1KSKLK/Serveur/Caro Hublo';

const HEURES_FILES = [
  `${BASE}/Heures2024.xlsx`,
  `${BASE}/Heures2025.xlsx`,
  `${BASE}/Heures2026.xlsx`
];
const PAIE_FILES = [
  `${BASE}/Paie Caro 2024.xlsx`,
  `${BASE}/Paie Caro 2025.xlsx`,
  `${BASE}/Paie Caro 2026.xlsx`
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date((serial - 25569) * 86400000);
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return null;
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function excelTime(val) {
  if (val === null || val === undefined) return '';
  // Handle string times like "06:30:00"
  if (typeof val === 'string') {
    const match = val.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return '';
  }
  if (typeof val !== 'number') return '';
  const totalMin = Math.round(val * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// --- Import etablissements from most recent file ---
console.log('Reading etablissements...');
const etabSet = new Map();
for (const file of HEURES_FILES) {
  try {
    const wb = XLSX.readFile(file);
    const sheet = wb.Sheets['NE PAS TOUCHER'];
    if (!sheet) continue;
    const npt = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (const row of npt) {
      const nom = row[4];
      const km = row[7];
      if (nom && typeof nom === 'string' && nom.trim()) {
        const key = nom.trim();
        if (/^\d{2}:\d{2}/.test(key)) continue; // skip time values
        if (!etabSet.has(key)) {
          etabSet.set(key, { id: uid(), nom: key, km: typeof km === 'number' ? km : 0 });
        }
      }
    }
  } catch (e) { console.log(`  Warning: ${file}:`, e.message); }
}
const etablissements = Array.from(etabSet.values());
console.log(`  Found ${etablissements.length} etablissements`);

// --- Import missions from all planning files ---
console.log('Reading missions...');
const missions = [];
const missionKeys = new Set(); // avoid duplicates

function importMissions(file) {
  try {
    const wb = XLSX.readFile(file);
    const planningSheets = wb.SheetNames.filter(s => s.startsWith('Planning') && !s.includes('VIERGE'));

    // Also read salaire net from each sheet
    for (const sheetName of planningSheets) {
      const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

      // Find salaire net
      let salaireNet = 0;
      for (let r = 0; r < Math.min(data.length, 8); r++) {
        const row = data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === 'Salaire ( Net )' || row[c] === 'Salaire ( Net)') {
            // salaire is in the row below
            if (data[r + 1] && typeof data[r + 1][c] === 'number') {
              salaireNet = data[r + 1][c];
            }
          }
        }
      }

      // Find header row
      let headerRow = -1;
      let etabCol = 0, jourCol = 2, debutCol = 4, pauseDCol = 6, pauseFCol = 8, finCol = 10, heuresCol = 12, kmCol = -1;

      for (let r = 0; r < Math.min(data.length, 12); r++) {
        const row = data[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === 'Etablissement') {
            headerRow = r;
            etabCol = c;
            for (let cc = c; cc < row.length; cc++) {
              if (row[cc] === 'Jour') jourCol = cc;
              if (row[cc] === 'Heure début') debutCol = cc;
              if (typeof row[cc] === 'string' && row[cc].includes('Pause') && row[cc].includes('début')) pauseDCol = cc;
              if (typeof row[cc] === 'string' && row[cc].includes('Pause') && row[cc].includes('fin')) pauseFCol = cc;
              if (row[cc] === 'Heure Fin') finCol = cc;
              if (row[cc] === 'Heures travaillées') heuresCol = cc;
              if (row[cc] === 'KM') kmCol = cc;
            }
            break;
          }
        }
        if (headerRow >= 0) break;
      }
      if (headerRow < 0) continue;

      for (let r = headerRow + 1; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        const etabName = row[etabCol];
        const jourSerial = row[jourCol];
        if (!etabName || !jourSerial) continue;
        if (typeof etabName !== 'string' || !etabName.trim()) continue;

        const date = excelDate(jourSerial);
        if (!date) continue;

        const key = `${date}_${etabName.trim()}`;
        if (missionKeys.has(key)) continue;
        missionKeys.add(key);

        const debut = excelTime(row[debutCol]);
        const fin = excelTime(row[finCol]);
        const pauseD = excelTime(row[pauseDCol]);
        const pauseF = excelTime(row[pauseFCol]);
        const heures = typeof row[heuresCol] === 'number' ? +(row[heuresCol] * 24).toFixed(4) : 0;
        const km = kmCol >= 0 && typeof row[kmCol] === 'number' ? row[kmCol] : 0;

        missions.push({
          id: uid(), date,
          etablissement: etabName.trim(),
          heureDebut: debut, heureFin: fin,
          pauseDebut: pauseD, pauseFin: pauseF,
          heuresTravaillees: heures, km,
          salaireNet
        });
      }
    }
  } catch (e) { console.log(`  Warning: ${file}:`, e.message); }
}

for (const file of HEURES_FILES) importMissions(file);
console.log(`  Found ${missions.length} missions`);

// --- Import paiements from all paie files ---
console.log('Reading paiements...');
const paiements = [];
const paiementKeys = new Set();

function importPaiements(file) {
  try {
    const wb = XLSX.readFile(file);
    for (const sheetName of wb.SheetNames) {
      if (sheetName === 'Sommaire' || sheetName === 'Annuel') continue;
      const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
      if (!data.length) continue;

      let headerRow = -1;
      for (let r = 0; r < Math.min(data.length, 10); r++) {
        const row = data[r];
        if (!row) continue;
        if (row.some(c => c === 'Date versement ' || c === 'Date versement' || c === 'Montant')) {
          headerRow = r;
          break;
        }
      }
      if (headerRow < 0) continue;

      const headerRowData = data[headerRow];
      const monthGroups = [];
      for (let c = 0; c < headerRowData.length; c++) {
        if (headerRowData[c] === 'Date versement ' || headerRowData[c] === 'Date versement') {
          monthGroups.push({
            ficheCol: c >= 2 && headerRowData[c - 2] === 'Fiche Paye' ? c - 2 : -1,
            finContratCol: c >= 1 && headerRowData[c - 1] === 'Fin de contrat' ? c - 1 : -1,
            dateCol: c,
            montantCol: c + 1
          });
        }
      }

      const etabNom = sheetName.trim();

      for (let r = headerRow + 1; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;
        for (const group of monthGroups) {
          const dateSerial = row[group.dateCol];
          const montant = row[group.montantCol];
          if (!dateSerial || !montant || montant === 0) continue;
          if (typeof montant !== 'number') continue;
          const dateStr = excelDate(dateSerial);
          if (!dateStr) continue;

          const key = `${dateStr}_${etabNom}_${montant}`;
          if (paiementKeys.has(key)) continue;
          paiementKeys.add(key);

          paiements.push({
            id: uid(),
            etablissement: etabNom,
            dateVersement: dateStr,
            montant,
            fichePaye: group.ficheCol >= 0 ? !!row[group.ficheCol] : false,
            finContrat: group.finContratCol >= 0 ? !!row[group.finContratCol] : false
          });
        }
      }
    }
  } catch (e) { console.log(`  Warning: ${file}:`, e.message); }
}

for (const file of PAIE_FILES) importPaiements(file);
console.log(`  Found ${paiements.length} paiements`);

// --- Write data ---
fs.writeFileSync(path.join(DATA, 'etablissements.json'), JSON.stringify(etablissements, null, 2));
fs.writeFileSync(path.join(DATA, 'missions.json'), JSON.stringify(missions, null, 2));
fs.writeFileSync(path.join(DATA, 'paiements.json'), JSON.stringify(paiements, null, 2));

console.log('\nImport termine !');
console.log(`  ${etablissements.length} etablissements`);
console.log(`  ${missions.length} missions`);
console.log(`  ${paiements.length} paiements`);
