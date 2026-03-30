const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const HEURES = '//MYCLOUD-1KSKLK/Serveur/Caro Hublo/Heures2026.xlsx';
const PAIE = '//MYCLOUD-1KSKLK/Serveur/Caro Hublo/Paie Caro 2026.xlsx';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date((serial - 25569) * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function excelTime(frac) {
  if (frac === null || frac === undefined || typeof frac !== 'number') return '';
  const totalMin = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// --- Import etablissements ---
console.log('Reading etablissements...');
const wb1 = XLSX.readFile(HEURES);
const npt = XLSX.utils.sheet_to_json(wb1.Sheets['NE PAS TOUCHER'], { header: 1 });
const etablissements = [];
for (const row of npt) {
  const nom = row[4];
  const km = row[7];
  if (nom && typeof nom === 'string' && nom.trim() && km && typeof km === 'number') {
    etablissements.push({ id: uid(), nom: nom.trim(), km });
  }
}
// Also add entries without km (RDV, Hotel, Timeo)
for (const row of npt) {
  const nom = row[4];
  if (nom && typeof nom === 'string' && nom.trim() && !row[7]) {
    etablissements.push({ id: uid(), nom: nom.trim(), km: 0 });
  }
}
console.log(`  Found ${etablissements.length} etablissements`);

// --- Import missions from planning sheets ---
console.log('Reading missions...');
const missions = [];
const planningSheets = wb1.SheetNames.filter(s => s.startsWith('Planning') && !s.includes('VIERGE'));

for (const sheetName of planningSheets) {
  const data = XLSX.utils.sheet_to_json(wb1.Sheets[sheetName], { header: 1 });

  // Find the header row (contains "Etablissement")
  let headerRow = -1;
  let etabCol = 0, jourCol = 2, debutCol = 4, pauseDCol = 6, pauseFCol = 8, finCol = 10, heuresCol = 12, kmCol = -1;

  for (let r = 0; r < Math.min(data.length, 12); r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'Etablissement') {
        headerRow = r;
        etabCol = c;
        // Find other columns relative to Etablissement
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

    const debut = excelTime(row[debutCol]);
    const pauseD = excelTime(row[pauseDCol]);
    const pauseF = excelTime(row[pauseFCol]);
    const fin = excelTime(row[finCol]);
    const heures = typeof row[heuresCol] === 'number' ? +(row[heuresCol] * 24).toFixed(4) : 0;
    const km = kmCol >= 0 && typeof row[kmCol] === 'number' ? row[kmCol] : 0;

    missions.push({
      id: uid(),
      date,
      etablissement: etabName.trim(),
      heureDebut: debut,
      heureFin: fin,
      pauseDebut: pauseD,
      pauseFin: pauseF,
      heuresTravaillees: heures,
      km
    });
  }
}
console.log(`  Found ${missions.length} missions`);

// --- Import paiements ---
console.log('Reading paiements...');
const wb2 = XLSX.readFile(PAIE);
const paiements = [];
const annuelData = XLSX.utils.sheet_to_json(wb2.Sheets['Annuel'], { header: 1 });

// Parse from individual establishment sheets
for (const sheetName of wb2.SheetNames) {
  if (sheetName === 'Sommaire' || sheetName === 'Annuel') continue;

  const data = XLSX.utils.sheet_to_json(wb2.Sheets[sheetName], { header: 1 });
  if (!data.length) continue;

  // Find header row
  let headerRow = -1;
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    const row = data[r];
    if (!row) continue;
    if (row.some(c => c === 'Date versement ' || c === 'Montant')) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) continue;

  const headerRowData = data[headerRow];
  // Months are in groups: each group has Fiche Paye, Fin de contrat, Date versement, Montant (or just Date versement, Montant)
  const monthGroups = [];
  for (let c = 0; c < headerRowData.length; c++) {
    if (headerRowData[c] === 'Date versement ' || headerRowData[c] === 'Date versement') {
      monthGroups.push({
        ficheCol: headerRowData[c - 2] === 'Fiche Paye' ? c - 2 : -1,
        finContratCol: headerRowData[c - 1] === 'Fin de contrat' ? c - 1 : -1,
        dateCol: c,
        montantCol: c + 1
      });
    }
  }

  // Find month names row (Janvier, Février, etc.)
  let monthNamesRow = -1;
  for (let r = 0; r < headerRow; r++) {
    if (data[r] && data[r].some(c => c === 'Janvier' || c === 'Février' || c === 'Mars')) {
      monthNamesRow = r;
      break;
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

      const fiche = group.ficheCol >= 0 ? !!row[group.ficheCol] : false;
      const finContrat = group.finContratCol >= 0 ? !!row[group.finContratCol] : false;

      paiements.push({
        id: uid(),
        etablissement: etabNom,
        dateVersement: dateStr,
        montant,
        fichePaye: fiche,
        finContrat
      });
    }
  }
}
console.log(`  Found ${paiements.length} paiements`);

// --- Write data ---
fs.writeFileSync(path.join(DATA, 'etablissements.json'), JSON.stringify(etablissements, null, 2));
fs.writeFileSync(path.join(DATA, 'missions.json'), JSON.stringify(missions, null, 2));
fs.writeFileSync(path.join(DATA, 'paiements.json'), JSON.stringify(paiements, null, 2));

console.log('\nImport terminé !');
console.log(`  ${etablissements.length} etablissements`);
console.log(`  ${missions.length} missions`);
console.log(`  ${paiements.length} paiements`);
